import { NextResponse } from "next/server";
import { settleClubIntent } from "@/lib/club/settle";
import { connectedAccount, getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Appelée par la feuille dès que Stripe.js a confirmé le paiement d'une
 * table ou d'une part : l'intent est relu chez Stripe, ce que dit le
 * navigateur ne fait jamais foi. Redondante avec le webhook connecté, à
 * dessein.
 */
export async function POST(request: Request) {
  const { paymentId } = (await request.json().catch(() => ({}))) as { paymentId?: string };
  if (!paymentId) {
    return NextResponse.json({ error: "Paiement manquant." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("club_payments")
    .select("etablissement_id, status, stripe_payment_intent_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) {
    return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });
  }
  if (payment.status === "payee") return NextResponse.json({ paid: true });
  if (!payment.stripe_payment_intent_id) return NextResponse.json({ paid: false });

  const account = await connectedAccount(admin, payment.etablissement_id);
  if (!account) return NextResponse.json({ paid: false });
  const stripe = getStripe();
  const intent = await stripe.paymentIntents.retrieve(
    payment.stripe_payment_intent_id,
    {},
    { stripeAccount: account.id }
  );
  const outcome = await settleClubIntent(admin, stripe, intent, account.id);
  return NextResponse.json({ paid: outcome === "paid" || outcome === "already_paid" });
}
