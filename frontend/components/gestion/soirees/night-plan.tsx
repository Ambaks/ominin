"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FloorPlan, type TableState } from "@/components/club/floor-plan";
import { TABLE_STATE_LABELS } from "@/lib/gestion/club-selectors";
import type { ClubTable, ClubZone } from "@/lib/club/types";

/** Une table à signaler sur le plan, le temps de son halo. */
export type PlanPing = { id: string; table: ClubTable };

/** Agrandissement maximal du plan, et celui du bouton « Agrandir ». */
const ZOOM_MAX = 3;
const ZOOM_STEP = 2;
/** Déplacement (px) au-delà duquel un appui devient un glissé, pas un choix de table. */
const TAP_SLOP = 6;
/** Demi-côté d'une table dessinée, petite ou de dix places et plus (miroir de TABLE / TABLE_LARGE de FloorPlan). */
const TABLE_HALF = { small: 17, large: 23 } as const;
/** Rayon de la pastille des places, en unités du plan : son chiffre de 10 y tient lisible. */
const PLACES_BADGE = 10;

/** Le signe d'un statut, posé sur sa table : la couleur seule ne suffit pas. */
const SIGNS: Partial<Record<TableState, string>> = { arrivee: "✓", attente: "€" };

type View = { s: number; x: number; y: number };
type Gesture = { from: View; dist: number; mid: { x: number; y: number }; start: { x: number; y: number } };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/*
 * Le plan d'une zone côté gestion : le dessin partagé avec la page du club,
 * et par-dessus, dans le même repère, le signe de chaque statut et le halo
 * des tables payées en direct. La zone tient dans la largeur ; deux doigts
 * (ou « Agrandir ») l'agrandissent, un doigt la déplace une fois agrandie,
 * « Vue d'ensemble » la remet entière. À monter avec key={zone.id}.
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
  const cadre = useRef<HTMLDivElement>(null);
  const toile = useRef<HTMLDivElement>(null);
  const view = useRef<View>({ s: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const dragged = useRef(false);
  const [level, setLevel] = useState<"entier" | "agrandi" | "max">("entier");
  const zoomed = level !== "entier";
  const glow = useId();

  /** Pose la vue, bornée au cadre : le plan n'en sort jamais. */
  const place = (next: View, animate: boolean): View | null => {
    const box = cadre.current;
    const canvas = toile.current;
    if (!box || !canvas) return null;
    const s = clamp(next.s, 1, ZOOM_MAX);
    const placed = {
      s,
      x: clamp(next.x, box.clientWidth * (1 - s), 0),
      y: clamp(next.y, box.clientHeight * (1 - s), 0),
    };
    view.current = placed;
    canvas.toggleAttribute("data-anime", animate);
    canvas.style.transform = `translate(${placed.x}px, ${placed.y}px) scale(${placed.s})`;
    return placed;
  };

  const apply = (next: View, animate = false) => {
    const placed = place(next, animate);
    if (placed) setLevel(placed.s <= 1 ? "entier" : placed.s >= ZOOM_MAX ? "max" : "agrandi");
  };

  /** Agrandit (ou réduit) autour du centre du cadre. */
  const zoomTo = (s: number) => {
    const box = cadre.current;
    if (!box) return;
    const { s: s0, x, y } = view.current;
    const cx = box.clientWidth / 2;
    const cy = box.clientHeight / 2;
    apply({ s, x: cx - ((cx - x) / s0) * s, y: cy - ((cy - y) / s0) * s }, true);
  };

  // Une table choisie hors du cadre (depuis une annonce) y est ramenée.
  useEffect(() => {
    const box = cadre.current;
    const target = box?.querySelector("[data-selected]");
    if (!box || !target || view.current.s === 1) return;
    const frame = box.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const { s, x, y } = view.current;
    place(
      {
        s,
        x: x + frame.left + frame.width / 2 - (rect.left + rect.width / 2),
        y: y + frame.top + frame.height / 2 - (rect.top + rect.height / 2),
      },
      true
    );
  }, [selectedId]);

  const local = (event: React.PointerEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event: React.PointerEvent) => {
    pointers.current.set(event.pointerId, local(event));
    const points = [...pointers.current.values()];
    dragged.current = false;
    if (points.length === 2) {
      const [a, b] = points;
      gesture.current = {
        from: view.current,
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        start: a,
      };
    } else if (points.length === 1) {
      gesture.current = { from: view.current, dist: 0, mid: points[0], start: points[0] };
    }
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return;
    pointers.current.set(event.pointerId, local(event));
    const points = [...pointers.current.values()];
    const { from, dist, mid, start } = gesture.current;
    if (points.length === 2 && dist > 0) {
      const [a, b] = points;
      const s = clamp((from.s * Math.hypot(a.x - b.x, a.y - b.y)) / dist, 1, ZOOM_MAX);
      const now = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      dragged.current = true;
      apply({ s, x: now.x - ((mid.x - from.x) / from.s) * s, y: now.y - ((mid.y - from.y) / from.s) * s });
      return;
    }
    if (points.length !== 1 || from.s === 1) return;
    const dx = points[0].x - start.x;
    const dy = points[0].y - start.y;
    if (!dragged.current && Math.hypot(dx, dy) < TAP_SLOP) return;
    if (!dragged.current) event.currentTarget.setPointerCapture(event.pointerId);
    dragged.current = true;
    apply({ s: from.s, x: from.x + dx, y: from.y + dy });
  };

  const onPointerEnd = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId);
    const rest = [...pointers.current.values()];
    // Un doigt levé d'un pincement : l'autre reprend en glissé, d'où il est.
    gesture.current = rest.length === 1 ? { from: view.current, dist: 0, mid: rest[0], start: rest[0] } : null;
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end gap-2">
        {zoomed && (
          <button
            type="button"
            onClick={() => apply({ s: 1, x: 0, y: 0 }, true)}
            className="min-h-11 rounded-full border border-hairline px-4 text-sm font-medium text-muted hover:text-foreground lg:pointer-fine:min-h-9"
          >
            Vue d&rsquo;ensemble
          </button>
        )}
        <button
          type="button"
          onClick={() => zoomTo(level === "max" ? 1 : view.current.s * ZOOM_STEP)}
          className="min-h-11 rounded-full border border-hairline px-4 text-sm font-medium text-muted hover:text-foreground lg:pointer-fine:min-h-9"
        >
          {level === "max" ? "Réduire" : "Agrandir"}
        </button>
      </div>
      <div
        ref={cadre}
        data-zoom={zoomed || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(event) => {
          // Un glissé ne choisit pas la table sous le doigt.
          if (dragged.current) {
            event.stopPropagation();
            dragged.current = false;
          }
        }}
        className="plan-cadre rounded-2xl border border-hairline bg-surface"
      >
        <div ref={toile} className="plan-toile p-3 sm:p-5">
          <div className="relative">
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
            <svg
              viewBox={`0 0 ${zone.layout.w} ${zone.layout.h}`}
              className="gestion-plan-calque"
              aria-hidden
            >
              <defs>
                <radialGradient id={glow}>
                  <stop offset="0" className="plan-eclat-or" stopOpacity={0.8} />
                  <stop offset="1" className="plan-eclat-or" stopOpacity={0} />
                </radialGradient>
              </defs>
              {tables.map((table) => {
                const sign = SIGNS[states[table.id]];
                if (!sign) return null;
                const half = table.seats >= 10 ? TABLE_HALF.large : TABLE_HALF.small;
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
