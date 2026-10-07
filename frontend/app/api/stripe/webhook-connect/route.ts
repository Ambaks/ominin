import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  getStripe,
  settleCheckoutSession,
  settlePaymentIntent,
} from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Webhook des comptes CONNECTÉS (paiements en ligne des commandes) —
 * endpoint Stripe distinct du webhook plateforme (abonnements), avec son
 * propre secret STRIPE_CONNECT_WEBHOOK_SECRET. À l'encaissement, la commande
 * est marquée payée en ligne et part en cuisine (ou le paiement est
 * remboursé si l'addition a été réglée au comptoir entre-temps — voir
 * settlePaymentIntent). Une erreur de base renvoie 500 : Stripe rejoue, le
 * marquage est idempotent.
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

  const admin = createAdminClient();
  switch (event.type) {
    // Le paiement dans la page : le filet de la vérification faite par la
    // feuille, si le client ferme l'onglet juste après avoir payé.
    case "payment_intent.succeeded": {
      if (event.account) {
        await settlePaymentIntent(admin, stripe, event.data.object, event.account);
      }
      break;
    }
    // Les sessions Checkout ouvertes avant le passage au paiement dans la
    // page.
    case "checkout.session.completed": {
      const session = event.data.object;
      if (event.account) {
        await settleCheckoutSession(admin, stripe, session, event.account);
      }
      break;
    }
    case "checkout.session.expired": {
      // Le client n'a ni réglé ni choisi le comptoir dans le délai : la
      // commande n'a jamais existé pour le restaurant — supprimée (stock
      // rendu), sans trace en caisse ni dans l'historique. Une commande déjà
      // passée au comptoir ou réglée n'est pas touchée.
      const session = event.data.object;
      const { error } = await admin.rpc("discard_online_payment", {
        p_session_id: session.id,
      });
      if (error) throw new Error(error.message);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
