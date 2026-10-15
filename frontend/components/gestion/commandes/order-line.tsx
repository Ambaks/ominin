import { PAYMENT_MODE_LABELS } from "@/lib/gestion/constants";
import { paidThroughSite } from "@/lib/gestion/selectors";
import type { Order, OrderItem } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";

/*
 * Briques des listes d'articles (addition, service, historique) : une ligne,
 * sa coche, et le règlement de la commande.
 */

export function CheckMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
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
    <span className={`text-sm ${settled ? "line-through" : ""}`}>
      {/* Au-delà d'un, la quantité se lit comme le plat, en gras : « 2× Menu
          Midi » ne se confond pas avec « 1× Menu Midi ». */}
      <span className={`tabular-nums ${quantity > 1 && !settled ? "font-semibold text-foreground" : "text-muted"}`}>
        {quantity}×
      </span>{" "}
      {line.name}
      {line.loyaltyPoints && (
        <span className="ml-1.5 whitespace-nowrap rounded-full border border-ember-2/40 px-1.5 py-px text-[10px] font-semibold text-ember-1">
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
    <p key={index} className="text-[13px] text-muted">
      {option.groupName}
      {"\u00a0: "}
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
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
        online > 0 ? "bg-ember-1/15 text-ember-1" : "bg-surface-raised text-muted"
      }`}
    >
      {label}
    </span>
  );
}
