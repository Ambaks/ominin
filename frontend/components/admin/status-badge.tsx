import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/admin/constants";
import { STATUS_BADGE_CLASSES } from "@/lib/admin/status";
import type { LeadStatus, Priority } from "@/lib/admin/types";

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_BADGE_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/** Seule la priorité haute crie ; le reste reste discret. */
export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-hairline px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        priority === "high" ? "text-ember-3" : "text-faint"
      }`}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
