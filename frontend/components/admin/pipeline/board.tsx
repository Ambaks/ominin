"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useRunMutation } from "@/components/ui/toast";
import * as api from "@/lib/admin/api";
import { useAdminBasePath } from "@/lib/admin/base-path";
import {
  PIPELINE_COLUMNS,
  PIPELINE_COLUMN_CAP,
  PIPELINE_RAIL_COLUMNS,
  type PipelineColumn,
} from "@/lib/admin/constants";
import { formatRelative } from "@/lib/admin/format";
import { selectNextTaskByLead } from "@/lib/admin/selectors";
import { STATUS_DOT_CLASSES } from "@/lib/admin/status";
import { setFilters } from "@/lib/admin/filters";
import { useAdmin } from "@/lib/admin/store";
import type { LeadLite, LeadStatus, TaskRow } from "@/lib/admin/types";
import { StatusMenu } from "../lead/status-menu";
import { useBoardDrag } from "./use-board-drag";

/*
 * Kanban du pipeline. Optimisme local : pendingMoves rend la carte dans sa
 * colonne cible dès le drop ; le store reste l'autorité — en cas d'échec de
 * l'écriture, retirer l'entrée suffit à faire revenir la carte (le toast de
 * useRunMutation explique pourquoi).
 */

const ALL_COLUMNS = [...PIPELINE_COLUMNS, ...PIPELINE_RAIL_COLUMNS];

