"use client";

import { useCallback, useEffect, useId, useMemo, useRef } from "react";
import { FloorPlan, tableSize, tablesBounds, type TableState } from "@/components/club/floor-plan";
import { PLAN_FIT, PLAN_POINTER } from "@/components/club/timing";
import { usePlanCamera, type FitRect, type PlanCamera } from "@/components/club/use-plan-camera";
import { TABLE_STATE_LABELS } from "@/lib/gestion/club-selectors";
import type { ClubTable, ClubZone } from "@/lib/club/types";

/** Une table à signaler sur le plan, le temps de son halo. */
export type PlanPing = { id: string; table: ClubTable };

/** Pas des boutons − / +, comme sur le plan du client. */
const ZOOM_STEP = 1.5;
/** Rayon de la pastille des places, en unités du plan : son chiffre de 10 y tient lisible. */
const PLACES_BADGE = 10;

/** Le signe d'un statut, posé sur sa table : la couleur seule ne suffit pas. */
const SIGNS: Partial<Record<TableState, string>> = { arrivee: "✓", attente: "€" };

type Point = { x: number; y: number };

/*
 * Le plan d'une zone côté gestion, sous la caméra des pages du club
 * (use-plan-camera) : mêmes gestes — pincer ou Ctrl/⌘ + molette pour
 * agrandir, glisser une fois agrandi, élan, retour en ressort aux bords,
 * double toucher, « Recentrer » —, cadré au repos sur ses tables. Un toucher
 * choisit la table la plus proche du doigt ; le clavier passe par le dessin
 * partagé. Par-dessus, dans le même repère, le signe de chaque statut et le
 * halo des tables payées en direct.
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
  compact = false,
}: {
  zone: ClubZone;
  tables: ClubTable[];
  states: Record<string, TableState>;
  selectedId?: string | null;
  onSelect: (table: ClubTable) => void;
  describe: (table: ClubTable, state: TableState) => string;
  pings?: PlanPing[];
  onPingEnd?: (id: string) => void;
  /** Plan d'appoint (l'éditeur) : moins haut, il laisse voir ce qui l'entoure. */
  compact?: boolean;
}) {
  const glow = useId();
  const { w, h } = zone.layout;
  // La caméra se lit au moment du toucher, sans refaire le gestionnaire.
  const cameraRef = useRef<() => PlanCamera>(() => ({ x: 0, y: 0, s: 1 }));

  /* Le cadrage de repos : les tables, pas le vide autour. */
  const fit = useMemo<FitRect | null>(() => {
    const bounds = tablesBounds(tables, { badge: PLACES_BADGE, margin: PLAN_FIT.margin });
    if (!bounds) return null;
    const x = Math.max(bounds.x, 0) / w;
    const y = Math.max(bounds.y, 0) / h;
    return { x, y, w: Math.min(bounds.x + bounds.w, w) / w - x, h: Math.min(bounds.y + bounds.h, h) / h - y };
  }, [tables, w, h]);

  const onTap = useCallback(
    (point: Point, frame: DOMRect) => {
      const { x, y, s } = cameraRef.current();
      const k = frame.width / w;
      let best: { table: ClubTable; distance: number } | null = null;
      for (const table of tables) {
        const distance = Math.hypot(
          point.x - (frame.left + x + table.x * k * s),
          point.y - (frame.top + y + table.y * k * s)
        );
        if (distance <= PLAN_POINTER.tapRadius && (!best || distance < best.distance)) best = { table, distance };
      }
      if (best) onSelect(best.table);
    },
    [tables, w, onSelect]
  );

  const { viewport, content, zoomed, recenter, zoomBy, camera } = usePlanCamera({
    resetKey: zone.id,
    fit,
    fitHeight: true,
    onTap,
  });
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end gap-2">
        {zoomed && (
          <button
            type="button"
            onClick={recenter}
            className="min-h-11 rounded-full border border-hairline px-4 text-sm font-medium text-muted hover:text-foreground lg:pointer-fine:min-h-9"
          >
            Recentrer
          </button>
        )}
        <div role="group" aria-label="Zoom du plan" className="flex rounded-full border border-hairline">
          <button
            type="button"
            onClick={() => zoomBy(1 / ZOOM_STEP)}
            disabled={!zoomed}
            aria-label="Réduire le plan"
            className="flex size-11 items-center justify-center rounded-full text-lg text-muted hover:text-foreground disabled:opacity-40 lg:pointer-fine:size-9"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => zoomBy(ZOOM_STEP)}
            aria-label="Agrandir le plan"
            className="flex size-11 items-center justify-center rounded-full text-lg text-muted hover:text-foreground lg:pointer-fine:size-9"
          >
            +
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-hairline bg-surface p-2 sm:p-3">
        <div
          ref={viewport}
          className="plan-cadre"
          data-zoomed={zoomed || undefined}
          data-compact={compact || undefined}
        >
          <div ref={content} className="plan-toile">
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
            <svg viewBox={`0 0 ${w} ${h}`} className="gestion-plan-calque" aria-hidden>
              <defs>
                <radialGradient id={glow}>
                  <stop offset="0" className="plan-eclat-or" stopOpacity={0.8} />
                  <stop offset="1" className="plan-eclat-or" stopOpacity={0} />
                </radialGradient>
              </defs>
              {tables.map((table) => {
                const sign = SIGNS[states[table.id]];
                if (!sign) return null;
                const half = tableSize(table.seats) / 2;
                return (
                  <g
                    key={table.id}
                    className="plan-signe"
                    data-state={states[table.id]}
                    transform={`translate(${table.x + half} ${table.y + half})`}
                  >
                    <circle r={8} />
                    <text textAnchor="middle" dominantBaseline="central">
                      {sign}
                    </text>
                  </g>
                );
              })}
              {pings.map((ping) => (
                <g key={ping.id} className="plan-eclat" onAnimationEnd={() => onPingEnd?.(ping.id)}>
                  <circle cx={ping.table.x} cy={ping.table.y} r={52} fill={`url(#${glow})`} />
                  <circle className="plan-eclat-anneau" cx={ping.table.x} cy={ping.table.y} r={30} />
                </g>
              ))}
            </svg>
          </div>
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

/** L'état d'une réservation en toutes lettres, à la teinte et au signe de sa table ; à rendre avec key={state} pour qu'un changement se pose. */
export function StatusChip({ state }: { state: TableState }) {
  return (
    <span className="statut statut-pose" data-state={state}>
      <span className="plan-legende" data-state={state} aria-hidden />
      {TABLE_STATE_LABELS[state]}
    </span>
  );
}
