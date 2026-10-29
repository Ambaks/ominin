import { raiseAlert } from "@/lib/admin/alerts";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { HubriseError } from "./client";
import { HUBRISE } from "./config";
import { callHubrise, getConnection, type Connection } from "./connection";
import { buildOrder } from "./orders";
import { counterLegs, syncCounterPayments } from "./payments";

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
 *
 * Les règlements et l'état d'une commande (order_payments, order_status)
 * portent ce qu'elle est au moment de l'envoi : leur ligne repart à chaque
 * changement (hubrise_enqueue_sync remet ses essais à zéro). Un envoi en
 * cours ne la marque donc terminée que si ses essais n'ont pas bougé.
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

/** Clôt l'essai ; false si la ligne a été remise en file entre-temps (elle sera rejouée). */
async function settle(
  admin: Admin,
  row: Row,
  patch: Partial<Pick<Row, "status" | "last_error" | "hubrise_id">>
): Promise<boolean> {
  const { data } = await admin
    .from("hubrise_outbox")
    .update({
      ...patch,
      ...(patch.status === "sent" ? { sent_at: new Date().toISOString() } : {}),
    })
    .eq("id", row.id)
    .eq("attempts", row.attempts)
    .select("id");
  return (data?.length ?? 0) > 0;
}

/** Ce qui n'est pas parvenu à la caisse, pour l'alerte. */
const UNDELIVERED: Record<string, string> = {
  order: "commande non transmise à HubRise",
  order_cancel: "annulation non transmise à HubRise",
  order_payments: "règlement non transmis à HubRise",
  order_status: "statut non transmis à HubRise",
  stock: "stock non transmis à HubRise",
  customer_anonymise: "effacement d'un client non transmis à HubRise",
};

async function abandon(admin: Admin, row: Row, message: string) {
  if (!(await settle(admin, row, { status: "dead", last_error: message }))) return;
  const { data: etab } = await admin
    .from("etablissements")
    .select("name")
    .eq("id", row.etablissement_id)
    .maybeSingle();
  await raiseAlert("backend", `hubrise:${row.id}`, {
    title: `${etab?.name ?? "Un client"} : ${UNDELIVERED[row.kind]}`,
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

/**
 * L'identifiant HubRise de la commande. Pas encore transmise : la ligne
 * l'attend, sans compter l'essai — elle repasse au premier délai tant que
 * l'envoi de la commande est en file, et se bloque avec lui sur un jeton
 * refusé. Jamais transmise : rien à faire.
 */
async function sentOrderId(admin: Admin, row: Row): Promise<string | null> {
  const { data: order } = await admin
    .from("orders")
    .select("hubrise_order_id")
    .eq("id", row.order_id!)
    .maybeSingle();
  if (order?.hubrise_order_id) return order.hubrise_order_id;
  const { data: push } = await admin
    .from("hubrise_outbox")
    .select("status")
    .eq("order_id", row.order_id!)
    .eq("kind", "order")
    .maybeSingle();
  if (push && (push.status === "pending" || push.status === "blocked")) {
    await admin
      .from("hubrise_outbox")
      .update({
        status: push.status,
        attempts: row.attempts - 1,
        last_error: "Commande pas encore transmise à HubRise.",
      })
      .eq("id", row.id)
      .eq("attempts", row.attempts);
    return null;
  }
  await settle(admin, row, { status: "skipped", last_error: "Jamais transmise." });
  return null;
}

/** Les règlements encaissés dans Ominin, portés chez HubRise (lib/hubrise/payments). */
async function pushPayments(admin: Admin, row: Row, connection: Connection) {
  if (!row.order_id) return;
  const hubriseOrderId = await sentOrderId(admin, row);
  if (!hubriseOrderId) return;
  const { data: order } = await admin
    .from("orders")
    .select("status, order_items (quantity, unit_price), order_payments (id, mode, amount, till_payment)")
    .eq("id", row.order_id)
    .maybeSingle();
  // Annulée : l'annulation part de son côté (order_cancel).
  if (order && order.status !== "annulee") {
    const goods = order.order_items.reduce(
      (sum, line) => sum + line.quantity * line.unit_price,
      0
    );
    const legs = counterLegs(order.order_payments, goods);
    await syncCounterPayments(admin, connection, hubriseOrderId, legs, goods);
  }
  await settle(admin, row, { status: "sent", last_error: null });
}

/** Statuts HubRise d'où une commande ne repart plus : la caisse l'a close. */
const CLOSED = ["completed", "cancelled", "rejected"];

/**
 * Une commande numérotée prête, remise, ou reprise en préparation après un
 * « Prête » trop tôt : la caisse suit, sauf si elle l'a déjà close. Le
 * paiement ne change rien ici — la caisse accepte elle-même ses nouvelles
 * commandes.
 */
async function pushStatus(admin: Admin, row: Row, connection: Connection) {
  if (!row.order_id) return;
  const hubriseOrderId = await sentOrderId(admin, row);
  if (!hubriseOrderId) return;
  const { data: order } = await admin
    .from("orders")
    .select("status, hubrise_status")
    .eq("id", row.order_id)
    .maybeSingle();
  const target =
    order?.status === "prete"
      ? "awaiting_collection"
      : order?.status === "servie"
        ? "completed"
        : order?.status === "payee" && order.hubrise_status === "awaiting_collection"
          ? "in_preparation"
          : null;
  if (target && target !== order?.hubrise_status && !CLOSED.includes(order?.hubrise_status ?? "")) {
    await callHubrise(admin, connection, `/location/orders/${hubriseOrderId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: target }),
    });
    // Nos propres écritures ne nous reviennent pas en callback : on la note.
    await admin.from("orders").update({ hubrise_status: target }).eq("id", row.order_id);
  }
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

/**
 * Client effacé dans Ominin (erase_loyalty_customer) : HubRise l'anonymise
 * aussi. Inconnu de la liste de clients reliée (404, liste changée) : rien
 * à anonymiser.
 */
async function pushAnonymise(admin: Admin, row: Row, connection: Connection) {
  if (!row.hubrise_id || !connection.customer_list_id) {
    await settle(admin, row, { status: "skipped", last_error: "Aucune liste de clients." });
    return;
  }
  try {
    await callHubrise(
      admin,
      connection,
      `/customer_lists/${connection.customer_list_id}/customers/${row.hubrise_id}/anonymise`,
      { method: "POST", body: "{}" }
    );
  } catch (error) {
    if (error instanceof HubriseError && error.status === 404) {
      await settle(admin, row, { status: "skipped", last_error: "Client inconnu de HubRise." });
      return;
    }
    throw error;
  }
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
    else if (row.kind === "order_payments") await pushPayments(admin, row, connection);
    else if (row.kind === "order_status") await pushStatus(admin, row, connection);
    else if (row.kind === "customer_anonymise") await pushAnonymise(admin, row, connection);
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
        .eq("id", row.id)
        .eq("attempts", row.attempts);
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