function LeadCard({
  lead,
  nextTask,
  dragging,
  onOpen,
  onMenu,
  handlers,
}: {
  lead: LeadLite;
  nextTask: TaskRow | null;
  dragging: boolean;
  onOpen: () => void;
  onMenu: () => void;
  handlers: { onPointerDown: (event: React.PointerEvent) => void };
}) {
  const nowIso = new Date().toISOString();
  return (
    <div
      {...handlers}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen();
      }}
      style={{ touchAction: "pan-y" }}
      className={`cursor-grab select-none rounded-2xl border border-hairline bg-surface p-3 transition-opacity ${
        dragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-medium">{lead.name}</p>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onMenu();
          }}
          aria-label={`Déplacer « ${lead.name} »`}
          className="shrink-0 rounded-full px-1.5 text-muted transition-colors hover:text-foreground"
        >
          …
        </button>
      </div>
      <p className="truncate text-xs text-faint">
        {lead.city ?? "—"}
        {lead.ownerName ? ` · ${lead.ownerName}` : ""}
      </p>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
        {lead.status === "new" && (
          <span
            className={`size-2 shrink-0 rounded-full ${STATUS_DOT_CLASSES.new}`}
            title="Nouveau"
          />
        )}
        {lead.priority === "high" && (
          <span
            className="size-2 shrink-0 rounded-full bg-ember-3"
            title="Priorité haute"
          />
        )}
        <span className="truncate">
          {lead.lastContactAt
            ? `Contact ${formatRelative(lead.lastContactAt)}`
            : "Jamais contacté"}
        </span>
      </div>
      {nextTask && (
        <p
          className={`mt-1.5 truncate text-xs ${
            nextTask.dueAt && nextTask.dueAt < nowIso
              ? "font-semibold text-ember-3"
              : "text-muted"
          }`}
        >
          → {nextTask.title}
          {nextTask.dueAt ? ` · ${formatRelative(nextTask.dueAt)}` : ""}
        </p>
      )}
    </div>
  );
}

export function PipelineBoard() {
  const state = useAdmin();
  const run = useRunMutation();
  const router = useRouter();
  const { basePath, localPath } = useAdminBasePath();
  const [pendingMoves, setPendingMoves] = useState<Map<string, LeadStatus>>(
    new Map()
  );
  const [menuFor, setMenuFor] = useState<LeadLite | null>(null);

  const nextTaskByLead = useMemo(
    () => selectNextTaskByLead(state?.tasks ?? []),
    [state?.tasks]
  );

  const onDrop = (restaurantId: string, columnId: string) => {
    const column = ALL_COLUMNS.find((c) => c.id === columnId);
    const lead = state?.leads.find((l) => l.restaurantId === restaurantId);
    if (!column || !lead || column.statuses.includes(lead.status)) return;
    setPendingMoves((current) =>
      new Map(current).set(restaurantId, column.dropStatus)
    );
    void run(() => api.updateLeadStatus(restaurantId, column.dropStatus)).finally(
      () =>
        setPendingMoves((current) => {
          const next = new Map(current);
          next.delete(restaurantId);
          return next;
        })
    );
  };

  const { drag, overColumn, cardHandlers, registerColumn, registerBoard, guardClick } =
    useBoardDrag(onDrop);

  const leads = state?.leads ?? [];
  const effectiveStatus = (lead: LeadLite): LeadStatus =>
    pendingMoves.get(lead.restaurantId) ?? lead.status;
  const byColumn = (column: PipelineColumn) =>
    leads
      .filter((lead) => column.statuses.includes(effectiveStatus(lead)))
      .sort((a, b) =>
        (a.nextFollowUpAt ?? "9999").localeCompare(b.nextFollowUpAt ?? "9999")
      );
  const draggedLead = drag
    ? (leads.find((lead) => lead.restaurantId === drag.restaurantId) ?? null)
    : null;

  const seeAll = (column: PipelineColumn) => {
    setFilters({ statuses: new Set(column.statuses) });
    router.push(`${basePath}/restaurants`);
  };

  return (
    <>
      <div
        ref={registerBoard}
        className="no-scrollbar -mx-5 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-5 pb-4 lg:mx-0 lg:snap-none lg:px-0"
      >
        {ALL_COLUMNS.map((column) => {
          const columnLeads = byColumn(column);
          const rail = PIPELINE_RAIL_COLUMNS.includes(column);
          return (
            <section
              key={column.id}
              ref={registerColumn(column.id)}
              className={`flex w-[85vw] shrink-0 snap-center flex-col gap-2 rounded-2xl border p-2 transition-colors lg:snap-align-none ${
                rail ? "lg:w-56" : "lg:w-68"
              } ${
                overColumn === column.id
                  ? "border-ember-2/60 bg-surface-raised"
                  : "border-hairline bg-surface/40"
              }`}
            >
              <header className="flex items-baseline justify-between px-1.5 pt-1">
                <h2
                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                    rail ? "text-faint" : "text-muted"
                  }`}
                >
                  {column.label}
                </h2>
                <span className="text-xs tabular-nums text-faint">
                  {columnLeads.length}
                </span>
              </header>
              <div className="flex min-h-16 flex-col gap-2">
                {columnLeads.slice(0, PIPELINE_COLUMN_CAP).map((lead) => (
                  <LeadCard
                    key={lead.restaurantId}
                    lead={lead}
                    nextTask={nextTaskByLead.get(lead.restaurantId) ?? null}
                    dragging={drag?.restaurantId === lead.restaurantId}
                    onOpen={guardClick(() =>
                      router.push(
                        `${basePath}${localPath}?lead=${lead.restaurantId}`
                      )
                    )}
                    onMenu={() => setMenuFor(lead)}
                    handlers={cardHandlers(lead.restaurantId)}
                  />
                ))}
                {columnLeads.length > PIPELINE_COLUMN_CAP && (
                  <button
                    type="button"
                    onClick={() => seeAll(column)}
                    className="rounded-xl border border-dashed border-hairline px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground"
                  >
                    Voir les {columnLeads.length - PIPELINE_COLUMN_CAP} autres
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {drag && draggedLead && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rotate-2"
          style={{ left: drag.x, top: drag.y, width: drag.width }}
        >
          <div className="rounded-2xl border border-ember-2/60 bg-surface-raised p-3 shadow-2xl">
            <p className="truncate text-sm font-medium">{draggedLead.name}</p>
            <p className="truncate text-xs text-faint">
              {draggedLead.city ?? ""}
            </p>
          </div>
        </div>
      )}

      {menuFor && (
        <StatusMenu
          restaurantId={menuFor.restaurantId}
          current={menuFor.status}
          onClose={() => setMenuFor(null)}
        />
      )}
    </>
  );
}
