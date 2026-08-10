import { CheckIcon, ExternalLinkIcon } from "@/components/gestion/icons";
import type { Product } from "@/lib/products";

/*
 * Carte produit du catalogue Ominin, partagée par l'espace de gestion et
 * l'espace clipper. Purement présentationnelle : l'action (activer, changer
 * d'offre, ouvrir la page produit) est fournie par l'appelant, qui seul
 * connaît les droits de l'utilisateur.
 */

export const cardClass =
  "flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5 lg:p-6";
export const eyebrowClass =
  "text-[11px] font-semibold uppercase tracking-wider text-faint";
export const productLinkClass =
  "flex items-center gap-1.5 self-start rounded-full border border-hairline px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-ember-2/40 hover:text-foreground";

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-full border border-ember-2/35 bg-ember-2/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-2">
      {children}
    </span>
  );
}

export function FeatureList({ items }: { items: string[] }) {
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

/** Lien vers la page publique du produit, ouvert hors de l'espace. */
export function DiscoverLink({ product }: { product: Product }) {
  return (
    <a
      href={product.href}
      target="_blank"
      rel="noopener"
      className={productLinkClass}
    >
      <ExternalLinkIcon className="size-3.5" />
      Découvrir {product.name}
    </a>
  );
}

export function ProductCard({
  product,
  badge,
  children,
}: {
  product: Product;
  badge?: React.ReactNode;
  /** Action de la carte, rendue en pied. */
  children?: React.ReactNode;
}) {
  return (
    <article className={cardClass}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={eyebrowClass}>{product.eyebrow}</p>
          <h3 className="font-display text-xl font-medium">{product.name}</h3>
        </div>
        {badge}
      </div>
      <p className="text-sm text-muted">{product.tagline}</p>
      <div>
        <p className="font-display text-2xl font-medium">
          {product.price}
          {product.priceUnit && (
            <span className="text-sm text-faint">{product.priceUnit}</span>
          )}
        </p>
        {product.priceNote && (
          <p className="mt-1 text-sm text-muted">{product.priceNote}</p>
        )}
      </div>
      {product.featuresLabel && (
        <p className="text-xs font-medium text-faint">{product.featuresLabel}</p>
      )}
      <FeatureList items={product.features} />
      {children}
    </article>
  );
}
