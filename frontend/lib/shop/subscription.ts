import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Abonnement à l'offre Shop, écrit par le webhook plateforme (api/stripe/
 * webhook) à partir des événements qui portent metadata.shop_id. Les
 * lookup_keys correspondent aux prix créés par scripts/setup-stripe.ts.
 */
export const SHOP_SETUP_LOOKUP_KEY = "shop_setup";
export const SHOP_MONTHLY_LOOKUP_KEY = "shop_monthly";

export async function upsertShopSubscription(row: {
  shop_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  status: string;
  setupPaid?: boolean;
}) {
  const admin = createAdminClient();
  const { setupPaid, ...columns } = row;
  const { error } = await admin.from("shop_subscriptions").upsert(
    { ...columns, ...(setupPaid && { setup_paid_at: new Date().toISOString() }), updated_at: new Date().toISOString() },
    { onConflict: "shop_id" }
  );
  if (error) throw new Error(error.message);
}

/** Traite un événement plateforme Stripe s'il concerne une boutique ; renvoie false sinon. */
export async function handleShopSubscriptionEvent(stripe: Stripe, event: Stripe.Event): Promise<boolean> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const shopId = session.metadata?.shop_id;
    if (!shopId || session.mode !== "subscription") return false;
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (!subscriptionId) return true;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await upsertShopSubscription({
      shop_id: shopId,
      stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
      stripe_subscription_id: subscriptionId,
      status: subscription.status,
      setupPaid: true,
    });
    return true;
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const shopId = subscription.metadata?.shop_id;
    if (!shopId) return false;
    // Événements non ordonnés : on relit le statut courant plutôt que celui de l'événement.
    const status = event.type === "customer.subscription.deleted" ? "canceled" : (await stripe.subscriptions.retrieve(subscription.id)).status;
    await upsertShopSubscription({
      shop_id: shopId,
      stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      status,
    });
    return true;
  }
  return false;
}
