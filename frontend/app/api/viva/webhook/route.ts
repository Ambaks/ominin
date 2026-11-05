import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  confirmVivaOrder,
  parseViva,
  VivaAmountMismatch,
  VIVA_ORDER_COLUMNS,
  webhookKey,
} from "@/lib/viva/server";

/*
 * Webhook Viva : paiement créé (1796), paiement refusé (1798) et commande
 * mise à jour (4865, annulation). Viva ne signe pas ses notifications : le
 * payload n'est qu'un indice — la commande qu'il nomme est relue chez Viva et
 * réglée par le même chemin que le retour du client (confirmVivaOrder).
 * C'est le filet durable : un client qui ferme l'onglet sur la page de Viva
 * ne repasse jamais par /api/viva/return.
 *
 * Viva réessaie toutes les heures tant qu'il n'a pas reçu de 2xx : 200 sur un
 * événement inconnu ou une commande qui n'est pas la nôtre, 500 seulement
 * quand le traitement d'une de nos commandes a vraiment échoué.
 */

/** Événements qui peuvent dire qu'une commande a été payée, ou refusée. */
const SETTLING_EVENTS = new Set([1796, 1798, 4865]);

/** Vérification de l'URL : Viva attend la clé de webhook du compte. */
export async function GET() {
  try {
    return NextResponse.json({ Key: await webhookKey() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[viva] clé de webhook illisible", { message });
    return NextResponse.json({ error: "Clé indisponible." }, { status: 502 });
  }
}

interface VivaEvent {
  EventTypeId?: number;
  EventData?: { OrderCode?: string; TransactionId?: string };
}

export async function POST(request: Request) {
  let event: VivaEvent | null = null;
  try {
    event = parseViva(await request.text()) as VivaEvent | null;
  } catch {
    // Corps illisible : rien à relire.
  }
  const orderCode = event?.EventData?.OrderCode;
  if (!event?.EventTypeId || !SETTLING_EVENTS.has(event.EventTypeId) || !orderCode) {
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(VIVA_ORDER_COLUMNS)
    .eq("viva_order_code", String(orderCode))
    .maybeSingle();
  if (!order?.viva_order_code || order.paid_online) {
    return NextResponse.json({ received: true });
  }

  try {
    await confirmVivaOrder(
      admin,
      { ...order, viva_order_code: order.viva_order_code },
      event.EventData?.TransactionId ?? null
    );
  } catch (error) {
    // Montant inattendu : l'équipe est alertée, réessayer n'y changerait rien.
    if (error instanceof VivaAmountMismatch) return NextResponse.json({ received: true });
    const message = error instanceof Error ? error.message : String(error);
    console.error("[viva] webhook non traité", { orderId: order.id, message });
    return NextResponse.json({ error: "Traitement impossible." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
