/*
 * Synchronise les produits/prix Stripe avec pricingSection, starterKit,
 * collectOffer (lib/landing-data.ts) et shopOffer (lib/shop-landing-data.ts) — les prix
 * affichés sur les sites sont la source de vérité, rien n'est dupliqué ici.
 * Idempotent :
 *  - lookup_key absent → produit + prix créés ;
 *  - montant identique → rien ;
 *  - montant différent → nouveau prix avec transfer_lookup_key (le checkout
 *    résout par lookup_key, il bascule donc immédiatement), ancien prix
 *    désactivé. Les abonnements en cours conservent leur ancien tarif.
 * Les routes /api/stripe/checkout retrouvent les prix par ces mêmes lookup_keys.
 *
 * Usage, depuis frontend/ :  npm run setup:stripe
 * Lit STRIPE_SECRET_KEY depuis ../backend/.env — la clé de TEST. Test et live
 * sont deux catalogues Stripe séparés : la production (clé live, sur Vercel)
 * ne voit rien de ce qui est créé ici. Pour la viser, passer la clé live dans
 * l'environnement, qui l'emporte sur le fichier :
 *   STRIPE_SECRET_KEY=sk_live_… npm run setup:stripe
 */

import Stripe from "stripe";
import { collectOffer, pricingSection, starterKit } from "../lib/landing-data";
import { shopOffer } from "../lib/shop-landing-data";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  throw new Error("STRIPE_SECRET_KEY manquante — renseigne backend/.env.");
}
const stripe = new Stripe(key);
// Dit d'emblée quel catalogue est visé : « déjà en place » en test ne dit rien
// de la production.
console.log(
  `Catalogue Stripe visé : ${key.includes("_live_") ? "LIVE (production)" : "TEST"}`
);

/** `monthly` distingue un abonnement d'un paiement unique (mise en place Shop). */
type Plan = { id: string; name: string; price: number; tagline: string; monthly: boolean };

const shopPlans: Plan[] = [
  { id: "shop_setup", name: `${shopOffer.name} — mise en place`, price: shopOffer.setupPrice, tagline: shopOffer.tagline, monthly: false },
  { id: "shop_monthly", name: `${shopOffer.name} — abonnement`, price: shopOffer.monthlyPrice, tagline: shopOffer.tagline, monthly: true },
];

// Une offre à commission n'a pas d'abonnement : aucun prix Stripe à créer,
// Ominin se rémunère sur l'application_fee des paiements en ligne.
const subscriptionPlans = pricingSection.plans.filter(
  (plan) => !plan.commission
);

// Commande de démarrage : Cachets, boîtier, livraison — paiements uniques.
const starterPlans: Plan[] = [
  starterKit.cachet,
  starterKit.omilink,
  starterKit.shipping,
].map(({ id, name, price, tagline }) => ({ id, name, price, tagline, monthly: false }));

const plans: Plan[] = [
  ...[...subscriptionPlans, collectOffer, { ...collectOffer.bundle }].map(
    ({ id, name, price, tagline }) => ({ id, name, price, tagline, monthly: true })
  ),
  ...starterPlans,
  // Ominin Shop reste « sur devis » tant que l'offre n'est pas publiée : aucun
  // tarif n'est créé, un prix à 0 € serait facturable par erreur.
  ...(shopOffer.published ? shopPlans : []),
];

const zeroPriced = plans.filter((plan) => plan.price <= 0);
if (zeroPriced.length > 0) {
  throw new Error(
    `Tarif à 0 € : ${zeroPriced.map((plan) => plan.id).join(", ")} — renseigne le prix avant de publier l'offre.`
  );
}

async function main() {
  const { data: existing } = await stripe.prices.list({
    lookup_keys: plans.map((plan) => plan.id),
    active: true,
  });
  const byLookup = new Map(existing.map((price) => [price.lookup_key, price]));

  for (const plan of plans) {
    // Arrondi : un tarif à centimes (1,50 €) ne doit pas donner 149,999…
    const target = Math.round(plan.price * 100);
    const current = byLookup.get(plan.id);
    // Un prix Stripe sans `recurring` est un paiement unique.
    const cadence = plan.monthly ? ({ recurring: { interval: "month" } } as const) : {};
    const suffix = plan.monthly ? pricingSection.perMonth : " une fois";

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
        ...cadence,
        lookup_key: plan.id,
        transfer_lookup_key: true,
      });
      await stripe.prices.update(current.id, { active: false });
      console.log(
        `↻ ${plan.name} : ${(current.unit_amount ?? 0) / 100} € → ${plan.price} €${suffix} (lookup_key=${plan.id} transféré, ancien prix archivé)`
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
      ...cadence,
      lookup_key: plan.id,
    });
    console.log(
      `+ ${plan.name} : ${plan.price} €${suffix} créé (lookup_key=${plan.id})`
    );
  }
  console.log("Stripe est aligné sur les prix de la landing.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
