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
 * Test et live sont deux catalogues Stripe séparés : rien de ce qui est créé
 * dans l'un n'existe dans l'autre. D'où deux clés, deux variables, dans
 * ../backend/.env — et jamais de repli de l'une sur l'autre.
 *
 * Depuis frontend/ :
 *   npm run setup:stripe        → STRIPE_SECRET_KEY, le catalogue de TEST
 *   npm run setup:stripe:live   → STRIPE_SECRET_KEY_LIVE, la PRODUCTION
 *
 * STRIPE_SECRET_KEY reste volontairement la clé de test : c'est le fichier que
 * lisent aussi les scripts seed:*, et une clé live y serait un piège. Les deux
 * variables sont donc vérifiées — une clé live sous le nom de test, ou
 * l'inverse, arrête le script au lieu de viser le mauvais catalogue.
 */

import Stripe from "stripe";
import { collectOffer, pricingSection, starterKit } from "../lib/landing-data";
import { shopOffer } from "../lib/shop-landing-data";

const live = process.argv.includes("--live");
const variable = live ? "STRIPE_SECRET_KEY_LIVE" : "STRIPE_SECRET_KEY";
const key = process.env[variable];
if (!key) {
  throw new Error(`${variable} manquante — renseigne backend/.env.`);
}
// Le nom de la variable doit correspondre au mode de la clé : sans ce garde,
// une clé collée au mauvais endroit viserait le mauvais catalogue en silence.
// (Une clé restreinte rk_live_ est une clé live.)
if (key.includes("_live_") !== live) {
  throw new Error(
    live
      ? `${variable} n'est pas une clé live (sk_live_… ou rk_live_…).`
      : `${variable} est une clé LIVE. Cette variable doit rester la clé de test : backend/.env sert aussi aux scripts seed:*. Mets la clé live dans STRIPE_SECRET_KEY_LIVE et lance « npm run setup:stripe:live ».`
  );
}
const stripe = new Stripe(key);
// Dit d'emblée quel catalogue est visé : « déjà en place » en test ne dit rien
// de la production.
console.log(
  `Catalogue Stripe visé : ${live ? "LIVE (production)" : "TEST"}`
);

/** `monthly` distingue un abonnement d'un paiement unique (mise en place Shop). */
type Plan = { id: string; name: string; price: number; tagline: string; monthly: boolean };

const shopPlans: Plan[] = [
  { id: "shop_setup", name: `${shopOffer.name} — mise en place`, price: shopOffer.setupPrice, tagline: shopOffer.tagline, monthly: false },
  { id: "shop_monthly", name: `${shopOffer.name} — abonnement`, price: shopOffer.monthlyPrice, tagline: shopOffer.tagline, monthly: true },
];

// Commande de démarrage : Cachets, boîtier, livraison — paiements uniques.
const starterPlans: Plan[] = [
  starterKit.cachet,
  starterKit.omilink,
  starterKit.shipping,
].map(({ id, name, price, tagline }) => ({ id, name, price, tagline, monthly: false }));

// Toutes les offres ont un tarif mensuel, mois offerts compris : celui de
// Connect n'est facturé qu'à leur terme, et seulement si le chiffre
// d'affaires n'en a pas dispensé le restaurant.
const plans: Plan[] = [
  ...[...pricingSection.plans, collectOffer, { ...collectOffer.bundle }].map(
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
