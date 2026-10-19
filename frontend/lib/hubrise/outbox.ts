import { raiseAlert } from "@/lib/admin/alerts";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { HubriseError } from "./client";
import { HUBRISE } from "./config";
import { callHubrise, getConnection, type Connection } from "./connection";
import { buildOrder } from "./orders";

type Admin = ReturnType<typeof createAdminClient>;
type Row = Tables<"hubrise_outbox">;

/*
 * Envoi vers HubRise, sur le modèle de print_jobs : un déclencheur remplit la
 * file, ce module la vide. Appelé à chaud dès qu'une commande devient
 * « vraie » (lib/push/server.ts) et, en filet, par le cron (/api/hubrise/drain).
 *
 * POST /orders n'a pas de clé d'idempotence. Une réponse perdue (délai
 * dépassé) peut cacher une commande bel et bien créée : avant tout renvoi, on
 * la cherche par private_ref — sinon la caisse sortirait deux tickets, le
 * même défaut que le doublon d'Omilink sur accusé perdu.
 */

function backoffMs(attempts: number): number {
  const { retryInitialDelayS, retryMultiplier, retryMaxDelayS } = HUBRISE.outbox;
  const seconds = Math.min(
    retryInitialDelayS * retryMultiplier ** (attempts - 1),
    retryMaxDelayS
  );
  return seconds * 1000;
}

/**
 * Prend les lignes dues, une à une : la prise avance déjà next_attempt_at du
 * délai de l'essai suivant, si bien qu'un traitement mort en route est rejoué
 * plus tard sans verrou ni bail. Deux passages simultanés ne prennent pas la
 * même ligne (la mise à jour exige l'échéance qu'on a lue).
 */
async function claimDue(admin: Admin): Promise<Row[]> {
  const { data: due } = await admin
    .from("hubrise_outbox")
    .select("*")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at");

  const claimed: Row[] = [];
  for (const row of due ?? []) {
    const attempts = row.attempts + 1;
    const { data: won } = await admin
      .from("hubrise_outbox")
      .update({
        attempts,
        next_attempt_at: new Date(Date.now() + backoffMs(attempts)).toISOString(),
      })
      .eq("id", row.id)
      .eq("status", "pending")
      .eq("next_attempt_at", row.next_attempt_at)
      .select("*")
      .maybeSingle();
    if (won) claimed.push(won);
  }
  return claimed;
}

async function settle(
  admin: Admin,
  row: Row,
  patch: Partial<Pick<Row, "status" | "last_error" | "hubrise_id">>
) {
  await admin
    .from("hubrise_outbox")
    .update({
      ...patch,
      ...(patch.status === "sent" ? { sent_at: new Date().toISOString() } : {}),
    })
    .eq("id", row.id);
}

async function abandon(admin: Admin, row: Row, message: string) {
  await settle(admin, row, { status: "dead", last_error: message });
  const { data: etab } = await admin
    .from("etablissements")
    .select("name")
    .eq("id", row.etablissement_id)
    .maybeSingle();
  await raiseAlert("backend", `hubrise:${row.id}`, {
    title: `${etab?.name ?? "Un client"} : commande non transmise à HubRise`,
    body: message.slice(0, 200),
    url: "/clients",
    urgent: true,
  }).catch(() => false);
}

async function pushOrder(admin: Admin, row: Row, token: Connection | null) {
  if (!token || !row.order_id) return;
  const built = await buildOrder(admin, token, row.order_id);
  if (!built) {
    await settle(admin, row, { status: "skipped", last_error: "Commande introuvable." });
    return;
  }
  if (!built.payload) {
    await settle(admin, row, { status: "skipped", last_error: "Annulée avant l'envoi." });
    return;
  }

  // Un essai précédent a pu aboutir sans que nous le sachions.
  if (row.attempts > 1) {
    const found = await callHubrise<{ id: string }[]>(
      admin,
      token,
      `/location/orders?private_ref=${encodeURIComponent(row.order_id)}`
    );
    if (found.length) {
      await recordSent(admin, row, found[0].id);
      return;
    }
  }

  const created = await callHubrise<{ id: string }>(admin, token, "/location/orders", {
    method: "POST",
    body: JSON.stringify(built.payload),
  });
  await recordSent(admin, row, created.id);
}

