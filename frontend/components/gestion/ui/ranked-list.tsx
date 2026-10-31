import type { CSSProperties } from "react";
import { ENTITY, type Entity } from "./entity";

export interface RankedItem {
  label: string;
  /** Valeur affichée (« ×14 », « 54 lignes · 702 € »). */
  value: string;
  /** Valeur mesurée, pour la part de la barre. */
  amount: number;
  /** Colonne de droite en retrait (« 1 440 € »), variante bar seulement. */
  meta?: string;
}

export function RankedList({
  items,
  entity = "orders",
  size = "slim",
  label,
}: {
  items: readonly RankedItem[];
  entity?: Entity;
  /** slim : rang + filet de 3 px ; bar : barre de 8 px à bouchon. */
  size?: "slim" | "bar";
  label?: string;
}) {
  const max = Math.max(...items.map((item) => item.amount), 1);
  return (
    <ol
      aria-label={label}
      className={`g-rank g-rank-${size} ${ENTITY[entity]} m-0 list-none p-0`}
      style={{ "--g-max": max } as CSSProperties}
    >
      {items.map((item, index) => (
        <li
          key={item.label}
          data-meta={item.meta ? "" : undefined}
          style={{ "--g-v": item.amount } as CSSProperties}
        >
          {size === "slim" && (
            <span className="text-g-meta text-muted tabular-nums">{index + 1}</span>
          )}
          <span className="truncate">{item.label}</span>
          <span className="whitespace-nowrap font-semibold tabular-nums">{item.value}</span>
          {item.meta && (
            <span className="whitespace-nowrap text-right text-muted tabular-nums">{item.meta}</span>
          )}
        </li>
      ))}
    </ol>
  );
}
