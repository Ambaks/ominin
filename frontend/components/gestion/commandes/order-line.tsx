import { Chip } from "@/components/gestion/ui";
import { PAYMENT_MODE_LABELS } from "@/lib/gestion/constants";
import { paidThroughSite } from "@/lib/gestion/selectors";
import type { Order, OrderItem } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";
import { CheckIcon } from "../icons";

/*
 * Briques des listes d'articles (addition, service, historique) : une ligne,
 * sa coche, et le règlement de la commande.
 */

/** L'or des quantités et des articles offerts, mêlé au texte : pur, il tombait sous 3:1 en thème clair. */
export const EMBER_INK = "text-[color-mix(in_srgb,var(--ember-1)_55%,var(--foreground))]";

export function CheckMark() {
  return <CheckIcon className="size-3.5 [stroke-width:3]" />;
}

export function LineLabel({
  line,
  quantity = line.quantity,
  settled = false,
}: {
  line: OrderItem;
  /** Part de la ligne représentée : l'addition se règle à l'unité. */
  quantity?: number;
  settled?: boolean;
}) {
  return (
    <span className={`min-w-0 text-g-body [overflow-wrap:anywhere] ${settled ? "text-muted" : ""}`}>
      {/* Au-delà d'un, la quantité se lit comme le plat, en gras : « 2× Menu
          Midi » ne se confond pas avec « 1× Menu Midi ». */}
      <span className={`tabular-nums ${quantity > 1 && !settled ? "font-semibold text-foreground" : "text-muted"}`}>
        {quantity}×
      </span>{" "}
      {line.name}
      {line.loyaltyPoints && (
        <span className={`ml-1.5 whitespace-nowrap rounded-full border border-hairline px-1.5 py-px text-g-axis font-semibold ${EMBER_INK}`}>
          Offert · {line.loyaltyPoints * quantity} pts
        </span>
      )}
    </span>
  );
}

/**
 * Les choix d'une ligne, lisibles d'un coup d'œil : ils disent souvent le plat
 * à apporter (« Plat : Pad Thaï Chicken »). `prices` à false, comme sur le
 * ticket de cuisine : un supplément ne se sert pas.
 */
export function LineOptions({ line, prices = true }: { line: OrderItem; prices?: boolean }) {
  return line.options?.map((option, index) => (
    <p key={index} className="text-g-label text-muted">
      {option.groupName}
      {" : "}
      {option.choiceName}
      {prices && option.supplement > 0 && ` (+${formatPrice(option.supplement)})`}
    </p>
  ));
}

/**
 * Comment des commandes réglées l'ont été : en ligne depuis la table, ou
 * encaissées par l'équipe (et par quoi, quand c'est un seul moyen) ; « Payée »
 * quand les deux se mêlent.
 */
export function PaymentChip({ orders }: { orders: Order[] }) {
  const online = orders.filter(paidThroughSite).length;
  const modes = [...new Set(orders.map((order) => order.paymentMode))];
  const label =
    online === orders.length
      ? "Payée en ligne"
      : online > 0
        ? "Payée"
        : modes.length === 1 && modes[0]
          ? `Encaissée · ${PAYMENT_MODE_LABELS[modes[0]].toLowerCase()}`
          : "Encaissée";
  return <Chip icon={<CheckIcon />}>{label}</Chip>;
}
