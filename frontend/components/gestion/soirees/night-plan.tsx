"use client";

import "./soirees.css";
import { useEffect, useId, useRef, useState } from "react";
import { FloorPlan, type TableState } from "@/components/club/floor-plan";
import { TABLE_STATE_LABELS } from "@/lib/gestion/club-selectors";
import type { ClubTable, ClubZone } from "@/lib/club/types";

/** Une table à signaler sur le plan, le temps de son halo. */
export type PlanPing = { id: string; table: ClubTable };

type Vue = "lisible" | "ensemble";

/** Rayon de la pastille des places, en unités du plan : son chiffre de 10 y tient lisible. */
const PLACES_BADGE = 10;

/*
 * Le plan d'une zone côté gestion : le dessin partagé avec la page du club,
 * et par-dessus, dans le même repère, le halo des tables payées en direct —
 * le dessin partagé n'a pas à les connaître. Sur un téléphone, le plan
 * s'affiche à son échelle et défile au doigt ; « Vue d'ensemble » le ramène
 * dans la largeur.
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
  const [vue, setVue] = useState<Vue>("lisible");
  const cadre = useRef<HTMLDivElement>(null);
  const glow = useId();

  // Une table choisie hors du cadre (depuis une annonce) y est ramenée.
  useEffect(() => {
    if (!selectedId) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    cadre.current
      ?.querySelector("[data-selected]")
      ?.scrollIntoView({ block: "nearest", inline: "center", behavior: still ? "auto" : "smooth" });
  }, [selectedId, zone.id]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <p className="text-xs text-muted">
          {vue === "lisible" ? "Faites glisser le plan pour voir toute la zone." : "Toute la zone."}
        </p>
        <button
          type="button"
          onClick={() => setVue(vue === "lisible" ? "ensemble" : "lisible")}
          aria-pressed={vue === "ensemble"}
          className="flex min-h-11 shrink-0 items-center rounded-full border border-hairline px-4 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
        >
          {vue === "lisible" ? "Vue d'ensemble" : "Agrandir"}
        </button>
      </div>
      <div
        ref={cadre}
        data-vue={vue}
        className="plan-cadre rounded-2xl border border-hairline bg-surface p-3 sm:p-5"
        style={{ "--plan-w": `${zone.layout.w}px` } as React.CSSProperties}
      >
        <div className="plan-toile">
          <FloorPlan
            className="gestion-plan"
            layout={zone.layout}
            tables={tables}
            states={states}
            selectedId={selectedId}
            onSelect={onSelect}
            describe={describe}
            label={`Plan ${zone.name}`}
            badge={PLACES_BADGE}
          />
          {pings.length > 0 && (
            <svg
              viewBox={`0 0 ${zone.layout.w} ${zone.layout.h}`}
              className="gestion-plan-eclats"
              aria-hidden
            >
              <defs>
                <radialGradient id={glow}>
                  <stop offset="0" className="plan-eclat-or" stopOpacity={0.8} />
                  <stop offset="1" className="plan-eclat-or" stopOpacity={0} />
                </radialGradient>
              </defs>
              {pings.map((ping) => (
                <g key={ping.id} className="plan-eclat" onAnimationEnd={() => onPingEnd?.(ping.id)}>
                  <circle cx={ping.table.x} cy={ping.table.y} r={52} fill={`url(#${glow})`} />
                  <circle className="plan-eclat-anneau" cx={ping.table.x} cy={ping.table.y} r={30} />
                </g>
              ))}
            </svg>
          )}
        </div>
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

/** L'état d'une réservation en toutes lettres, à la teinte de sa table ; à rendre avec key={state} pour qu'un changement se pose. */
export function StatusChip({ state }: { state: TableState }) {
  return (
    <span className="statut statut-pose" data-state={state}>
      <span className="plan-legende" data-state={state} aria-hidden />
      {TABLE_STATE_LABELS[state]}
    </span>
  );
}
