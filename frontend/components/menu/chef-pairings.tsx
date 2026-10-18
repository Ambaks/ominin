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

export function ChefTag({ children }: { children: string }) {
  return (
    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ember-1">
      <Spark />
      {children}
      <span className="ml-auto rounded-full border border-ember-1/35 px-2 py-0.5 text-[10px] font-medium tracking-[0.06em] text-muted">
        IA
      </span>
    </p>
  );
}

export const chefCard =
  "flex flex-col gap-3 rounded-2xl border border-ember-1/30 bg-ember-1/10 p-3.5";

/** Ce qui se commande bien avec un plat qu'on compose, coché ou non par le client. */
export function useSheetPairings(itemId: string): Pairing[] {
  const { pairings, closed } = useCart();
  return (pairings?.[itemId] ?? []).filter(({ item }) => canSuggest(item, closed));
}

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
    <section aria-label="Se marie bien avec" className={chefCard}>
      <ChefTag>Se marie bien avec</ChefTag>
      <div className="grid grid-cols-2 gap-2">
        {pairings.map(({ item, why }) => {
          const on = picked.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(item.id)}
              className={`relative flex flex-col overflow-hidden rounded-xl border bg-surface text-left transition-colors ${
                on ? "border-ember-1" : "border-hairline"
              }`}
            >
              <span
                aria-hidden
                className={`absolute right-1.5 top-1.5 z-10 flex size-6 items-center justify-center rounded-full text-sm font-bold ${
                  on ? "bg-ember-1 text-background" : "bg-background/60 text-foreground"
                }`}
              >
                {on ? "✓" : "+"}
              </span>
              {item.image && (
                // eslint-disable-next-line @next/next/no-img-element -- URL saisie par l'utilisateur, hors remotePatterns de next/image
                <img src={item.image} alt="" className="h-[4.5rem] w-full object-cover" />
              )}
              <span className="flex flex-col gap-0.5 p-2.5">
                <span className="text-[13px] font-semibold leading-tight">{lineName(item)}</span>
                <span className="text-[11px] leading-snug text-muted">{why}</span>
                <span className="font-display text-[13px] text-ember-1">{formatPrice(item.price)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
