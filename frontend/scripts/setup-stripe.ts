/*
 * Crée dans Stripe les produits/prix des offres Ominin, à partir de
 * pricingSection (lib/landing-data.ts) — les prix affichés sur la landing
 * sont la source de vérité, rien n'est dupliqué ici. Idempotent : un prix
 * dont le lookup_key ('digital' | 'smart' | 'connect') existe déjà n'est
 * pas recréé. La route /api/stripe/checkout retrouve les prix par ces
 * mêmes lookup_keys.
 *
 * Usage, depuis frontend/ :  npm run setup:stripe
 * Lit STRIPE_SECRET_KEY depuis ../backend/.env (mode test : sk_test_…).
 */

import Stripe from "stripe";
import { pricingSection } from "../lib/landing-data";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  throw new Error("STRIPE_SECRET_KEY manquante — renseigne backend/.env.");
}
const stripe = new Stripe(key);

async function main() {
  const { data: existing } = await stripe.prices.list({
    lookup_keys: pricingSection.plans.map((plan) => plan.id),
    active: true,
  });
  const present = new Set(existing.map((price) => price.lookup_key));

  for (const plan of pricingSection.plans) {
    if (present.has(plan.id)) {
      console.log(`✓ ${plan.name} : prix déjà en place (lookup_key=${plan.id})`);
      continue;
    }
    const product = await stripe.products.create({
      name: `Ominin ${plan.name}`,
      description: plan.tagline,
    });
    await stripe.prices.create({
      product: product.id,
      currency: "eur",
      unit_amount: plan.price * 100,
      recurring: { interval: "month" },
      lookup_key: plan.id,
    });
    console.log(
      `+ ${plan.name} : ${plan.price} €${pricingSection.perMonth} créé (lookup_key=${plan.id})`
    );
  }
  console.log("Stripe est prêt pour le checkout.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
