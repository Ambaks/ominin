import type { OrderItem } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu-data";

/* Briques des listes d'articles (addition, service) : une ligne et sa coche. */

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
  settled = false,
}: {
  line: OrderItem;
  settled?: boolean;
}) {
  return (
    <span className={`text-sm ${settled ? "line-through" : ""}`}>
      <span className="tabular-nums text-muted">{line.quantity}×</span>{" "}
      {line.name}
    </span>
  );
}

export function LineOptions({ line }: { line: OrderItem }) {
  return line.options?.map((option, index) => (
    <p key={index} className="text-xs text-faint">
      {option.groupName} : {option.choiceName}
      {option.supplement > 0 && ` (+${formatPrice(option.supplement)})`}
    </p>
  ));
}
