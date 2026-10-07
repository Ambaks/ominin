import { NextResponse } from "next/server";
import { ONLINE_PAYMENT_TTL_S } from "@/lib/menu/online-payment-ttl";
import {
  getMerchantToken,
  retrieveOrder,
  settleFromOrder,
  withFreshToken,
} from "@/lib/square/server";
import {
  connectedAccount,
  getStripe,
  settlePaymentIntent,
} from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Tentatives de paiement en ligne abandonnées (workflow square-expire.yml).
 * Ni Square ni un Payment Intent Stripe n'expirent d'eux-mêmes : sans ce
 * passage, une commande dont le client a quitté le paiement en ligne restait
 * en attente pour toujours, hors de la caisse, son stock retenu. Même sort
 * pour une tentative qui n'a atteint aucun encaisseur (onglet fermé avant).
 *
 * Passé ONLINE_PAYMENT_TTL_S, la tentative est écartée
 * (discard_stale_online_payment). Celle qui a atteint un encaisseur est
 * d'abord relue chez lui : réglée, elle est close comme par le webhook ; un
 * Payment Intent inachevé est annulé avant, pour qu'il ne puisse plus être
 * débité. Invérifiable (compte délié, API en panne), elle est laissée en
 * place et signalée, jamais supprimée à l'aveugle. Les sessions Checkout
 * encore ouvertes au passage au paiement dans la page expirent d'elles-mêmes
 * (webhook connecté).
 */

type Admin = ReturnType<typeof createAdminClient>;

/** Vrai si Square porte un règlement abouti pour cette commande, qui est alors close. */
async function settledAtSquare(
  admin: Admin,
  order: { id: string; etablissement_id: string; square_order_id: string }
): Promise<boolean> {
  const merchant = await getMerchantToken(admin, order.etablissement_id);
  if (!merchant) throw new Error("Compte Square délié : règlement invérifiable.");
  const { order: squareOrder } = await withFreshToken(
    admin,
    order.etablissement_id,
    merchant,
    (token) => retrieveOrder(token, order.square_order_id)
  );
  return settleFromOrder(admin, order.id, squareOrder);
}

/**
 * Vrai si l'intent Stripe a abouti, la commande étant alors close ; sinon il
 * est annulé, et la commande peut être écartée.
 */
async function settledAtStripe(
  admin: Admin,
  order: { etablissement_id: string; stripe_payment_intent_id: string }
): Promise<boolean> {
  const account = await connectedAccount(admin, order.etablissement_id);
  if (!account) throw new Error("Compte Stripe délié : règlement invérifiable.");
  const stripe = getStripe();
  const stripeAccount = { stripeAccount: account.id };
  const intent = await stripe.paymentIntents.retrieve(
    order.stripe_payment_intent_id,
    {},
    stripeAccount
  );
  if (intent.status === "succeeded") {
    await settlePaymentIntent(admin, stripe, intent, account.id);
    return true;
  }
  if (intent.status !== "canceled") {
    await stripe.paymentIntents.cancel(intent.id, {}, stripeAccount);
  }
  return false;
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  }

  const startedBefore = new Date(Date.now() - ONLINE_PAYMENT_TTL_S * 1000).toISOString();
  const admin = createAdminClient();
  const { data: candidates, error } = await admin
    .from("orders")
    .select("id, etablissement_id, square_order_id, stripe_session_id, stripe_payment_intent_id, sumup_checkout_id, etablissements(payment_provider)")
    .eq("status", "en_attente")
    .eq("paid_online", false)
    .lt("online_payment_started_at", startedBefore);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Une session Checkout expire d'elle-même (webhook connecté), SumUp a son
  // propre suivi : passent ici les tentatives Square, les Payment Intents
  // Stripe, et celles qui n'ont atteint personne.
  const stale = candidates.filter(
    (order) =>
      order.etablissements?.payment_provider === "square" ||
      (!order.stripe_session_id && !order.square_order_id && !order.sumup_checkout_id)
  );

  let discarded = 0;
  let settled = 0;
  const failed: string[] = [];
  // En série : quelques commandes par passage, chacune relue puis écrite.
  for (const order of stale) {
    try {
      const { square_order_id: squareOrderId, stripe_payment_intent_id: intentId } = order;
      if (squareOrderId && (await settledAtSquare(admin, { ...order, square_order_id: squareOrderId }))) {
        settled += 1;
        continue;
      }
      if (intentId && (await settledAtStripe(admin, { ...order, stripe_payment_intent_id: intentId }))) {
        settled += 1;
        continue;
      }
      const { data: gone, error: discardError } = await admin.rpc("discard_stale_online_payment", {
        p_order_id: order.id,
        p_started_before: startedBefore,
      });
      if (discardError) throw new Error(discardError.message);
      if (gone) discarded += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[square] tentative abandonnée non traitée", { orderId: order.id, message });
      failed.push(order.id);
    }
  }

  return NextResponse.json({ discarded, settled, failed });
}
