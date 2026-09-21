"use client";

import { useEffect, useState } from "react";
import { QuoteBuilder } from "@/components/quote/quote-builder";
import { startCheckout } from "@/lib/gestion/checkout";
import { SUBSCRIPTION_POLL_MS } from "@/lib/gestion/constants";
import { refreshSubscription } from "@/lib/gestion/store";
import type { Offre, Role } from "@/lib/gestion/types";
import { pricingSection, quotePage } from "@/lib/landing-data";
import { formatPrice } from "@/lib/menu-data";
import { collectProduct, offreProducts } from "@/lib/products";
import { quotePlan } from "@/lib/quote";

/*
 * Écran affiché à la place de l'espace de gestion tant qu'aucun produit
 * n'est actif. Une offre publiée s'ouvre par sa commande de démarrage : le
 * gérant retrouve son devis (Cachets selon ses tables, livraison,
 * branchements) et règle. Au retour de Stripe Checkout (?checkout=succes),
 * le webhook peut mettre quelques secondes à écrire en base : on relit le
 * statut périodiquement — dès qu'il passe actif, le shell réaffiche l'espace
 * et ce composant est démonté (l'intervalle est nettoyé).
 */
export function SubscriptionGate({
  role,
  offre,
  tableCount,
  feeDue,
}: {
  role: Role;
  /** Null ⇒ inscription par le click & collect : c'est lui qu'on active. */
  offre: Offre | null;
  tableCount: number;
  /** Mois offerts échus sans exonération : reste l'abonnement, le devis est réglé. */
  feeDue: boolean;
}) {
  // Jamais rendu côté serveur (le shell attend l'état) : window est sûr.
  const [confirming] = useState(() =>
    window.location.search.includes("checkout=succes")
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!confirming) return;
    const timer = setInterval(
      () => void refreshSubscription(),
      SUBSCRIPTION_POLL_MS
    );
    return () => clearInterval(timer);
  }, [confirming]);

  if (!confirming && !feeDue && offre && quotePlan(offre)) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
            {quotePage.gateEyebrow}
          </p>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            {quotePage.gateTitle}
          </h1>
          <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted">
            {role === "gerant" ? quotePage.gateSubtitle : quotePage.staffOnly}
          </p>
        </div>
        {role === "gerant" && (
          <QuoteBuilder
            locked
            initial={{
              plan: offre,
              tables: tableCount,
              omilink: false,
              square: false,
            }}
            submitLabel={quotePage.submit.gate}
            onSubmit={async ({ omilink, square }) => {
              // true ⇒ rien à régler (offre rouverte) : on relit l'état.
              if (await startCheckout(undefined, { omilink, square })) {
                await refreshSubscription();
              }
            }}
          />
        )}
      </div>
    );
  }

  const product = offre
    ? offreProducts.find((candidate) => candidate.id === offre)
    : collectProduct;
  // Les mois offerts terminés, c'est la mensualité du palier qu'on active —
  // pas le prix d'appel que la carte tarifaire met en avant.
  const plan = offre ? quotePlan(offre) : undefined;
  const monthly =
    feeDue && plan
      ? `${formatPrice(plan.price)}${pricingSection.perMonth}`
      : product && `${product.price}${product.priceUnit}`;

  const activate = async () => {
    setBusy(true);
    setError(null);
    try {
      // true ⇒ rien à régler (bascule sur la formule groupée, offre rouverte) :
      // aucune redirection, on relit l'état.
      if (await startCheckout(offre ? undefined : collectProduct.id)) {
        await refreshSubscription();
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Une erreur est survenue."
      );
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-2xl border border-hairline bg-surface p-8 text-center">
      <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
        {confirming
          ? "Paiement reçu"
          : feeDue
            ? quotePage.trialEnded.eyebrow
            : "Dernière étape"}
      </p>
      <h1 className="font-display text-2xl font-medium tracking-tight">
        {confirming ? "Activation en cours…" : "Activez votre abonnement"}
      </h1>
      {confirming ? (
        <p className="text-sm leading-relaxed text-muted">
          Merci ! Votre paiement est confirmé, votre espace s’ouvre dans
          quelques secondes.
        </p>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-muted">
            {feeDue ? quotePage.trialEnded.lead : "Votre établissement est prêt."}{" "}
            Il ne reste qu’à activer{" "}
            {product && (
              <>
                <span className="font-semibold text-foreground">
                  {product.name}
                </span>{" "}
                à{" "}
                <span className="font-semibold text-foreground">{monthly}</span>
              </>
            )}
            {feeDue ? "." : ", sans engagement."}
          </p>
          {role === "gerant" ? (
            <button
              type="button"
              onClick={() => void activate()}
              disabled={busy}
              className="ember-gradient rounded-full px-6 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
            >
              Activer mon abonnement
            </button>
          ) : (
            <p className="text-sm text-faint">
              Seul le gérant peut activer l’abonnement.
            </p>
          )}
          {error && <p className="text-sm text-ember-3">{error}</p>}
        </>
      )}
    </div>
  );
}
