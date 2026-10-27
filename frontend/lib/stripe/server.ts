import Stripe from "stripe";
import { dispatchOrderEvent } from "@/lib/push/server";
import { clubSiteUrl, collectSiteUrl, menuSiteUrl } from "@/lib/site";
import type { createAdminClient } from "@/lib/supabase/admin";
import { requireGerant as requireEtablissementGerant } from "@/lib/supabase/gerant";

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

/**
 * Clé publique remise à Stripe.js, ou null si elle manque ou n'est pas du
 * même mode (test ou live) que la clé secrète : un intent live ne se
 * confirme pas avec une clé de test, la feuille de paiement ne se monterait
 * jamais — sans que rien ne le dise côté serveur.
 */
export function publishableKey(): string | null {
  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  const secret = process.env.STRIPE_SECRET_KEY;
  const live = (value: string) => value.includes("_live_");
  if (key && secret && live(key) === live(secret)) return key;
  console.error("[stripe] STRIPE_PUBLISHABLE_KEY absente, ou d'un autre mode que STRIPE_SECRET_KEY");
  return null;
}

/** Gérant de l'établissement courant : seul à régler et consulter l'encaissement. */
export function requireGerant() {
  return requireEtablissementGerant("Seul le gérant peut configurer le paiement en ligne.");
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

/**
 * Apple Pay et Google Pay ne s'affichent que sur un domaine enregistré
 * auprès du compte qui encaisse — en paiement direct, le compte connecté du
 * restaurant, pas la plateforme. Les domaines sont ceux où la feuille de
 * paiement s'ouvre : menus QR, click & collect et tables de club.
 */
export async function registerWalletDomains(
  stripe: Stripe,
  accountId: string
): Promise<void> {
  const options = { stripeAccount: accountId };
  for (const site of [menuSiteUrl, collectSiteUrl, clubSiteUrl]) {
    const domain = { domain_name: new URL(site).hostname };
    const known = await stripe.paymentMethodDomains.list(domain, options);
    if (!known.data.length) await stripe.paymentMethodDomains.create(domain, options);
  }
}

export type SettleOutcome = "paid" | "already_paid" | "refunded" | "unpaid";

/**
 * Règle une commande d'après un encaissement Stripe abouti. La commande
 * n'est marquée payée que si elle attend encore son encaissement : réglée au
 * comptoir (même en partie), annulée, ou déjà payée en ligne par un autre
 * encaissement (deux onglets, un 3-D Secure fini après une relance), le
 * paiement est remboursé plutôt que compté deux fois. L'encaissement qui
 * règle la commande y est inscrit (stripe_payment_intent_id) avant le
 * marquage : c'est lui qui fait foi ensuite. Un paiement sur un autre compte
 * connecté est ignoré. Idempotent : webhook, vérification, route de paiement
 * et balayage peuvent s'y croiser.
 */
async function settlePayment(
  admin: Admin,
  stripe: Stripe,
  payment: {
    orderId: string;
    paymentIntentId: string;
    /** Pourboire choisi par le client, enregistré au paiement effectif. */
    tip: number;
    accountId: string;
    /**
     * Le Payment Intent d'une session Checkout ouverte avant le paiement
     * dans la page : réglé par l'évènement de la session, qui porte le
     * pourboire, et non par celui de l'intent.
     */
    viaIntent: boolean;
  }
): Promise<SettleOutcome> {
  const { orderId, paymentIntentId, tip, accountId, viaIntent } = payment;
  const readOrder = () =>
    admin
      .from("orders")
      .select("status, paid_online, etablissement_id, stripe_payment_intent_id, stripe_session_id")
      .eq("id", orderId)
      .maybeSingle();
  const [{ data: order }, { data: settledLines }] = await Promise.all([
    readOrder(),
    admin
      .from("order_items")
      .select("id")
      .eq("order_id", orderId)
      .not("paid_mode", "is", null)
      .limit(1),
  ]);
  if (
    order &&
    viaIntent &&
    order.stripe_session_id &&
    order.stripe_payment_intent_id !== paymentIntentId
  ) {
    return "unpaid";
  }

  const refund = async (reason: string): Promise<SettleOutcome> => {
    try {
      // La commission Ominin suit : le restaurant ne la paie pas sur un
      // paiement qu'il rend.
      await stripe.refunds.create(
        { payment_intent: paymentIntentId, refund_application_fee: true },
        { stripeAccount: accountId, idempotencyKey: `refund-${paymentIntentId}` }
      );
    } catch (error) {
      // Déjà rendu (passage précédent, tableau de bord) : c'est fait.
      if ((error as { code?: string }).code !== "charge_already_refunded") throw error;
    }
    console.error(`[stripe] paiement remboursé : ${reason}`, { orderId, paymentIntentId });
    return "refunded";
  };

  // Plus de commande (tentative écartée pendant que l'intent aboutissait) :
  // l'argent est rendu — seulement sur le compte d'un restaurant. Le webhook
  // connecté reçoit aussi les paiements des boutiques, dont l'order_id
  // désigne une commande boutique : ceux-là ne le concernent pas.
  if (!order) {
    const { data: restaurant, error: accountError } = await admin
      .from("payment_accounts")
      .select("etablissement_id")
      .eq("stripe_account_id", accountId)
      .maybeSingle();
    if (accountError) throw new Error(accountError.message);
    return restaurant ? refund("commande disparue") : "unpaid";
  }

  const account = await connectedAccount(admin, order.etablissement_id);
  if (account?.id !== accountId) {
    console.error("[stripe] paiement sur un autre compte connecté", {
      orderId,
      paymentIntentId,
    });
    return "unpaid";
  }

  if (order.paid_online) {
    return order.stripe_payment_intent_id === paymentIntentId
      ? "already_paid"
      : refund("commande déjà réglée en ligne par un autre paiement");
  }
  if (order.status !== "en_attente" || settledLines?.length) {
    return refund("addition déjà réglée ou annulée");
  }

  const { error: claimError } = await admin
    .from("orders")
    .update({ stripe_payment_intent_id: paymentIntentId })
    .eq("id", orderId)
    .eq("paid_online", false);
  if (claimError) throw new Error(claimError.message);
  const { data: settled, error } = await admin.rpc("mark_order_paid_online", {
    p_order_id: orderId,
    p_tip: tip > 0 ? tip : null,
  });
  if (error) throw new Error(error.message);
  if (!settled) {
    // Réglée entre-temps : par ce même paiement (l'autre voie, l'annonce est
    // déjà partie), ou par un autre, et celui-ci est en trop.
    const { data: now } = await readOrder();
    return now?.stripe_payment_intent_id === paymentIntentId
      ? "already_paid"
      : refund("commande réglée entre-temps par un autre paiement");
  }
  // Réinscrit : une relance (/api/stripe/pay) a pu inscrire son propre intent
  // entre la revendication et le marquage. Payée, la commande ne l'accepte
  // plus ; cet intent-ci reste celui qui fait foi.
  const { error: reclaimError } = await admin
    .from("orders")
    .update({ stripe_payment_intent_id: paymentIntentId })
    .eq("id", orderId);
  if (reclaimError) throw new Error(reclaimError.message);
  // C'est maintenant que la commande arrive en salle : elle attendait son
  // règlement hors de la caisse, sans avoir été annoncée.
  await dispatchOrderEvent(orderId, "nouvelle_commande");
  return "paid";
}

const tipOf = (metadata: Stripe.Metadata | null | undefined) => {
  const tip = Number(metadata?.tip_amount);
  return Number.isFinite(tip) ? tip : 0;
};

/**
 * D'après le Payment Intent réglé dans la page (menu QR, click & collect) —
 * appelé par le webhook connecté, la vérification qui suit la confirmation,
 * la route de paiement et le balayage des tentatives abandonnées.
 */
export async function settlePaymentIntent(
  admin: Admin,
  stripe: Stripe,
  intent: Stripe.PaymentIntent,
  accountId: string
): Promise<SettleOutcome> {
  const orderId = intent.metadata?.order_id;
  if (!orderId || intent.status !== "succeeded") return "unpaid";
  return settlePayment(admin, stripe, {
    orderId,
    paymentIntentId: intent.id,
    tip: tipOf(intent.metadata),
    accountId,
    viaIntent: true,
  });
}

/**
 * D'après une session Checkout : celles ouvertes avant le passage au
 * paiement dans la page, que le webhook connecté règle encore.
 */
export async function settleCheckoutSession(
  admin: Admin,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  accountId: string
): Promise<SettleOutcome> {
  const orderId = session.metadata?.order_id;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (
    !orderId ||
    !paymentIntentId ||
    session.mode !== "payment" ||
    session.payment_status !== "paid"
  ) {
    return "unpaid";
  }
  return settlePayment(admin, stripe, {
    orderId,
    paymentIntentId,
    tip: tipOf(session.metadata),
    accountId,
    viaIntent: false,
  });
}
