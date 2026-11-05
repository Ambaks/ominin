import { NextResponse } from "next/server";
import { markPaymentRefused } from "@/lib/menu/payment-attempts";
import { dispatchOrderEvent } from "@/lib/push/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { closeVivaOrder, confirmVivaOrder, VIVA_ORDER_COLUMNS } from "@/lib/viva/server";

/*
 * Retour de la page de paiement Viva. Succès et échec arrivent ici : leurs
 * URL sont celles de la source de paiement, communes à toutes les commandes,
 * et Viva y ajoute t (transaction), s (code de commande), lang, eventId et
 * eci. Rien de ces paramètres ne fait foi : la commande est retrouvée par s,
 * puis son règlement relu chez Viva — le même chemin que le webhook, qui
 * rattrape un client qui ne revient pas.
 *
 * Payée, le client retrouve son menu sur sa commande (?paiement=succes). Non
 * payée, la commande Viva est annulée (un retour arrière sur la page de
 * paiement ne pourra plus la débiter) et l'addition passe au comptoir, comme
 * un paiement abandonné dans la page ; à emporter, il n'y a pas de comptoir :
 * le panier attend au menu (?paiement=annule). Viva injoignable, ou un
 * montant encaissé qui n'est pas celui de la commande : rien n'est tranché
 * (?paiement=attente) — le webhook, l'expiration ou l'équipe le feront.
 */

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const orderCode = params.get("s");
  const transactionId = params.get("t");
  // Non nul sur la page d'échec : la banque a refusé (10051, 12005…).
  const eventId = params.get("eventId");
  if (!orderCode || !/^\d+$/.test(orderCode)) {
    return new NextResponse("Paiement introuvable.", { status: 404 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(`${VIVA_ORDER_COLUMNS}, viva_return_url, online_payment_started_at`)
    .eq("viva_order_code", orderCode)
    .maybeSingle();
  if (!order?.viva_order_code || !order.viva_return_url) {
    return new NextResponse("Paiement introuvable.", { status: 404 });
  }
  const target = { ...order, viva_order_code: order.viva_order_code };

  let outcome: "succes" | "annule" | "attente";
  try {
    if (await confirmVivaOrder(admin, target, transactionId)) {
      outcome = "succes";
    } else if (await closeVivaOrder(admin, target)) {
      outcome = "succes";
    } else {
      outcome = "annule";
      // Le journal dit le refus, que l'API de Viva ne liste pas. Un indice sans
      // enjeu d'argent : il ne fait que qualifier la tentative.
      if (eventId && eventId !== "0") await markPaymentRefused(admin, order.id);
      // Déjà au comptoir (retour rechargé) : la salle a été prévenue une fois.
      if (order.type !== "collect" && order.online_payment_started_at) {
        const { error } = await admin.rpc("abandon_online_payment", { p_order_id: order.id });
        if (error) throw new Error(error.message);
        await dispatchOrderEvent(order.id, "nouvelle_commande");
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[viva] retour non traité", { orderId: order.id, message });
    outcome = "attente";
  }

  const back = new URL(order.viva_return_url);
  back.searchParams.set("paiement", outcome);
  back.searchParams.set("commande", order.id);
  return NextResponse.redirect(back, 303);
}