async function recordSent(admin: Admin, row: Row, hubriseId: string) {
  await admin
    .from("orders")
    .update({ hubrise_order_id: hubriseId, hubrise_status: "new" })
    .eq("id", row.order_id!);
  await settle(admin, row, { status: "sent", hubrise_id: hubriseId, last_error: null });
}

async function pushCancel(admin: Admin, row: Row, token: Connection | null) {
  if (!token || !row.order_id) return;
  const { data: order } = await admin
    .from("orders")
    .select("hubrise_order_id")
    .eq("id", row.order_id)
    .maybeSingle();
  if (!order?.hubrise_order_id) {
    await settle(admin, row, { status: "skipped", last_error: "Jamais transmise." });
    return;
  }
  await callHubrise(admin, token, `/location/orders/${order.hubrise_order_id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "cancelled" }),
  });
  await settle(admin, row, { status: "sent", last_error: null });
}

/** Épuisé côté Ominin → stock 0 chez HubRise ; remis en vente → entrée retirée (illimité). */
async function pushStock(admin: Admin, row: Row, token: Connection | null) {
  if (!token || !row.item_id) return;
  const [{ data: item }, { data: ref }] = await Promise.all([
    admin.from("items").select("disponible").eq("id", row.item_id).maybeSingle(),
    admin
      .from("hubrise_ref_map")
      .select("ref")
      .eq("item_id", row.item_id)
      .is("choice_id", null)
      .maybeSingle(),
  ]);
  if (!item || !ref) {
    await settle(admin, row, { status: "skipped", last_error: "Article non relié." });
    return;
  }
  await callHubrise(admin, token, "/location/inventory", {
    method: "PATCH",
    body: JSON.stringify([{ sku_ref: ref.ref, stock: item.disponible ? null : "0" }]),
  });
  await settle(admin, row, { status: "sent", last_error: null });
}

async function process(admin: Admin, row: Row) {
  const connection = await getConnection(admin, row.etablissement_id);
  if (!connection) {
    await settle(admin, row, { status: "skipped", last_error: "Connexion supprimée." });
    return;
  }
  try {
    if (row.kind === "order") await pushOrder(admin, row, connection);
    else if (row.kind === "order_cancel") await pushCancel(admin, row, connection);
    else await pushStock(admin, row, connection);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = error instanceof HubriseError ? error.status : null;
    console.error("[hubrise] envoi en échec", { outboxId: row.id, kind: row.kind, message });

    if (status === 401) {
      // Jeton refusé : la ligne attend la reconnexion, sans compter la tentative.
      await admin
        .from("hubrise_outbox")
        .update({ status: "blocked", attempts: row.attempts - 1, last_error: message })
        .eq("id", row.id);
      return;
    }
    // Un 4xx (hors 429) est une erreur de contenu : le renvoyer n'y change rien.
    const permanent = status !== null && status >= 400 && status < 500 && status !== 429;
    if (permanent || row.attempts >= HUBRISE.outbox.maxAttempts) {
      await abandon(admin, row, message);
      return;
    }
    await settle(admin, row, { last_error: message });
  }
}

/** Vide la file : appelé à chaud (après commande) et par le cron. */
export async function drainOutbox(admin: Admin): Promise<number> {
  const rows = await claimDue(admin);
  for (const row of rows) await process(admin, row);
  return rows.length;
}

/** Les envois bloqués par un 401 repartent dès que la connexion est rétablie. */
export async function releaseBlocked(admin: Admin, etablissementId: string) {
  await admin
    .from("hubrise_outbox")
    .update({ status: "pending", next_attempt_at: new Date().toISOString() })
    .eq("etablissement_id", etablissementId)
    .eq("status", "blocked");
}

/** Purge des envois terminés, passé le délai de conservation. */
export async function purgeOutbox(admin: Admin) {
  const before = new Date(
    Date.now() - HUBRISE.outbox.retentionDays * 24 * 3600 * 1000
  ).toISOString();
  await admin
    .from("hubrise_outbox")
    .delete()
    .in("status", ["sent", "skipped"])
    .lt("created_at", before);
}
