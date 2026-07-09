/*
 * Synchronise les produits/prix Stripe avec pricingSection
 * (lib/landing-data.ts) — les prix affichés sur la landing sont la source de
 * vérité, rien n'est dupliqué ici. Idempotent :
 *  - lookup_key absent → produit + prix créés ;
 *  - montant identique → rien ;
 *  - montant différent → nouveau prix avec transfer_lookup_key (le checkout
 *    résout par lookup_key, il bascule donc immédiatement), ancien prix
 *    désactivé. Les abonnements en cours conservent leur ancien tarif.
 * La route /api/stripe/checkout retrouve les prix par ces mêmes lookup_keys.
 *
 * Usage, depuis frontend/ :  npm run setup:stripe
 * Lit STRIPE_SECRET_KEY depuis ../backend/.env.
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
  const byLookup = new Map(existing.map((price) => [price.lookup_key, price]));

  for (const plan of pricingSection.plans) {
    const target = plan.price * 100;
    const current = byLookup.get(plan.id);

    if (current && current.unit_amount === target) {
      console.log(`✓ ${plan.name} : ${plan.price} € déjà en place (lookup_key=${plan.id})`);
      continue;
    }

    if (current) {
      // Le montant a changé sur la landing : nouveau prix sur le même
      // produit, lookup_key transféré, ancien prix archivé.
      await stripe.prices.create({
        product:
          typeof current.product === "string"
            ? current.product
            : current.product.id,
        currency: "eur",
        unit_amount: target,
        recurring: { interval: "month" },
        lookup_key: plan.id,
        transfer_lookup_key: true,
      });
      await stripe.prices.update(current.id, { active: false });
      console.log(
        `↻ ${plan.name} : ${(current.unit_amount ?? 0) / 100} € → ${plan.price} €${pricingSection.perMonth} (lookup_key=${plan.id} transféré, ancien prix archivé)`
      );
      continue;
    }

    const product = await stripe.products.create({
      name: `Ominin ${plan.name}`,
      description: plan.tagline,
    });
    await stripe.prices.create({
      product: product.id,
      currency: "eur",
      unit_amount: target,
      recurring: { interval: "month" },
      lookup_key: plan.id,
    });
    console.log(
      `+ ${plan.name} : ${plan.price} €${pricingSection.perMonth} créé (lookup_key=${plan.id})`
    );
  }
  console.log("Stripe est aligné sur les prix de la landing.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
