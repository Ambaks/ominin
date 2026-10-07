import { NextResponse } from "next/server";
import {
  connectedAccount,
  getStripe,
  settlePaymentIntent,
} from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Confirmation côté serveur d'un paiement Stripe, appelée par la feuille de
 * paiement dès que Stripe.js a confirmé l'intent. Anonyme mais inoffensive :
 * l'intent est relu chez Stripe et le marquage est celui du webhook connecté
 * — les deux chemins sont redondants, ce qui couvre le client plus rapide
 * que le webhook, et le dev local sans URL de webhook publique. Ce que dit
 * le navigateur ne fait jamais foi.
 */

export async function POST(request: Request) {
  const { orderId } = (await request.json().catch(() => ({}))) as {
    orderId?: string;
  };
  if (!orderId) {
    return NextResponse.json({ error: "Commande manquante." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("etablissement_id, paid_online, stripe_payment_intent_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
  if (order.paid_online) return NextResponse.json({ paid: true });
  if (!order.stripe_payment_intent_id) return NextResponse.json({ paid: false });

  const account = await connectedAccount(admin, order.etablissement_id);
  if (!account) return NextResponse.json({ paid: false });

  const stripe = getStripe();
  const intent = await stripe.paymentIntents.retrieve(
    order.stripe_payment_intent_id,
    {},
    { stripeAccount: account.id }
  );
  const outcome = await settlePaymentIntent(admin, stripe, intent, account.id);
  return NextResponse.json({
    paid: outcome === "paid" || outcome === "already_paid",
  });
}
