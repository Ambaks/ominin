import { NextResponse } from "next/server";
import {
  connectedAccount,
  getStripe,
  settleCheckoutSession,
} from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Confirmation côté serveur au retour de Stripe Checkout (?paiement=succes).
 * Anonyme mais inoffensive : la session est relue chez Stripe et le marquage
 * est celui du webhook connecté — les deux chemins sont redondants, ce qui
 * couvre le retour du client avant l'arrivée du webhook, et le dev local sans
 * URL de webhook publique. L'URL de retour ne fait jamais foi.
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
    .select("etablissement_id, paid_online, stripe_session_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
  if (order.paid_online) return NextResponse.json({ paid: true });
  if (!order.stripe_session_id) return NextResponse.json({ paid: false });

  const account = await connectedAccount(admin, order.etablissement_id);
  if (!account) return NextResponse.json({ paid: false });

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(
    order.stripe_session_id,
    {},
    { stripeAccount: account.id }
  );
  const outcome = await settleCheckoutSession(admin, stripe, session, account.id);
  return NextResponse.json({
    paid: outcome === "paid" || outcome === "already_paid",
  });
}
