"use client";

import "./soirees.css";
import { FloorPlan, type TableState } from "@/components/club/floor-plan";
import { TABLE_STATE_LABELS } from "@/lib/gestion/club-selectors";
import type { ClubTable, ClubZone } from "@/lib/club/types";

/** Une table à signaler sur le plan, le temps de son anneau. */
export type PlanPing = { id: string; table: ClubTable };

/*
 * Le plan d'une zone côté gestion : le dessin partagé avec la page du club,
 * et par-dessus, dans le même repère, les anneaux des tables réservées en
 * direct — le dessin partagé n'a pas à les connaître.
 */
export function NightPlan({
  zone,
  tables,
  states,
  selectedId,
  onSelect,
  describe,
  pings = [],
  onPingEnd,
}: {
  zone: ClubZone;
  tables: ClubTable[];
  states: Record<string, TableState>;
  selectedId?: string | null;
  onSelect: (table: ClubTable) => void;
  describe: (table: ClubTable, state: TableState) => string;
  pings?: PlanPing[];
  onPingEnd?: (id: string) => void;
}) {
  return (
    <div
      role="region"
      aria-label={`Plan ${zone.name}`}
      className="rounded-2xl border border-hairline bg-surface p-3 sm:p-5"
    >
      <div className="relative">
        <FloorPlan
          className="gestion-plan"
          layout={zone.layout}
          tables={tables}
          states={states}
          selectedId={selectedId}
          onSelect={onSelect}
          describe={describe}
        />
        {pings.length > 0 && (
          <svg
            viewBox={`0 0 ${zone.layout.w} ${zone.layout.h}`}
            className="gestion-plan-pings"
            aria-hidden
          >
            {pings.map((ping) => (
              <circle
                key={ping.id}
                className="plan-ping"
                cx={ping.table.x}
                cy={ping.table.y}
                r={28}
                onAnimationEnd={() => onPingEnd?.(ping.id)}
              />
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}

export function PlanLegend({ states }: { states: TableState[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
      {states.map((state) => (
        <li key={state} className="flex items-center gap-1.5">
          <span className="plan-legende" data-state={state} aria-hidden />
          {TABLE_STATE_LABELS[state]}
        </li>
      ))}
    </ul>
  );
}
