"use client";

import { useEffect, useState } from "react";
import { ExternalLinkIcon } from "@/components/gestion/icons";
import {
  DiscoverLink,
  Pill,
  ProductCard,
  cardClass,
  eyebrowClass,
  productLinkClass,
} from "@/components/products/product-card";
import { startCheckout } from "@/lib/gestion/checkout";
import {
  ACTION_LABELS,
  ROLE_LABELS,
  ROLE_TAGLINES,
  SUBSCRIPTION_POLL_MS,
} from "@/lib/gestion/constants";
import { allowedActions } from "@/lib/gestion/permissions";
import { activeProducts } from "@/lib/gestion/selectors";
import { refreshSubscription, useGestion } from "@/lib/gestion/store";
import { contactEmail } from "@/lib/landing-data";
import {
  clipProduct,
  collectProduct,
  currentOffreProduct,
  offreProducts,
} from "@/lib/products";

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

  const { offre, slug } = state.etablissement;
  // Le catalogue ne se propose qu'à qui peut l'acheter : les membres de
  // l'équipe voient leur offre et leur rôle, pas les produits à vendre.
  const isGerant = state.role === "gerant";
  const products = activeProducts(state);
  const offreProduct = offre ? currentOffreProduct(offre) : undefined;
  const otherOffres = offreProducts.filter((product) => product.id !== offre);
  const changeOffreHref = `mailto:${contactEmail}?subject=${encodeURIComponent(
    `Changement d'offre — ${state.etablissement.name}`
  )}`;

  const activateCollect = async () => {
    setBusy(true);
    setError(null);
    try {
      // Client Connect : l'API bascule l'abonnement sur la formule groupée
      // sans repasser par un paiement — il ne reste qu'à relire l'état.
      if (await startCheckout(collectProduct.id)) {
        await refreshSubscription();
        setBusy(false);
      }
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
          {isGerant
            ? "Les produits Ominin actifs sur votre établissement, votre rôle, et le reste du catalogue."
            : "Les produits Ominin actifs sur votre établissement et votre rôle."}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {offreProduct && (
          <ProductCard product={offreProduct} badge={<Pill>Actif</Pill>} />
        )}

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
              {allowedActions(state.role, products).map((action) => (
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

        {collectActive && (
          <ProductCard product={collectProduct} badge={<Pill>Actif</Pill>}>
            <a
              href={`/collect/${slug}`}
              target="_blank"
              rel="noopener"
              className={productLinkClass}
            >
              <ExternalLinkIcon className="size-3.5" />
              Voir ma page de commande
            </a>
          </ProductCard>
        )}
      </div>

      {isGerant && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-lg font-medium">
              Autres produits Ominin
            </h2>
            <p className="mt-1 text-sm text-muted">
              Tout se pilote depuis ce même espace, sans nouvel outil à
              apprendre.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {!collectActive && (
              <ProductCard product={collectProduct}>
                {confirming ? (
                  <p className="text-sm text-muted">
                    Paiement reçu, activation en cours…
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => void activateCollect()}
                    disabled={busy}
                    className="ember-gradient self-start rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
                  >
                    Activer le click &amp; collect
                  </button>
                )}
                {error && <p className="text-sm text-ember-3">{error}</p>}
              </ProductCard>
            )}

            {otherOffres.map((product) => (
              <ProductCard key={product.id} product={product}>
                <a href={changeOffreHref} className={productLinkClass}>
                  Passer à {product.name}
                </a>
              </ProductCard>
            ))}

            <ProductCard product={clipProduct}>
              <DiscoverLink product={clipProduct} />
            </ProductCard>
          </div>
        </section>
      )}
    </div>
  );
}
