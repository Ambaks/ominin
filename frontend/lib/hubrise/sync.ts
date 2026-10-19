import { after } from "next/server";
import { raiseAlert } from "@/lib/admin/alerts";
import { createAdminClient } from "@/lib/supabase/admin";
import { pullCatalog } from "./catalog";
import { HUBRISE } from "./config";
import { callHubrise, type Connection } from "./connection";
import { pullHours } from "./hours";
import { pullInventory } from "./inventory";
import { drainOutbox, purgeOutbox } from "./outbox";

type Admin = ReturnType<typeof createAdminClient>;

/** Inscrit l'URL de nos callbacks chez HubRise (une seule par connexion, remplacée à chaque POST). */
export async function registerCallback(
  admin: Admin,
  connection: Connection,
  url: string
): Promise<void> {
  await callHubrise(admin, connection, "/callback", {
    method: "POST",
    body: JSON.stringify({ url, events: HUBRISE.callbackEvents }),
  });
  await admin
    .from("hubrise_connections")
    .update({ callback_registered_at: new Date().toISOString() })
    .eq("etablissement_id", connection.etablissement_id);
}

/**
 * Relecture complète. Le catalogue d'abord : les correspondances d'office
 * qu'il crée sont ce que les stocks lisent ensuite. Chaque pas est isolé —
 * un horaire illisible ne doit pas priver le gérant de son catalogue.
 */
export async function syncAll(admin: Admin, connection: Connection): Promise<string[]> {
  const failures: string[] = [];
  for (const [name, pull] of [
    ["horaires", pullHours],
    ["catalogue", pullCatalog],
    ["stocks", pullInventory],
  ] as const) {
    try {
      await pull(admin, connection);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[hubrise] synchronisation ${name} en échec`, {
        etablissementId: connection.etablissement_id,
        message,
      });
      failures.push(`${name} : ${message}`);
    }
  }
  return failures;
}

/** Après une commande devenue « vraie » : on vide la file sans faire attendre la réponse. */
export function kickHubrise(): void {
  try {
    after(async () => {
      try {
        await drainOutbox(createAdminClient());
      } catch (error) {
        console.error("[hubrise] vidage en échec", {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });
  } catch {
    // Hors d'une requête (script) : le cron rattrapera.
  }
}

/**
 * Filet périodique (workflow hubrise-drain) : renvoie ce qui n'est pas parti,
 * relit ce dont un callback perdu aurait privé les connexions, relit le
 * catalogue une fois qu'il s'est tu, alerte sur les commandes que la caisse
 * n'a pas prises et purge les envois anciens.
 */
export async function runCron(admin: Admin) {
  const sent = await drainOutbox(admin);

  const { data: connections } = await admin.from("hubrise_connections").select("*");
  const now = Date.now();
  const stale = now - HUBRISE.reconcileIntervalMin * 60_000;
  const quiet = now - HUBRISE.catalogDebounceS * 1000;
  const failures: string[] = [];

  for (const connection of connections ?? []) {
    if (connection.last_failed_at) continue;
    const old = (at: string | null) => !at || new Date(at).getTime() < stale;
    if (old(connection.catalog_synced_at) && old(connection.inventory_synced_at)) {
      failures.push(...(await syncAll(admin, connection)));
      continue;
    }
    if (connection.catalog_dirty_at && new Date(connection.catalog_dirty_at).getTime() < quiet) {
      try {
        await pullCatalog(admin, connection);
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  await alertStuckOrders(admin);
  await purgeOutbox(admin);
  return { sent, failures };
}

/** Une commande transmise mais jamais reçue par la caisse (toujours « new ») est un client qui attend. */
async function alertStuckOrders(admin: Admin) {
  const before = new Date(Date.now() - HUBRISE.stuckNewMinutes * 60_000).toISOString();
  const { data: stuck } = await admin
    .from("hubrise_outbox")
    .select("order_id, etablissement_id, etablissements(name), orders!inner(hubrise_status, order_number)")
    .eq("kind", "order")
    .eq("status", "sent")
    .lt("sent_at", before)
    .eq("orders.hubrise_status", "new");
  for (const row of stuck ?? []) {
    const etab = row.etablissements as unknown as { name: string } | null;
    const order = row.orders as unknown as { order_number: number | null } | null;
    await raiseAlert("backend", `hubrise-new:${row.order_id}`, {
      title: `${etab?.name ?? "Un client"} : commande non reprise par la caisse`,
      body: `La commande ${order?.order_number ?? ""} est restée « new » plus de ${HUBRISE.stuckNewMinutes} min chez HubRise.`,
      url: "/clients",
      urgent: true,
    }).catch(() => false);
  }
}
