"use client";

import { useEffect, useState } from "react";
import { CheckIcon, ExternalLinkIcon } from "@/components/gestion/icons";
import {
  clipBrand,
  pricingSection as clipPricing,
  formatEuros,
} from "@/lib/clip-landing-data";
import { startCheckout } from "@/lib/gestion/checkout";
import {
  ACTION_LABELS,
  OFFRE_LABELS,
  ROLE_LABELS,
  ROLE_TAGLINES,
  SUBSCRIPTION_POLL_MS,
} from "@/lib/gestion/constants";
import { allowedActions } from "@/lib/gestion/permissions";
import { refreshSubscription, useGestion } from "@/lib/gestion/store";
import { collectOffer, contactEmail, pricingSection } from "@/lib/landing-data";
import { clipSiteUrl } from "@/lib/site";

const cardClass =
  "flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5 lg:p-6";
const eyebrowClass =
  "text-[11px] font-semibold uppercase tracking-wider text-faint";
const linkClass =
  "flex items-center gap-1.5 self-start rounded-full border border-hairline px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-ember-2/40 hover:text-foreground";

function ActivePill() {
  return (
    <span className="shrink-0 rounded-full border border-ember-2/35 bg-ember-2/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-2">
      Actif
    </span>
  );
}

function Price({ amount, note }: { amount: number; note: string }) {
  return (
    <p className="font-display text-2xl font-medium">
      {amount} €<span className="text-sm text-faint">{note}</span>
    </p>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((feature) => (
        <li key={feature} className="flex items-start gap-2 text-sm text-muted">
          <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-ember-1" />
          {feature}
        </li>
      ))}
    </ul>
  );
}

export default function ProduitsPage() {
  const state = useGestion();
  const collectActive = state?.collectSubscriptionStatus === "active";
  // Au retour de Stripe, le webhook peut mettre quelques secondes à écrire la
  // ligne d'abonnement : on relit jusqu'à ce que le click & collect s'active.
  const [confirming] = useState(
    () =>
      typeof window !== "undefined" &&
      window.location.search.includes("checkout=succes")
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!confirming || collectActive) return;
    const timer = setInterval(
      () => void refreshSubscription(),
      SUBSCRIPTION_POLL_MS
    );
    return () => clearInterval(timer);
  }, [confirming, collectActive]);

  if (!state) return null;

  const { offre } = state.etablissement;
  const isGerant = state.role === "gerant";
  const planIndex = pricingSection.plans.findIndex((plan) => plan.id === offre);
  const plan = pricingSection.plans[planIndex];
  // Les offres sont cumulatives : Smart contient Digital, Connect contient Smart.
  const included = pricingSection.plans
    .slice(0, planIndex + 1)
    .flatMap((candidate) => candidate.features);
  const otherPlans = pricingSection.plans.filter(
    (candidate) => candidate.id !== offre
  );
  const changeOffreHref = `mailto:${contactEmail}?subject=${encodeURIComponent(
    `Changement d'offre — ${state.etablissement.name}`
  )}`;

  const activateCollect = async () => {
    setBusy(true);
    setError(null);
    try {
      await startCheckout(collectOffer.id);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Une erreur est survenue."
      );
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
          Produits
        </h1>
        <p className="mt-1 text-sm text-muted">
          Votre offre, votre rôle, et les autres solutions Ominin.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={cardClass}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={eyebrowClass}>Votre offre</p>
              <h2 className="font-display text-xl font-medium">
                {OFFRE_LABELS[offre]}
              </h2>
            </div>
            <ActivePill />
          </div>
          {plan && (
            <>
              <p className="text-sm text-muted">{plan.tagline}</p>
              <Price amount={plan.price} note={pricingSection.perMonth} />
            </>
          )}
          <FeatureList items={included} />
        </section>

        <section className={cardClass}>
          <div>
            <p className={eyebrowClass}>Votre rôle</p>
            <h2 className="font-display text-xl font-medium">
              {ROLE_LABELS[state.role]}
            </h2>
          </div>
          <p className="text-sm text-muted">{ROLE_TAGLINES[state.role]}</p>
          <div>
            <p className="mb-2 text-xs font-medium text-faint">
              Ce que vous pouvez faire
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {allowedActions(state.role, offre).map((action) => (
                <li
                  key={action}
                  className="rounded-full border border-hairline bg-background/60 px-2.5 py-1 text-xs text-muted"
                >
                  {ACTION_LABELS[action]}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-lg font-medium">
            Autres produits Ominin
          </h2>
          <p className="mt-1 text-sm text-muted">
            Tout se pilote depuis ce même espace, sans nouvel outil à apprendre.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <article className={cardClass}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={eyebrowClass}>Vente à emporter</p>
                <h3 className="font-display text-xl font-medium">
                  {collectOffer.name}
                </h3>
              </div>
              {collectActive && <ActivePill />}
            </div>
            <p className="text-sm text-muted">{collectOffer.tagline}</p>
            <Price amount={collectOffer.price} note={pricingSection.perMonth} />
            <FeatureList items={collectOffer.features} />
            {collectActive ? (
              <a
                href={`/collect/${state.etablissement.slug}`}
                target="_blank"
                rel="noopener"
                className={linkClass}
              >
                <ExternalLinkIcon className="size-3.5" />
                Voir ma page de commande
              </a>
            ) : confirming ? (
              <p className="text-sm text-muted">
                Paiement reçu, activation en cours…
              </p>
            ) : isGerant ? (
              <button
                type="button"
                onClick={() => void activateCollect()}
                disabled={busy}
                className="ember-gradient self-start rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
              >
                Activer le click &amp; collect
              </button>
            ) : (
              <p className="text-sm text-faint">
                Seul le gérant peut activer un produit.
              </p>
            )}
            {error && <p className="text-sm text-ember-3">{error}</p>}
          </article>

          {otherPlans.map((candidate) => (
            <article key={candidate.id} className={cardClass}>
              <div>
                <p className={eyebrowClass}>Offre menu &amp; salle</p>
                <h3 className="font-display text-xl font-medium">
                  {candidate.name}
                </h3>
              </div>
              <p className="text-sm text-muted">{candidate.tagline}</p>
              <Price amount={candidate.price} note={pricingSection.perMonth} />
              <p className="text-xs font-medium text-faint">
                {candidate.featuresLabel}
              </p>
              <FeatureList items={candidate.features} />
              {isGerant && (
                <a href={changeOffreHref} className={linkClass}>
                  Passer à {candidate.name}
                </a>
              )}
            </article>
          ))}

          <article className={cardClass}>
            <div>
              <p className={eyebrowClass}>Réseaux sociaux</p>
              <h3 className="font-display text-xl font-medium">{clipBrand}</h3>
            </div>
            <p className="text-sm text-muted">
              Vos vidéos publiées sur TikTok, YouTube Shorts, Instagram et X —
              titres et descriptions rédigés pour vous, sur tous vos comptes à
              la fois.
            </p>
            <div>
              <p className="font-display text-2xl font-medium">
                {formatEuros(clipPricing.base.price)}
                <span className="text-sm text-faint">
                  {" "}
                  {clipPricing.base.priceNote}
                </span>
              </p>
              <p className="mt-1 text-sm text-muted">
                puis {formatEuros(clipPricing.subscription.price)}
                {clipPricing.subscription.priceNote}
              </p>
            </div>
            <a
              href={clipSiteUrl}
              target="_blank"
              rel="noopener"
              className={linkClass}
            >
              <ExternalLinkIcon className="size-3.5" />
              Découvrir {clipBrand}
            </a>
          </article>
        </div>
      </section>
    </div>
  );
}
