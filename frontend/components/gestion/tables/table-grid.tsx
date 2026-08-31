"use client";

import type { Table } from "@/lib/gestion/types";

export function TableGrid({
  tables,
  takenIds,
  activeOrderTableIds,
  servieTableIds,
  selected,
  selectable,
  onToggle,
  onEncaisser,
  serverNameFor,
}: {
  tables: Table[];
  takenIds: Set<string>;
  activeOrderTableIds: Set<string>;
  servieTableIds: Set<string>;
  selected: Set<string>;
  selectable: boolean;
  onToggle: (tableId: string) => void;
  onEncaisser?: (tableId: string) => void;
  /** Nom du serveur affecté, affiché sur la tuile (null : table libre). */
  serverNameFor?: (table: Table) => string | null;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {tables.map((table) => {
        const taken = takenIds.has(table.id);
        const isSelected = selected.has(table.id);
        const busy = activeOrderTableIds.has(table.id);
        const hasServie = servieTableIds.has(table.id) && !taken;
        const canEncaisser = hasServie && !!onEncaisser;
        const serverName = serverNameFor?.(table) ?? null;
        return (
          <button
            key={table.id}
            type="button"
            disabled={taken || (!selectable && !canEncaisser)}
            onClick={() =>
              canEncaisser ? onEncaisser(table.id) : onToggle(table.id)
            }
            className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-2xl border transition-all ${
              taken
                ? "border-hairline bg-background opacity-50"
                : canEncaisser
                  ? "border-ember-1/30 bg-ember-1/5 hover:border-ember-1/50"
                  : isSelected
                    ? "border-ember-2 bg-surface shadow-[0_0_18px_rgba(226,118,75,0.25)]"
                    : `border-hairline bg-surface ${selectable ? "hover:border-ember-2/40" : ""}`
            }`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">
              Table
            </span>
            <span className="font-display text-2xl font-medium">
              {table.number}
            </span>
            {taken && (
              <span className="text-[9px] font-semibold uppercase tracking-wider text-ember-2/70">
                Groupée
              </span>
            )}
            {canEncaisser && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ember-1">
                Encaisser
              </span>
            )}
            {serverName && !taken && !canEncaisser && (
              <span className="max-w-full truncate px-1.5 text-[9px] font-medium text-muted">
                {serverName}
              </span>
            )}
            {busy && !taken && !canEncaisser && (
              <span
                className="absolute right-2.5 top-2.5 size-2 rounded-full bg-ember-1"
                title="Commandes en cours"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
