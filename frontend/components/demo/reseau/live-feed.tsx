import type { NetworkFixture } from "@/lib/demo/reseau/data";
import { basketParts, formatAgo, formatCents } from "@/lib/demo/reseau/format";
import type { SimOrder } from "@/lib/demo/reseau/simulation";

/**
 * Les commandes du réseau à mesure qu'elles arrivent, la plus récente en
 * haut. Le restaurant mène la ligne — c'est lui que le siège cherche ; le
 * numéro, propre à chaque comptoir, passe en second ; « au comptoir » ouvre
 * le panier quand la commande s'y paie (« à régler », puis « réglée », en plein
 * écran). En hauteur contrainte, les
 * lignes se partagent le cadre.
 */
export function LiveFeed({
  fixture,
  orders,
  now,
  opensAt,
  onSelect,
}: {
  fixture: NetworkFixture;
  orders: SimOrder[];
  now: number;
  /** Première ouverture du jour, pour le fil encore vide ; null si un restaurant est déjà ouvert. */
  opensAt: string | null;
  onSelect: (index: number) => void;
}) {
  if (!orders.length) {
    return (
      <p className="px-5 py-10 text-center text-sm text-muted">
        {opensAt ? `Aucune commande pour l’instant. Premières ouvertures à ${opensAt}.` : "En attente des premières commandes."}
      </p>
    );
  }
  return (
    <ol className="flex flex-col lg:h-full">
      {orders.map((order) => {
        const restaurant = fixture.restaurants[order.restaurant];
        return (
          <li
            key={`${restaurant.id}-${order.number}`}
            data-row
            className={`flex flex-col justify-center border-b border-hairline last:border-b-0 lg:max-h-24 lg:flex-1 ${
              now - order.createdAt < fixture.display.rippleSeconds ? "reseau-enter" : ""
            }`}
          >
            <button
              type="button"
              data-row-content
              onClick={() => onSelect(order.restaurant)}
              className="flex w-full flex-col gap-0.5 px-5 py-2.5 text-left transition-colors hover:bg-foreground/[0.03]"
            >
              <span className="flex w-full items-baseline gap-3">
                <span className="flex min-w-0 flex-1 items-baseline text-[0.9375rem]">
                  <span className="truncate font-medium">{restaurant.name}</span>
                  <span aria-hidden className="mx-1.5 shrink-0 text-faint">·</span>
                  <span className="shrink-0 text-faint tabular-nums">N°&nbsp;{order.number}</span>
                </span>
                <span className="shrink-0 text-[0.9375rem] font-medium tabular-nums">
                  {formatCents(order.total)}
                </span>
              </span>
              <span className="flex w-full items-baseline gap-4">
                <span className="flex min-w-0 flex-1 items-baseline text-[0.875rem] text-muted">
                  {!order.online && (
                    <span className="mr-2 shrink-0 self-center rounded bg-foreground/[0.08] px-1.5 py-px text-xs text-foreground/85">
                      <span className="hidden wall:inline">{order.paidAt <= now ? "réglée " : "à régler "}</span>au comptoir
                    </span>
                  )}
                  {/* Deux articles nommés en plein écran, un ailleurs ; le compte des autres ne se coupe jamais. */}
                  {[
                    { parts: basketParts(order.lines, 2), className: "hidden wall:flex" },
                    { parts: basketParts(order.lines, 1), className: "flex wall:hidden" },
                  ].map(({ parts, className }) => (
                    <span key={className} className={`min-w-0 items-baseline ${className}`}>
                      <span className="min-w-0 truncate">{parts.named}</span>
                      {parts.more && <span className="shrink-0 whitespace-nowrap">&nbsp;{parts.more}</span>}
                    </span>
                  ))}
                </span>
                <span className="shrink-0 text-[0.8125rem] text-faint tabular-nums">{formatAgo(now - order.createdAt)}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
