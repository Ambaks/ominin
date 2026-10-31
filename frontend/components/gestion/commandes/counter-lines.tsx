import { formatPrice } from "@/lib/menu/format";
import type { OrderItem } from "@/lib/gestion/types";
import { EMBER_INK } from "./order-line";

/*
 * Le contenu d'une commande numérotée, lu de loin pour vérifier le sac ou le
 * plateau : au comptoir (CounterCard) et au scan d'un code de retrait. Les
 * quantités en pastilles de même largeur, sur le bord de la carte — noms et
 * options partent tous du même bord —, au-delà de 1 elles ressortent ; un
 * article offert par la fidélité le dit.
 */

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
                ? `bg-[color-mix(in_srgb,var(--ember-1)_var(--g-chip-tint),transparent)] font-semibold ${EMBER_INK}`
                : "bg-surface-raised text-muted"
            }`}
          >
            {line.quantity}×
          </span>
          <div className="flex flex-col">
            <p className="min-w-0 text-base leading-snug [overflow-wrap:anywhere]">
              {line.name}
              {line.loyaltyPoints && (
                <span className={`ml-1.5 whitespace-nowrap rounded-full border border-hairline px-1.5 py-px text-g-axis font-semibold ${EMBER_INK}`}>
                  Offert · {line.loyaltyPoints * line.quantity} pts
                </span>
              )}
            </p>
            {line.options?.map((option, index) => (
              <p key={index} className="text-g-body text-muted">
                {option.groupName}
                {" : "}
                {/* Le choix et son supplément d'un bloc : passé à la ligne entier, pas
                    coupé au milieu (« Frites / épicées »), le supplément jamais seul. */}
                <span className="inline-block max-w-full">
                  <span className="text-foreground">{option.choiceName}</span>
                  {option.supplement > 0 && ` (+${formatPrice(option.supplement)})`}
                </span>
              </p>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
