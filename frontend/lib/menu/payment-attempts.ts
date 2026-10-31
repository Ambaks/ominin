import type Stripe from "stripe";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** Une valeur absente n'efface pas ce que la tentative sait déjà. */
export type PaymentCard = {
  card_brand?: string | null;
  card_funding?: string | null;
  card_country?: string | null;
  card_wallet?: string | null;
  three_ds?: string | null;
};

const known = (value: string | null | undefined) =>
  value && !value.toUpperCase().startsWith("UNKNOWN") ? value.toLowerCase() : null;

export function stripeChargeCard(
  card: Stripe.Charge.PaymentMethodDetails.Card
): PaymentCard {
  return {
    card_brand: known(card.brand),
    card_funding: known(card.funding),
    card_country: card.country,
    card_wallet: card.wallet?.type ?? null,
    three_ds: card.three_d_secure ? card.three_d_secure.result : "none",
  };
}

/** Sans débit, pas de résultat 3-D Secure à lire : seul son échec se voit. */
export function stripeRefusedCard(intent: Stripe.PaymentIntent): PaymentCard {
  const error = intent.last_payment_error;
  const card = error?.payment_method?.card;
  return {
    ...(card && {
      card_brand: known(card.brand),
      card_funding: known(card.funding),
      card_country: card.country,
      card_wallet: card.wallet?.type ?? null,
    }),
    three_ds: error?.code === "payment_intent_authentication_failure" ? "failed" : null,
  };
}

export function squareCard(
  details: { card?: { card_brand?: string; card_type?: string } } | undefined
): PaymentCard {
  const brand = known(details?.card?.card_brand);
  return {
    card_brand: brand === "american_express" ? "amex" : brand,
    card_funding: known(details?.card?.card_type),
  };
}

/**
 * Inscrit la carte sur la tentative en cours. À appeler AVANT de clore la
 * commande : la clôture délie la tentative (journal, 20261031000500). Une
 * mesure ne fait jamais échouer un paiement : l'erreur est journalisée, pas
 * levée.
 */
export async function recordPaymentCard(
  admin: Admin,
  orderId: string,
  card: PaymentCard
): Promise<void> {
  const { error } = await admin
    .from("online_payment_attempts")
    .update(card)
    .eq("order_id", orderId);
  if (error) {
    console.error("[paiement] carte non journalisée", { orderId, message: error.message });
  }
}

/**
 * Note qu'un encaisseur a refusé le paiement de la tentative en cours : une
 * tentative écartée ensuite se lit « échouée », pas « expirée » (voir le
 * journal, 20261031000500). Une mesure ne fait jamais échouer un paiement :
 * l'erreur est journalisée, pas levée.
 */
export async function markPaymentRefused(
  admin: Admin,
  orderId: string,
  card?: PaymentCard
): Promise<void> {
  const { error } = await admin
    .from("online_payment_attempts")
    .update({ ...card, refused: true })
    .eq("order_id", orderId);
  if (error) {
    console.error("[paiement] refus non journalisé", { orderId, message: error.message });
  }
}
