"use client";

import type { Table } from "@/lib/gestion/types";

export function TableGrid({
  tables,
  takenIds,
  activeOrderTableIds,
  selected,
  selectable,
  onToggle,
}: {
  tables: Table[];
  takenIds: Set<string>;
  activeOrderTableIds: Set<string>;
  selected: Set<string>;
  selectable: boolean;
  onToggle: (tableId: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {tables.map((table) => {
        const taken = takenIds.has(table.id);
        const isSelected = selected.has(table.id);
        const busy = activeOrderTableIds.has(table.id);
        return (
          <button
            key={table.id}
            type="button"
            disabled={taken || !selectable}
            onClick={() => onToggle(table.id)}
            className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-2xl border transition-all ${
              taken
                ? "border-hairline bg-background opacity-50"
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
            {busy && !taken && (
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
