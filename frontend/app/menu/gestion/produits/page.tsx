"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { AcceptTerms, useContract } from "@/components/legal/accept-terms";
import { CheckIcon, ExternalLinkIcon, ProductsIcon, TeamIcon } from "@/components/gestion/icons";
import {
  Chip,
  ErrorNotice,
  GlassButton,
  GlassFrame,
  Notice,
  Plate,
  SectionHeading,
} from "@/components/gestion/ui";
import { startCheckout } from "@/lib/gestion/checkout";
import {
  ACTION_LABELS,
  PICKUP_ROLE_TAGLINES,
  ROLE_TAGLINES,
  SUBSCRIPTION_POLL_MS,
} from "@/lib/gestion/constants";
import { allowedActions } from "@/lib/gestion/permissions";
import { isPickupShop, roleLabels } from "@/lib/gestion/selectors";
import { refreshSubscription, useGestion } from "@/lib/gestion/store";
import { collectOffer, contactEmail } from "@/lib/landing-data";
import {
  clipProduct,
  collectProduct,
  currentOffreProduct,
  offreProducts,
  type Product,
} from "@/lib/products";
import { collectSiteUrl } from "@/lib/site";

/** Un lien externe habillé en commande du kit (GlassButton ne sait pas ouvrir un onglet). */
const LINK_CLASS = "g-btn g-btn-secondary g-press self-start";

