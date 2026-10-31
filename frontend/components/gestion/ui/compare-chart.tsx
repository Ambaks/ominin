"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ENTITY, type Entity } from "./entity";

export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartSeries {
  label: string;
  points: readonly ChartPoint[];
}

/** Graduations « rondes » (1, 2, 5 × 10ⁿ) dont la plus haute couvre le maximum. */
export function niceTicks(max: number, lines: number): number[] {
  if (max <= 0) return Array.from({ length: lines + 1 }, (_, i) => i);
  const raw = max / lines;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / magnitude;
  const step = (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * magnitude;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

/** Courbe monotone : elle s'arrondit sans jamais dépasser une valeur réelle. */
function monotonePath(points: readonly (readonly [number, number])[]): string {
  const [first] = points;
  if (!first) return "";
  const slopes = points.slice(1).map(([x, y], i) => (y - points[i][1]) / (x - points[i][0] || 1));
  const tangents = points.map((_, i) => {
    const before = slopes[i - 1];
    const after = slopes[i];
    if (before === undefined) return after ?? 0;
    if (after === undefined) return before;
    return before * after <= 0 ? 0 : (2 * before * after) / (before + after);
  });
  let path = `M${first[0]} ${first[1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const third = (x1 - x0) / 3;
    path += `C${x0 + third} ${y0 + tangents[i - 1] * third} ${x1 - third} ${y1 - tangents[i] * third} ${x1} ${y1}`;
  }
  return path;
}

/** Marches : le cumul ne bouge qu'à chaque vente, comme un cours de bourse. */
function stepPath(points: readonly (readonly [number, number])[]): string {
  return points.reduce((path, [x, y], i) => `${path}${i === 0 ? `M${x} ${y}` : `H${x}V${y}`}`, "");
}

/**
 * Une période et, dessous, l'ombre de celle d'avant : même axe, même échelle.
 * Le SVG s'étire à sa boîte (traits constants) et le texte reste en HTML, à sa
 * vraie taille : le graphique n'a rien à mesurer.
 */
export function CompareChart({
  current,
  previous,
  domain,
  ticks,
  yTicks,
  step = false,
  entity = "money",
  compact = false,
  format,
  formatTick = format,
  tip,
  label,
}: {
  current: ChartSeries;
  previous?: ChartSeries;
  domain: readonly [number, number];
  /** Repères de l'axe des x ; `wide` : seulement là où la place suffit. */
  ticks: readonly { x: number; label: string; wide?: boolean }[];
  /** Lignes de grille, 0 compris ; la plus haute est le plafond. */
  yTicks: readonly number[];
  /** Cumul à marches ; sinon, courbe arrondie et lecture sur le point le plus proche. */
  step?: boolean;
  entity?: Entity;
  /** Dans une tuile : pas d'échelle à gauche, le chiffre de la tuile la remplace. */
  compact?: boolean;
  format: (value: number) => string;
  formatTick?: (value: number) => string;
  /** Le titre de l'infobulle à cette abscisse. */
  tip: (x: number) => ReactNode;
  /** Description complète pour les lecteurs d'écran. */
  label: string;
}) {
  const plot = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [x0, x1] = domain;
  const ceiling = yTicks[yTicks.length - 1] || 1;
  const px = (x: number) => ((x - x0) / (x1 - x0 || 1)) * 100;
  const py = (y: number) => 100 - (y / ceiling) * 100;
  const draw = step ? stepPath : monotonePath;

  const coords = (points: readonly ChartPoint[]) => points.map((p) => [px(p.x), py(p.y)] as const);
  const line = (points: readonly ChartPoint[]) => draw(coords(points));
  const area = (points: readonly ChartPoint[]) => {
    const all = coords(points);
    const first = all[0];
    const last = all[all.length - 1];
    return first && last ? `${draw(all)}L${last[0]} 100L${first[0]} 100Z` : "";
  };

  /** Ce que vaut une série à cette abscisse ; rien avant son début ni après sa fin. */
  const valueAt = (points: readonly ChartPoint[], x: number): number | undefined => {
    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last || x < first.x || x > last.x) return undefined;
    return points.reduce((found, point) => (point.x <= x ? point.y : found), first.y);
  };

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const box = plot.current?.getBoundingClientRect();
    if (!box?.width) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const x = x0 + ratio * (x1 - x0);
    setHover(step ? x : Math.round(x));
  };

  const end = current.points[current.points.length - 1];
  const hoverCurrent = hover == null ? undefined : valueAt(current.points, hover);
  const hoverPrevious = hover == null || !previous ? undefined : valueAt(previous.points, hover);

  return (
    <figure className={`${ENTITY[entity]} g-chart ${compact ? "g-chart-compact" : ""}`}>
      <figcaption className="g-chart-legend">
        <span>
          <i className="g-chart-key g-chart-key-now" aria-hidden />
          {current.label}
        </span>
        {previous && (
          <span>
            <i className="g-chart-key g-chart-key-prior" aria-hidden />
            {previous.label}
          </span>
        )}
      </figcaption>
      <div className="g-chart-body">
        {!compact && (
          <div className="g-chart-y" aria-hidden>
            {yTicks.map((tick) => (
              <span key={tick} style={{ bottom: `${(tick / ceiling) * 100}%` }}>
                {formatTick(tick)}
              </span>
            ))}
          </div>
        )}
        <div
          ref={plot}
          role="img"
          aria-label={label}
          className="g-chart-plot"
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {yTicks.map((tick) => (
            <i key={tick} className="g-chart-grid" style={{ bottom: `${(tick / ceiling) * 100}%` }} aria-hidden />
          ))}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            {previous && previous.points.length > 0 && (
              <>
                <path d={area(previous.points)} className="g-chart-prior-fill" />
                <path d={line(previous.points)} className="g-chart-prior-line" vectorEffect="non-scaling-stroke" />
              </>
            )}
            {current.points.length > 0 && (
              <>
                <path d={area(current.points)} className="g-chart-now-fill" />
                <path d={line(current.points)} className="g-chart-now-line" vectorEffect="non-scaling-stroke" />
              </>
            )}
          </svg>
          {end && hover == null && (
            <i className="g-chart-dot" style={{ left: `${px(end.x)}%`, top: `${py(end.y)}%` }} aria-hidden />
          )}
          {hover != null && (
            <>
              <i className="g-chart-cross" style={{ left: `${px(hover)}%` }} aria-hidden />
              {hoverPrevious !== undefined && (
                <i
                  className="g-chart-dot g-chart-dot-prior"
                  style={{ left: `${px(hover)}%`, top: `${py(hoverPrevious)}%` }}
                  aria-hidden
                />
              )}
              {hoverCurrent !== undefined && (
                <i className="g-chart-dot" style={{ left: `${px(hover)}%`, top: `${py(hoverCurrent)}%` }} aria-hidden />
              )}
              <div
                className={`g-chart-tip ${px(hover) > 55 ? "g-chart-tip-left" : ""}`}
                style={{ left: `${px(hover)}%` }}
                aria-hidden
              >
                <p className="g-chart-tip-title">{tip(hover)}</p>
                {hoverCurrent !== undefined && (
                  <p>
                    <i className="g-chart-key g-chart-key-now" />
                    <b>{format(hoverCurrent)}</b>
                  </p>
                )}
                {hoverPrevious !== undefined && (
                  <p>
                    <i className="g-chart-key g-chart-key-prior" />
                    {format(hoverPrevious)}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
        <div className="g-chart-x" aria-hidden>
          {ticks.map((tick) => (
            <span key={tick.x} className={tick.wide ? "g-chart-x-wide" : undefined} style={{ left: `${px(tick.x)}%` }}>
              {tick.label}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}
