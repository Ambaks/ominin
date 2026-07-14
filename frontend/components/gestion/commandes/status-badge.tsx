import { ORDER_STATUS_LABELS } from "@/lib/gestion/constants";
import type { OrderStatus } from "@/lib/gestion/types";

const STATUS_CLASSES: Record<OrderStatus, string> = {
  en_attente: "border-ember-1/40 bg-ember-1/10 text-ember-1",
  en_preparation: "border-ember-2/40 bg-ember-2/10 text-ember-2",
  prete: "ember-text border-ember-2/35 bg-background/60",
  servie: "border-hairline bg-surface text-muted",
  payee: "border-hairline bg-surface text-faint",
  annulee: "border-ember-3/40 bg-ember-3/10 text-ember-3",
  retiree: "border-hairline bg-surface text-faint",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_CLASSES[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
