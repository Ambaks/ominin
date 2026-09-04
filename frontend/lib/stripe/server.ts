import Stripe from "stripe";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** Client Stripe côté serveur (route handlers uniquement — clé secrète). */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY manquante — renseigne frontend/.env.local."
    );
  }
  return new Stripe(key);
}

/** Compte Stripe Express relié à l'établissement, ou null s'il n'y en a pas. */
export async function connectedAccount(
  admin: Admin,
  etablissementId: string
): Promise<{ id: string; chargesEnabled: boolean } | null> {
  const { data } = await admin
    .from("payment_accounts")
    .select("stripe_account_id, charges_enabled")
    .eq("etablissement_id", etablissementId)
    .maybeSingle();
  return data
    ? { id: data.stripe_account_id, chargesEnabled: data.charges_enabled }
    : null;
}

export type SettleOutcome = "paid" | "already_paid" | "refunded" | "unpaid";

/**
 * Règle une commande d'après sa session Checkout — appelé par le webhook
 * connecté et par la vérification au retour du client, deux chemins
 * redondants et idempotents. La commande n'est marquée payée que si elle
 * attend encore son encaissement : réglée au comptoir (même en partie) ou
 * annulée entre-temps, le paiement en ligne est remboursé plutôt que compté
 * deux fois. Une session d'un autre compte connecté est ignorée.
 */
export async function settleCheckoutSession(
  admin: Admin,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  accountId: string
): Promise<SettleOutcome> {
  const orderId = session.metadata?.order_id;
  if (
    !orderId ||
    session.mode !== "payment" ||
    session.payment_status !== "paid"
  ) {
    return "unpaid";
  }

  const [{ data: order }, { data: settledLines }] = await Promise.all([
    admin
      .from("orders")
      .select("status, paid_online, etablissement_id")
      .eq("id", orderId)
      .maybeSingle(),
    admin
      .from("order_items")
      .select("id")
      .eq("order_id", orderId)
      .not("paid_mode", "is", null)
      .limit(1),
  ]);
  if (!order) return "unpaid";
  if (order.paid_online) return "already_paid";

  const account = await connectedAccount(admin, order.etablissement_id);
  if (account?.id !== accountId) {
    console.error("[stripe] session sur un autre compte connecté", {
      orderId,
      session: session.id,
    });
    return "unpaid";
  }

  if (order.status !== "en_attente" || settledLines?.length) {
    const paymentIntent =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
    if (paymentIntent) {
      await stripe.refunds.create(
        { payment_intent: paymentIntent },
        { stripeAccount: accountId, idempotencyKey: `refund-${session.id}` }
      );
    }
    console.error("[stripe] paiement remboursé : addition déjà réglée ou annulée", {
      orderId,
      session: session.id,
    });
    return "refunded";
  }

  // Pourboire posé en métadonnée à la création de la session : un fait choisi
  // par le client, enregistré seulement au paiement effectif.
  const tip = Number(session.metadata?.tip_amount);
  const { error } = await admin.rpc("mark_order_paid_online", {
    p_order_id: orderId,
    p_tip: Number.isFinite(tip) && tip > 0 ? tip : null,
  });
  if (error) throw new Error(error.message);
  return "paid";
}
