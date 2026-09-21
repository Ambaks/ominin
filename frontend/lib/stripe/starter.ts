import type Stripe from "stripe";
import { starterKit } from "@/lib/landing-data";

/*
 * Commande de démarrage côté Stripe : Cachets imprimés (un par table),
 * boîtier Omilink en option, livraison. Paiements uniques, retrouvés par
 * lookup_key (créés par scripts/setup-stripe.ts) — aucun montant ici. Un
 * prix unique se pose aussi bien sur une session 'payment' que sur la
 * première facture d'une session 'subscription'.
 */

/** Marque metadata.starter des sessions qui portent une commande de démarrage. */
export const STARTER_FLAG = "1";

export class MissingPriceError extends Error {
  constructor(lookupKey: string) {
    super(
      `Tarif « ${lookupKey} » introuvable dans Stripe — exécuter npm run setup:stripe.`
    );
  }
}

export async function starterLineItems(
  stripe: Stripe,
  { tables, omilink }: { tables: number; omilink: boolean }
): Promise<Stripe.Checkout.SessionCreateParams.LineItem[]> {
  const wanted = [
    { key: starterKit.cachet.id, quantity: tables },
    ...(omilink ? [{ key: starterKit.omilink.id, quantity: 1 }] : []),
    { key: starterKit.shipping.id, quantity: 1 },
  ];
  const { data } = await stripe.prices.list({
    lookup_keys: wanted.map((item) => item.key),
    active: true,
  });
  return wanted.map(({ key, quantity }) => {
    const price = data.find((candidate) => candidate.lookup_key === key);
    if (!price) throw new MissingPriceError(key);
    return { price: price.id, quantity };
  });
}
