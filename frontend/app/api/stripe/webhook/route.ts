import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Webhook Stripe : source de vérité de l'état d'abonnement en base.
 * Signature vérifiée (STRIPE_WEBHOOK_SECRET) ; écriture via service_role.
 * L'etablissement_id voyage dans les metadata posées à la création de la
 * session Checkout.
 */

async function upsertSubscription(row: {
  etablissement_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  status: string;
}) {
  const db = createAdminClient();
  const { error } = await db.from("subscriptions").upsert(
    { ...row, updated_at: new Date().toISOString() },
    { onConflict: "etablissement_id" }
  );
  if (error) throw new Error(error.message);
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET manquante." },
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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const etablissementId =
        session.metadata?.etablissement_id ?? session.client_reference_id;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (etablissementId && subscriptionId) {
        const subscription =
          await stripe.subscriptions.retrieve(subscriptionId);
        await upsertSubscription({
          etablissement_id: etablissementId,
          stripe_customer_id:
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id,
          stripe_subscription_id: subscriptionId,
          status: subscription.status,
        });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const etablissementId = subscription.metadata?.etablissement_id;
      if (etablissementId) {
        await upsertSubscription({
          etablissement_id: etablissementId,
          stripe_customer_id:
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.id,
          stripe_subscription_id: subscription.id,
          status:
            event.type === "customer.subscription.deleted"
              ? "canceled"
              : subscription.status,
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
