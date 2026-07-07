import Stripe from "stripe";

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
