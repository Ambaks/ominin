"use client";

import { XIcon } from "@/components/gestion/icons";
import { CATEGORY_LABELS } from "@/lib/admin/constants";
import { formatDay, formatRelative } from "@/lib/admin/format";
import type { LeadLite, TaskRow } from "@/lib/admin/types";
import { LeadStatusBadge } from "../status-badge";

/*
 * Carte compacte affichée au clic sur un marqueur : l'essentiel de la fiche
 * et les deux gestes du terrain — ouvrir, ou marquer visité directement.
 */
export function MapLeadCard({
  lead,
  nextTask,
  onOpen,
  onVisited,
  onClose,
}: {
  lead: LeadLite;
  nextTask: TaskRow | null;
  onOpen: () => void;
  onVisited: () => void;
  onClose: () => void;
}) {
  const nextAction = nextTask
    ? `${nextTask.title}${nextTask.dueAt ? ` · ${formatDay(nextTask.dueAt)}` : ""}`
    : lead.nextFollowUpAt
      ? `Relance · ${formatDay(lead.nextFollowUpAt)}`
      : null;

  return (
    <div className="w-full rounded-2xl border border-hairline bg-surface-raised p-4 shadow-lg lg:w-80">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-base font-medium">
            {lead.name}
          </p>
          <p className="truncate text-xs text-muted">
            {CATEGORY_LABELS[lead.category]}
            {lead.city ? ` · ${lead.city}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="shrink-0 rounded-full border border-hairline p-1.5 text-muted transition-colors hover:text-foreground"
        >
          <XIcon className="size-3" />
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <LeadStatusBadge status={lead.status} />
        <span className="text-xs text-faint">
          {lead.lastContactAt
            ? `Contact ${formatRelative(lead.lastContactAt)}`
            : "Jamais contacté"}
        </span>
      </div>

      {(nextAction || lead.ownerName) && (
        <div className="mt-2 flex flex-col gap-0.5 text-xs text-muted">
          {nextAction && <p className="truncate">→ {nextAction}</p>}
          {lead.ownerName && <p className="truncate">{lead.ownerName}</p>}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="ember-gradient flex-1 rounded-full px-4 py-2 text-sm font-semibold text-background"
        >
          Ouvrir la fiche
        </button>
        <button
          type="button"
          onClick={onVisited}
          className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
        >
          Visité
        </button>
      </div>
    </div>
  );
}
