import { formatPrice } from "@/lib/menu/format";
import type { OrderItem } from "@/lib/gestion/types";

/*
 * Le contenu d'une commande numérotée, lu de loin pour vérifier le sac ou le
 * plateau : au comptoir (CounterCard) et au scan d'un code de retrait. Les
 * quantités en pastilles de même largeur, sur le bord de la carte — noms et
 * options partent tous du même bord —, au-delà de 1 elles ressortent ; un
 * article offert par la fidélité le dit.
 */

/** L'or des quantités et des articles offerts, mêlé au texte : pur, il tombait sous 3:1 en thème clair. */
const EMBER_INK = "text-[color-mix(in_srgb,var(--ember-1)_55%,var(--foreground))]";

export function CounterLines({
  items,
  className,
}: {
  items: OrderItem[];
  /** L'espacement de la liste dans sa carte. */
  className: string;
}) {
  return (
    <ul className={`flex flex-col gap-2 border-t border-hairline px-5 ${className}`}>
      {items.map((line) => (
        <li key={line.id} className="grid grid-cols-[2.25rem_1fr] gap-x-2">
          <span
            className={`self-start rounded-md text-center text-base leading-snug tabular-nums ${
              line.quantity > 1
                ? `bg-ember-1/15 font-semibold ${EMBER_INK}`
                : "bg-surface-raised text-muted"
            }`}
          >
            {line.quantity}×
          </span>
          <div className="flex flex-col">
            <p className="text-base leading-snug">
              {line.name}
              {line.loyaltyPoints && (
                <span className={`ml-1.5 whitespace-nowrap rounded-full border border-ember-2/40 px-1.5 py-px text-[10px] font-semibold ${EMBER_INK}`}>
                  Offert · {line.loyaltyPoints * line.quantity} pts
                </span>
              )}
            </p>
            {line.options?.map((option, index) => (
              <p key={index} className="text-sm text-muted">
                {option.groupName}
                {"\u00a0: "}
                {/* Le choix et son supplément d'un bloc : passé à la ligne entier, pas
                    coupé au milieu (« Frites / épicées »), le supplément jamais seul. */}
                <span className="inline-block max-w-full">
                  <span className="text-foreground">{option.choiceName}</span>
                  {option.supplement > 0 && `\u00a0(+${formatPrice(option.supplement)})`}
                </span>
              </p>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
