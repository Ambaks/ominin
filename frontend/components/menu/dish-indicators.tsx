import { DISH_TAG_LABELS } from "@/lib/menu/format";
import { type MenuItem } from "@/lib/menu-data";

/** Un piment dessiné, à la couleur du texte. */
function Chili({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden>
      <path d="M11.1 1.3c.5-.4 1.2-.3 1.5.2.2.3 0 .6-.3.8l-.6.4c.9.5 1.4 1.5 1.3 2.6-.3 3.6-3.5 7.8-8.9 9.5-.7.2-1.1-.6-.6-1.1 2.2-2.1 3.4-4.5 3.8-7.2.2-1.4 1.2-2.4 2.5-2.7l.3-1.4c.1-.4.5-.8 1-.9z" />
    </svg>
  );
}

/**
 * Ce que la carte imprime à côté du nom : le piment, de un à trois, puis
 * « Végétarien », « Fermenté ». Le thème les colore (.dish-tag[data-tag]).
 * `compact` : la version en petit des démos, dans un écran de téléphone.
 */
export function DishIndicators({ item, compact = false }: { item: MenuItem; compact?: boolean }) {
  const tags = item.tags ?? [];
  if (!item.spice && tags.length === 0) return null;
  const tag = `dish-tag inline-flex items-center gap-0.5 rounded-full border border-hairline font-semibold uppercase tracking-wider text-muted ${
    compact ? "px-1.5 py-px text-[10px]" : "min-h-6 px-2 text-[11px]"
  }`;
  return (
    <ul className={`dish-tags flex flex-wrap ${compact ? "mt-1 gap-1" : "gap-1.5"}`}>
      {item.spice && (
        <li data-tag="epice" className={tag}>
          {Array.from({ length: item.spice }, (_, i) => (
            <Chili key={i} className={compact ? "size-3" : "size-3.5"} />
          ))}
          <span className="sr-only">{`Épicé, ${item.spice} sur 3`}</span>
        </li>
      )}
      {tags.map((name) => (
        <li key={name} data-tag={name} className={tag}>
          {DISH_TAG_LABELS[name]}
        </li>
      ))}
    </ul>
  );
}
