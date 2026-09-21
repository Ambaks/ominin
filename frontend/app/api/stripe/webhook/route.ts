import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { planTrial } from "@/lib/landing-data";
import { dispatchOrderEvent } from "@/lib/push/server";
import { handleShopSubscriptionEvent } from "@/lib/shop/subscription";
import { getStripe } from "@/lib/stripe/server";
import { STARTER_FLAG } from "@/lib/stripe/starter";
import type { Database } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

type Product = Database["public"]["Enums"]["product"];

/*
 * Webhook Stripe : source de vérité de l'état d'abonnement en base, et
 * création des commandes click & collect une fois le paiement confirmé.
 * Signature vérifiée (STRIPE_WEBHOOK_SECRET) ; écriture via service_role.
 * metadata.etablissement_id et metadata.products voyagent depuis la création
 * de la session Checkout ; metadata.pending_id référence le panier à
 * convertir (collect_pending → create_collect_order, idempotent).
 * metadata.starter marque une commande de démarrage : sur une offre à mois
 * offerts (mode 'payment', sans abonnement Stripe), son paiement vaut
 * activation, et ouvre les mois offerts.
 */

/** Produits couverts par la session/l'abonnement (défaut : 'offre'). */
function parseProducts(metadata: Stripe.Metadata | null): Product[] {
  const raw = metadata?.products ?? "offre";
  return raw
    .split(",")
    .filter((value): value is Product => value === "offre" || value === "collect");
}

async function upsertSubscription(
  products: Product[],
  row: {
    etablissement_id: string;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    status: string;
    trial_started_at?: string;
  }
) {
  const db = createAdminClient();
  const updated_at = new Date().toISOString();
  const { error } = await db.from("subscriptions").upsert(
    products.map((product) => ({ ...row, product, updated_at })),
    { onConflict: "etablissement_id,product" }
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

  // Abonnements des boutiques Ominin Shop (metadata.shop_id) : traités à part,
  // les restaurants ne sont pas concernés.
  if (await handleShopSubscriptionEvent(stripe, event)) {
    return NextResponse.json({ received: true });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // Paiement d'une commande click & collect (mode 'payment').
      if (session.metadata?.pending_id) {
        if (session.payment_status === "paid") {
          const db = createAdminClient();
          const { data: orderId, error } = await db.rpc("create_collect_order", {
            p_pending_id: session.metadata.pending_id,
            p_stripe_session_id: session.id,
          });
          if (error) throw new Error(error.message);
          // Push cuisine : la commande naît payée, c'est son seul point
          // d'entrée. Idempotent (push_notified) même si Stripe rejoue
          // l'événement ; un échec d'envoi ne doit pas faire rejouer le
          // webhook entier.
          if (orderId) {
            await dispatchOrderEvent(orderId, "nouvelle_commande").catch(
              () => {}
            );
          }
        }
        break;
      }

      const etablissementId =
        session.metadata?.etablissement_id ?? session.client_reference_id;

      // Commande de démarrage : pas d'abonnement à relire, la ligne 'offre'
      // passe active sur la foi du paiement, et les mois offerts de l'offre
      // courent à partir de là. Le choix de Square présélectionne
      // l'encaisseur, sans écraser un choix déjà fait dans l'espace de gestion.
      if (
        session.mode === "payment" &&
        session.metadata?.starter === STARTER_FLAG &&
        etablissementId
      ) {
        if (session.payment_status === "paid") {
          const db = createAdminClient();
          const { data: etablissement, error: offreError } = await db
            .from("etablissements")
            .select("offre")
            .eq("id", etablissementId)
            .single();
          if (offreError) throw new Error(offreError.message);
          // Les mois offerts de l'offre s'ouvrent ici ; leur fin s'en déduit.
          const hasTrial = planTrial(etablissement.offre) !== undefined;
          await upsertSubscription(["offre"], {
            etablissement_id: etablissementId,
            stripe_customer_id:
              typeof session.customer === "string"
                ? session.customer
                : session.customer?.id,
            status: "active",
            ...(hasTrial && { trial_started_at: new Date().toISOString() }),
          });
          if (session.metadata.square === "1") {
            const { error } = await db
              .from("etablissements")
              .update({ payment_provider: "square" })
              .eq("id", etablissementId)
              .is("payment_provider", null);
            if (error) throw new Error(error.message);
          }
        }
        break;
      }

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (etablissementId && subscriptionId) {
        const subscription =
          await stripe.subscriptions.retrieve(subscriptionId);
        await upsertSubscription(parseProducts(session.metadata), {
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
        // Les webhooks Stripe n'arrivent pas forcément dans l'ordre : on relit
        // le statut courant plutôt que celui (potentiellement périmé) porté par
        // l'événement, pour ne pas régresser un statut déjà à jour.
        const status =
          event.type === "customer.subscription.deleted"
            ? "canceled"
            : (await stripe.subscriptions.retrieve(subscription.id)).status;
        await upsertSubscription(parseProducts(subscription.metadata), {
          etablissement_id: etablissementId,
          stripe_customer_id:
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.id,
          stripe_subscription_id: subscription.id,
          status,
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