/*
 * Abonnement (ex-Produits) : l'offre active, le rôle de qui regarde et ce
 * qu'il peut faire ; pour le gérant, le reste du catalogue et l'activation
 * du click & collect (une vente : elle se signe).
 */
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
  const [error, setError] = useState<unknown>(null);
  // Le passage à la formule groupée change la mensualité : c'est une vente,
  // donc une signature. Sans elle la route refuse, et le bouton resterait
  // mort — c'est exactement ce qui était arrivé ici.
  const { contract, contractError } = useContract();
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!confirming || collectActive) return;
    const timer = setInterval(() => void refreshSubscription(), SUBSCRIPTION_POLL_MS);
    return () => clearInterval(timer);
  }, [confirming, collectActive]);

  if (!state) return null;

  const { offre, slug } = state.etablissement;
  // Le catalogue ne se propose qu'à qui peut l'acheter : les membres de
  // l'équipe voient leur offre et leur rôle, pas les produits à vendre.
  const isGerant = state.role === "gerant";
  // Sans service à table : ni « Marquer servie », ni les offres menu & salle.
  const pickupShop = isPickupShop(state);
  const offreProduct = offre ? currentOffreProduct(offre) : undefined;
  const otherOffres = offreProducts.filter((product) => product.id !== offre);
  const changeOffreHref = `mailto:${contactEmail}?subject=${encodeURIComponent(
    `Changement d'offre — ${state.etablissement.name}`
  )}`;
  const actions = allowedActions(state.role, state.features).filter(
    (action) => !(pickupShop && action === "orders.setStatus:servie")
  );

  const activateCollect = async () => {
    // Rien à signer tant que le contrat n'est pas chargé : le bouton est
    // désarmé, mais la garde tient même si l'écran change.
    if (!contract) return;
    setBusy(true);
    setError(null);
    try {
      // Client Connect : l'API bascule l'abonnement sur la formule groupée
      // sans repasser par un paiement — il ne reste qu'à relire l'état.
      if (await startCheckout(contract.versions, { product: collectProduct.id })) {
        await refreshSubscription();
        setBusy(false);
      }
    } catch (cause) {
      setError(cause);
      setBusy(false);
    }
  };

  // Une seule orchestration : le rang suit l'ordre des blocs de la page. Le
  // verre monte lui-même (prop `i`), le flou échantillonne l'aura pendant l'entrée.
  let block = 0;
  const rise = (className = "") => ({
    className: `g-rise ${className}`,
    style: { "--g-i": block++ } as CSSProperties,
  });

  return (
    <div className="flex flex-col gap-g-gap">
      <section {...rise()}>
        <SectionHeading
          level={1}
          title="Abonnement"
          sub={
            isGerant
              ? "Votre offre Ominin, votre rôle, et le reste du catalogue."
              : "Votre offre Ominin et ce que votre rôle vous permet."
          }
        />
      </section>

      {/* Une erreur ne monte pas en fondu : elle répond au geste, tout de suite. */}
      {isGerant && error != null && <ErrorNotice error={error} onRetry={() => void activateCollect()} />}
      {isGerant && error == null && contractError && !collectActive && !confirming && (
        <Notice title="Activation indisponible" text={contractError} />
      )}

      <section className="grid gap-g-gap lg:grid-cols-2">
        {offreProduct && (
          <GlassFrame
            entity="money"
            eyebrow={offreProduct.eyebrow}
            icon={<ProductsIcon />}
            i={block++}
            className="lg:self-start"
          >
            <Plate className="flex flex-col gap-4 p-5" data-visite="produits-offre">
              <ProductHead product={offreProduct} badge={<Chip icon={<CheckIcon />}>Active</Chip>} />
              <Features product={offreProduct} />
            </Plate>
          </GlassFrame>
        )}

        <GlassFrame entity="orders" eyebrow="Votre rôle" icon={<TeamIcon />} i={block++} className="lg:self-start">
          <Plate className="flex flex-col gap-4 p-5">
            <div>
              <h2 className="font-display text-g-h2">{roleLabels(state)[state.role]}</h2>
              <p className="mt-1 text-g-meta text-muted">
                {(pickupShop ? PICKUP_ROLE_TAGLINES : ROLE_TAGLINES)[state.role]}
              </p>
            </div>
            <div>
              <p className="mb-2 text-g-axis font-semibold uppercase tracking-wider text-muted">
                Ce que vous pouvez faire
              </p>
              <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                {actions.map((action) => (
                  <li key={action}>
                    <Chip>{ACTION_LABELS[action]}</Chip>
                  </li>
                ))}
              </ul>
            </div>
          </Plate>
        </GlassFrame>

        {collectActive && (
          <GlassFrame entity="money" eyebrow={collectProduct.eyebrow} icon={<ProductsIcon />} i={block++} className="lg:self-start">
            <Plate className="flex flex-col gap-4 p-5">
              <ProductHead product={collectProduct} badge={<Chip icon={<CheckIcon />}>Actif</Chip>} />
              <Features product={collectProduct} />
              <a
                href={`${collectSiteUrl}/${slug}`}
                target="_blank"
                rel="noopener"
                className={LINK_CLASS}
              >
                <ExternalLinkIcon />
                Voir ma page de commande
              </a>
            </Plate>
          </GlassFrame>
        )}
      </section>

      {isGerant && (
        <>
          <section {...rise()}>
            <SectionHeading
              title="Autres produits Ominin"
              sub="Tout se pilote depuis ce même espace, sans nouvel outil à apprendre."
            />
          </section>

          <section {...rise("grid gap-g-gap lg:grid-cols-2")}>
            {!collectActive && (
              <Plate className="flex flex-col gap-4 p-5" data-visite="produits-collect">
                <ProductHead level={3} product={collectProduct} />
                <Features product={collectProduct} />
                {confirming ? (
                  <p role="status">
                    <Chip>Paiement reçu, activation en cours…</Chip>
                  </p>
                ) : (
                  <>
                    <AcceptTerms
                      contract={contract}
                      checked={accepted}
                      onChange={setAccepted}
                      disabled={busy}
                      commitment={
                        <>
                          Je passe à{" "}
                          <span className="font-semibold">{collectOffer.bundle.name}</span> :{" "}
                          {collectOffer.bundle.menuCommission.percent}&nbsp;%{" "}
                          {collectOffer.bundle.menuCommission.basis} et{" "}
                          {collectOffer.commission.percent}&nbsp;%{" "}
                          {collectOffer.commission.basis}, sans abonnement mensuel.
                        </>
                      }
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <GlassButton
                        variant="primary"
                        onClick={() => void activateCollect()}
                        disabled={busy || !accepted || !contract}
                      >
                        {busy ? "Activation…" : "Activer le click & collect"}
                      </GlassButton>
                      {!accepted && contract && (
                        <span className="text-g-meta text-muted">
                          Cochez les conditions pour activer.
                        </span>
                      )}
                    </div>
                  </>
                )}
              </Plate>
            )}

            {!pickupShop &&
              otherOffres.map((product, index) => (
                <Plate key={product.id} className="flex flex-col gap-4 p-5">
                  <ProductHead level={3} product={product} />
                  <Features product={product} />
                  <a
                    href={changeOffreHref}
                    data-visite={index === 0 ? "produits-autres" : undefined}
                    title="Ouvre un email prêt à nous envoyer"
                    className={LINK_CLASS}
                  >
                    Passer à {product.name}
                  </a>
                </Plate>
              ))}

            <Plate className="flex flex-col gap-4 p-5">
              <ProductHead level={3} product={clipProduct} />
              <Features product={clipProduct} />
              <a href={clipProduct.href} target="_blank" rel="noopener" className={LINK_CLASS}>
                <ExternalLinkIcon />
                Découvrir {clipProduct.name}
              </a>
            </Plate>
          </section>
        </>
      )}
    </div>
  );
}

function ProductHead({
  product,
  badge,
  level = 2,
}: {
  product: Product;
  badge?: ReactNode;
  /** Titre de la page d'un produit actif, ou sous « Autres produits ». */
  level?: 2 | 3;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {!badge && (
            <p className="text-g-axis font-semibold uppercase tracking-wider text-muted">
              {product.eyebrow}
            </p>
          )}
          <Heading className="font-display text-g-h2">{product.name}</Heading>
        </div>
        {badge}
      </div>
      <p className="text-g-meta text-muted">{product.tagline}</p>
      <div>
        <p className="text-g-kpi tabular-nums">
          {product.price}
          {product.priceUnit && (
            <span className="text-g-label font-normal tracking-normal text-muted">{product.priceUnit}</span>
          )}
        </p>
        {product.priceNote && <p className="mt-1 text-g-meta text-muted">{product.priceNote}</p>}
      </div>
    </div>
  );
}

function Features({ product }: { product: Product }) {
  return (
    <div className="flex flex-col gap-2">
      {product.featuresLabel && (
        <p className="text-g-meta font-medium text-muted">{product.featuresLabel}</p>
      )}
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {product.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-g-label text-muted">
            <CheckIcon className="mt-0.5 size-4 shrink-0 text-ember-1" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
