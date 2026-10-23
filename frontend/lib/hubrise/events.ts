import { after } from "next/server";
import { raiseAlert } from "@/lib/admin/alerts";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { getConnection, getConnectionByLocation, type Connection } from "./connection";
import { pullHours } from "./hours";
import { pullInventory } from "./inventory";
import { recordTillPayments } from "./payments";

type Admin = ReturnType<typeof createAdminClient>;

/*
 * Callbacks HubRise. Un seul par connexion, signé ; la route répond vite et
 * ce module fait le travail. HubRise renvoie un événement sur toute réponse
 * 5xx : chaque traitement est donc rejouable sans effet de bord.
 *
 * Nos propres écritures ne nous reviennent jamais (HubRise n'envoie pas à un
 * client les événements qu'il a causés), d'où own_order : seules les
 * décisions de la caisse arrivent.
 */

export interface HubriseEvent {
  resource_type?: string;
  event_type?: string;
  location_id?: string;
  order_id?: string;
  new_state?: {
    status?: string;
    confirmed_time?: string | null;
    custom_fields?: { epos?: { rejection?: { cause?: string } } } | null;
  } | null;
}

type OrderStatus = Tables<"orders">["status"];

/**
 * Statut HubRise → statut Ominin, ou null s'il n'y a rien à changer.
 * received et new : la caisse a la commande, rien n'a bougé pour le client.
 * Une commande déjà terminée (servie, retirée, annulée) ne revient jamais en arrière.
 * Sur place (à table, fast food), l'équipe mène le service dans Ominin — elle
 * y dit la commande prête et la remet : seule l'annulation de la caisse
 * compte. « Acceptée » y était d'ailleurs refusée par la base (une commande
 * sur place ne passe pas « en préparation »), et HubRise la renvoyait sans fin.
 */
export function mapStatus(
  hubrise: string,
  order: Pick<Tables<"orders">, "type" | "status">
): OrderStatus | null {
  if (order.type === "sur_place") {
    const live = order.status === "en_attente" || order.status === "payee" || order.status === "prete";
    return live && (hubrise === "rejected" || hubrise === "cancelled") ? "annulee" : null;
  }
  const open = order.status === "en_attente" || order.status === "en_preparation" || order.status === "prete";
  if (!open) return null;
  switch (hubrise) {
    case "accepted":
    case "in_preparation":
      return order.status === "en_attente" ? "en_preparation" : null;
    case "awaiting_collection":
    case "in_delivery":
      return order.status === "prete" ? null : "prete";
    case "completed":
      return order.type === "collect" ? "retiree" : "servie";
    case "rejected":
    case "cancelled":
    case "delivery_failed":
      return "annulee";
    default:
      return null;
  }
}

async function applyOrderUpdate(admin: Admin, event: HubriseEvent) {
  if (!event.order_id) return;
  const { data: order } = await admin
    .from("orders")
    .select("id, etablissement_id, type, status, paid_online, payment_mode, online_payment_started_at, estimated_ready_at, hubrise_status")
    .eq("hubrise_order_id", event.order_id)
    .maybeSingle();
  if (!order) return;

  // Un règlement ajouté à la caisse peut arriver sans changement de statut.
  const hubriseStatus = event.new_state?.status ?? null;
  const next = hubriseStatus ? mapStatus(hubriseStatus, order) : null;
  const confirmed = event.new_state?.confirmed_time ?? null;
  const patch: Partial<Tables<"orders">> = {};
  if (hubriseStatus && hubriseStatus !== order.hubrise_status) patch.hubrise_status = hubriseStatus;
  if (next) patch.status = next;
  // L'heure confirmée par la caisse est « l'heure prête » que le client voit.
  if (confirmed && new Date(confirmed).getTime() !== new Date(order.estimated_ready_at ?? 0).getTime()) {
    patch.estimated_ready_at = confirmed;
  }
  if (Object.keys(patch).length) {
    const { error } = await admin.from("orders").update(patch).eq("id", order.id);
    if (error) throw new Error(error.message);
  }

  // Sur place, à régler : encaissée à la caisse, elle est réglée dans Ominin.
  if (
    next !== "annulee" &&
    order.type === "sur_place" &&
    order.status === "en_attente" &&
    !order.paid_online &&
    !order.payment_mode &&
    !order.online_payment_started_at
  ) {
    const connection = await getConnection(admin, order.etablissement_id);
    if (connection) await recordTillPayments(admin, connection, order.id, event.order_id);
  }

  // Annulée par la caisse après un paiement en ligne : l'argent a été pris,
  // rien ne le rend tout seul. Un humain décide du remboursement.
  if (next === "annulee" && order.paid_online) {
    const { data: etab } = await admin
      .from("etablissements")
      .select("name")
      .eq("id", order.etablissement_id)
      .maybeSingle();
    await raiseAlert("backend", `hubrise-annulee:${order.id}`, {
      title: `${etab?.name ?? "Un client"} : commande payée annulée par la caisse`,
      body: `La caisse a ${hubriseStatus === "rejected" ? "refusé" : "annulé"} une commande réglée en ligne : à rembourser.`,
      url: "/clients",
      urgent: true,
    }).catch(() => false);
  }
}

/** Traite un événement signé. L'appelant a déjà vérifié la signature. */
export async function handleEvent(admin: Admin, event: HubriseEvent): Promise<void> {
  const resource = event.resource_type ?? "";

  if (resource === "order" || resource === "own_order") {
    if (event.event_type === "update") await applyOrderUpdate(admin, event);
    return;
  }

  // Les autres événements sont sans état : on relit chez HubRise, hors de la
  // réponse (HubRise attend 20 s au plus).
  const connection = event.location_id
    ? await getConnectionByLocation(admin, event.location_id)
    : null;
  if (!connection) return;

  if (resource === "catalog") {
    // Relu plus tard, d'un seul coup, quand les modifications se sont tues.
    await admin
      .from("hubrise_connections")
      .update({ catalog_dirty_at: new Date().toISOString() })
      .eq("etablissement_id", connection.etablissement_id);
  } else if (resource === "inventory") {
    after(() => relire(admin, connection, pullInventory));
  } else if (resource === "location") {
    after(() => relire(admin, connection, pullHours));
  }
}

async function relire(
  admin: Admin,
  connection: Connection,
  pull: (admin: Admin, connection: Connection) => Promise<void>
) {
  try {
    await pull(admin, connection);
  } catch (error) {
    console.error("[hubrise] relecture en échec", {
      etablissementId: connection.etablissement_id,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
