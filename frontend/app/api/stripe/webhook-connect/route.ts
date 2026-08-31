import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Webhook des comptes CONNECTÉS (paiements d'additions à table) — endpoint
 * Stripe distinct du webhook plateforme (abonnements), avec son propre
 * secret STRIPE_CONNECT_WEBHOOK_SECRET. À l'encaissement d'une session,
 * la commande est marquée payée en ligne (paid_online + payment_mode) ;
 * son cycle de statuts cuisine/service reste inchangé.
 */

export async function POST(request: Request) {
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_CONNECT_WEBHOOK_SECRET manquante." },
      { status: 500 }
    );
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature absente." }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      secret
    );
  } catch {
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;
    if (orderId && session.mode === "payment") {
      // Pourboire posé en métadonnée par /api/stripe/pay, encaissé avec la
      // session : on ne l'enregistre qu'au paiement effectif.
      const tip = Number(session.metadata?.tip_amount);
      const admin = createAdminClient();
      const { error } = await admin
        .from("orders")
        .update({
          paid_online: true,
          payment_mode: "carte",
          ...(Number.isFinite(tip) && tip > 0 ? { tip_amount: tip } : {}),
        })
        .eq("id", orderId);
      if (error) throw new Error(error.message);
    }
  }

  return NextResponse.json({ received: true });
}
