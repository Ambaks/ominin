"use client";

import type { ClubTable, PlanMark, ZoneLayout } from "@/lib/club/types";

/*
 * Le plan d'une zone, dessiné (pas une image) : murs, repères et tables à
 * leur place, chaque table un bouton. Partagé par la page du club (le client
 * choisit SA table) et par la gestion (le plan du soir en direct) : l'état
 * de chaque table passe en data-state, l'habillage revient à la feuille de
 * style de chaque côté (.club-plan, .gestion-plan).
 */

export type TableState =
  // Côté client
  | "libre"
  | "prise"
  | "fermee"
  // Côté club
  | "payee"
  | "arrivee"
  | "attente"
  | "gardee";

const TABLE = 34;
const TABLE_LARGE = 46;
/** Zone de toucher autour d'une table, plus large que son dessin. */
const HIT = 30;
/** Rayon par défaut de la pastille des places. */
const BADGE = 8;

function Mark({ mark }: { mark: PlanMark }) {
  switch (mark.kind) {
    case "entree":
      return (
        <g
          className="plan-entree"
          transform={`translate(${mark.x} ${mark.y}) rotate(${mark.rotate ?? 0})`}
          aria-hidden
        >
          <path d="M -12 0 H 10 M 3 -7 L 11 0 L 3 7" />
        </g>
      );
    case "rambarde":
      return (
        <line
          className="plan-rambarde"
          x1={mark.x}
          y1={mark.y}
          x2={mark.x + (mark.w ?? 0)}
          y2={mark.y}
          aria-hidden
        />
      );
    case "wc":
    case "texte":
      return (
        <text className="plan-texte" x={mark.x} y={mark.y} textAnchor="middle" aria-hidden>
          {mark.label}
        </text>
      );
    default:
      return (
        <g className={`plan-repere plan-${mark.kind}`} aria-hidden>
          <rect x={mark.x} y={mark.y} width={mark.w} height={mark.h} rx={6} />
          {mark.label && (
            <text
              x={mark.x + (mark.w ?? 0) / 2}
              y={mark.y + (mark.h ?? 0) / 2}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {mark.label}
            </text>
          )}
        </g>
      );
  }
}

export function FloorPlan({
  layout,
  tables,
  states,
  selectedId,
  onSelect,
  describe,
  className,
  label,
  badge = BADGE,
}: {
  layout: ZoneLayout;
  tables: ClubTable[];
  states: Record<string, TableState>;
  selectedId?: string | null;
  onSelect?: (table: ClubTable) => void;
  /** Nom accessible d'une table : « Table 304, 5 places, 500 €, libre ». */
  describe: (table: ClubTable, state: TableState) => string;
  className?: string;
  /** Nom accessible du plan (la zone). */
  label?: string;
  /** Rayon de la pastille des places. */
  badge?: number;
}) {
  return (
    <svg
      viewBox={`0 0 ${layout.w} ${layout.h}`}
      className={className}
      data-tone={layout.tone ?? "nuit"}
      role="group"
      aria-label={label}
    >
      <g className="plan-murs" aria-hidden>
        {layout.walls.map((wall, index) => (
          <polyline key={index} points={wall.map(([x, y]) => `${x},${y}`).join(" ")} />
        ))}
      </g>
      {layout.marks.map((mark, index) => (
        <Mark key={index} mark={mark} />
      ))}
      {tables.map((table) => {
        const state = states[table.id] ?? "libre";
        const size = table.seats >= 10 ? TABLE_LARGE : TABLE;
        const interactive = Boolean(onSelect);
        return (
          <g
            key={table.id}
            className="plan-table"
            data-id={table.id}
            data-state={state}
            data-shape={table.shape}
            data-selected={table.id === selectedId || undefined}
            transform={`translate(${table.x} ${table.y})`}
            role={interactive ? "button" : "img"}
            tabIndex={interactive ? 0 : undefined}
            aria-label={describe(table, state)}
            aria-pressed={interactive ? table.id === selectedId : undefined}
            onClick={interactive ? () => onSelect?.(table) : undefined}
            onKeyDown={
              interactive
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect?.(table);
                    }
                  }
                : undefined
            }
          >
            <circle className="plan-hit" r={Math.max(HIT, size / 2 + 8)} />
            <circle className="plan-halo" r={size / 2 + 10} />
            {table.shape === "rond" ? (
              <circle className="plan-forme" r={size / 2} />
            ) : (
              <rect
                className="plan-forme"
                x={-size / 2}
                y={-size / 2}
                width={size}
                height={size}
                rx={7}
              />
            )}
            {/* Le trait d'une table prise : sans trait par défaut, chaque feuille de style décide. */}
            <line className="plan-barre" x1={-size / 2} y1={size / 2} x2={size / 2} y2={-size / 2} />
            <text className="plan-numero" textAnchor="middle" dominantBaseline="central">
              {table.label}
            </text>
            <g className="plan-places" transform={`translate(${size / 2} ${-size / 2})`}>
              <circle r={badge} />
              <text textAnchor="middle" dominantBaseline="central">
                {table.seats}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
