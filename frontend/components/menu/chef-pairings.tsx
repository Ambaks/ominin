"use client";

import { useCart } from "@/lib/menu/cart";
import { formatPrice, lineName } from "@/lib/menu/format";
import { canSuggest, type Pairing } from "@/lib/menu/pairings";

function Spark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5 shrink-0">
      <path d="M8 0l1.8 6.2L16 8l-6.2 1.8L8 16l-1.8-6.2L0 8l6.2-1.8z" fill="currentColor" />
    </svg>
  );
}

export function ChefTag() {
  return (
    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ember-1">
      <Spark />
      Le combo parfait
      <span className="ml-auto text-[10px] font-semibold tracking-[0.08em] text-muted">IA</span>
    </p>
  );
}

export const chefCard = "flex flex-col gap-3 rounded-2xl border border-ember-1/30 bg-ember-1/10";

/**
 * Le bouton d'un accord, le même au panier et sur la feuille d'un plat :
 * cerné tant qu'il propose, plein une fois l'accord retenu. Jamais le dégradé
 * du bouton principal, qu'il ne doit pas concurrencer.
 */
export const suggestionButton = (on = false) =>
  `suggestion-cta min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold tabular-nums transition-[color,background-color,border-color,transform] active:scale-95 ${
    on ? "border-transparent bg-ember-1 text-background" : "border-ember-1/50 bg-ember-1/15 text-foreground"
  }`;

/** Une suggestion : sa photo, son nom, la raison du chef, et son bouton. */
export function SuggestionRow({
  image,
  title,
  why,
  children,
}: {
  image?: string;
  title: string;
  why: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element -- URL saisie par l'utilisateur, hors remotePatterns de next/image
        <img src={image} alt="" className="size-11 shrink-0 rounded-xl object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-medium leading-tight">{title}</p>
        <p className="suggestion-why mt-0.5 text-pretty text-xs leading-snug text-muted">{why}</p>
      </div>
      {children}
    </div>
  );
}

/** Ce qui se commande bien avec un plat qu'on compose, coché ou non par le client. */
export function useSheetPairings(itemId: string): Pairing[] {
  const { pairings, closed } = useCart();
  return (pairings?.[itemId] ?? []).filter(({ item }) => canSuggest(item, closed));
}

/**
 * Les accords d'un plat, épinglés au-dessus du bouton de la feuille, dans la
 * même carte qu'au panier : ils se voient sans faire défiler les options.
 */
export function SheetPairings({
  pairings,
  picked,
  onToggle,
}: {
  pairings: Pairing[];
  picked: ReadonlySet<string>;
  onToggle: (itemId: string) => void;
}) {
  return (
    <section aria-label="Le combo parfait" className={`sheet-pairings ${chefCard} p-3`}>
      <ChefTag />
      <ul className="flex flex-col gap-2.5">
        {pairings.map(({ item, why }) => {
          const on = picked.has(item.id);
          return (
            <li key={item.id}>
              <SuggestionRow image={item.image} title={lineName(item)} why={why}>
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={
                    on
                      ? `Ajouté avec le plat\u00a0: ${lineName(item)}`
                      : `Ajouter avec le plat\u00a0: ${lineName(item)}, ${formatPrice(item.price)}`
                  }
                  onClick={() => onToggle(item.id)}
                  className={suggestionButton(on)}
                >
                  {on ? "✓ Ajouté" : `+ ${formatPrice(item.price)}`}
                </button>
              </SuggestionRow>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
