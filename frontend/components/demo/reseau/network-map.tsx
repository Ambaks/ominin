"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MAP_FRAME, MAP_HEIGHT, MAP_PATHS, MAP_WIDTH, project } from "@/lib/demo/reseau/carte";
import type { NetworkFixture } from "@/lib/demo/reseau/data";
import { formatHourInText, formatInteger, formatWait } from "@/lib/demo/reseau/format";
import type { RestaurantSnapshot } from "@/lib/demo/reseau/simulation";

/** Kilomètres par degré de latitude (rayon terrestre moyen). */
const KM_PER_DEGREE = (6371 * Math.PI) / 180;

/** Au centième d'unité : les fonctions trigonométriques de Node et du
 *  navigateur divergent au-delà, et l'hydratation avec elles. */
const round = (value: number) => Math.round(value * 100) / 100;

interface Point {
  x: number;
  y: number;
  /** Rayon du maillage visé, en unités de la carte. */
  coverage: number;
  /** Rayon de la zone cliquable : jamais sur un voisin. */
  hit: number;
}

/**
 * Position de chaque restaurant sur le fond. Les adresses d'une même ville
 * se superposent à cette échelle : elles s'écartent en couronne autour de
 * leur centre, chacune gardant sa direction réelle.
 */
function layout(fixture: NetworkFixture): { points: Point[]; groups: number[][] } {
  const { clusterUnder, clusterRadius, dotMax } = fixture.display.map;
  const points = fixture.restaurants.map(({ lng, lat }) => {
    const [x, y] = project(lng, lat);
    const [, north] = project(lng, lat + (fixture.simulation.coverageKm ?? 0) / KM_PER_DEGREE);
    return { x, y, coverage: y - north };
  });
  const placed = points.map((p) => ({ ...p }));
  const grouped = new Set<number>();
  const groups: number[][] = [];
  points.forEach((_, i) => {
    if (grouped.has(i)) return;
    const group = [i];
    for (let k = 0; k < group.length; k++) {
      points.forEach((q, j) => {
        const p = points[group[k]];
        if (!group.includes(j) && Math.hypot(p.x - q.x, p.y - q.y) < clusterUnder) group.push(j);
      });
    }
    group.forEach((j) => grouped.add(j));
    if (group.length < 2) return;
    groups.push(group);
    const cx = group.reduce((s, j) => s + points[j].x, 0) / group.length;
    const cy = group.reduce((s, j) => s + points[j].y, 0) / group.length;
    const bearing = (j: number) => Math.atan2(points[j].y - cy, points[j].x - cx);
    const sorted = [...group].sort((a, b) => bearing(a) - bearing(b));
    const start = bearing(sorted[0]);
    sorted.forEach((j, k) => {
      const angle = start + (k * 2 * Math.PI) / group.length;
      placed[j].x = cx + clusterRadius * Math.cos(angle);
      placed[j].y = cy + clusterRadius * Math.sin(angle);
    });
  });
  const hit = (i: number) =>
    Math.min(dotMax, ...placed.flatMap((q, j) => (j === i ? [] : [Math.hypot(placed[i].x - q.x, placed[i].y - q.y) / 2])));
  return {
    points: placed.map((p, i) => ({ x: round(p.x), y: round(p.y), coverage: round(p.coverage), hit: round(hit(i)) })),
    groups,
  };
}

/**
 * L'agglomération trop dense pour l'échelle de la France (display.map.inset) :
 * la plus grande couronne, si elle compte assez de restaurants. Elle se
 * résume sur la carte à un repère ; TownInset la montre en détail.
 */
export function townGroup(fixture: NetworkFixture): number[] | null {
  const { inset } = fixture.display.map;
  if (!inset) return null;
  const largest = layout(fixture).groups.reduce<number[]>((best, group) => (group.length > best.length ? group : best), []);
  return largest.length >= inset.minRestaurants ? largest : null;
}

/**
 * La carte du réseau. Le cadre prend la place qu'on lui donne : plus large
 * que la France, il montre davantage des pays voisins plutôt qu'un bord
 * vide. Les restaurants en rush portent leur numéro de la liste « En rush »,
 * en HTML par-dessus le SVG (net à toutes les tailles) — d'où la mesure du
 * cadre, sans laquelle ils attendent.
 */
export function NetworkMap({
  fixture,
  snapshots,
  rushOrder,
  seconds,
  selected,
  onSelect,
  showCoverage,
}: {
  fixture: NetworkFixture;
  snapshots: RestaurantSnapshot[];
  /** Restaurants en rush, dans l'ordre de leur liste. */
  rushOrder: number[];
  seconds: number;
  selected: number | null;
  onSelect: (index: number) => void;
  showCoverage: boolean;
}) {
  const { points } = useMemo(() => layout(fixture), [fixture]);
  const town = useMemo(() => townGroup(fixture), [fixture]);
  const inTown = (index: number) => town?.includes(index) ?? false;
  const hub = town && {
    x: town.reduce((sum, i) => sum + points[i].x, 0) / town.length,
    y: town.reduce((sum, i) => sum + points[i].y, 0) / town.length,
  };
  // Ses restaurants en rush, dits sur le repère : sans quoi la carte n'en montrait que hors de Toulouse.
  const townRush = town ? town.filter((i) => snapshots[i].rush).length : 0;
  const [hover, setHover] = useState<number | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number; rem: number } | null>(null);
  useEffect(() => {
    const box = frame.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
        rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
      })
    );
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const { map, rippleSeconds } = fixture.display;
  const viewWidth = size
    ? Math.min(MAP_WIDTH, Math.max(MAP_FRAME.width, (MAP_HEIGHT * size.width) / size.height))
    : MAP_FRAME.width;
  // La France reste entière, à `marginRem` des bords ; dans ces limites, le
  // cadre se centre sur le réseau (l'Est) plutôt que sur la France : moins
  // d'Atlantique vide.
  const margin = size ? (map.marginRem * size.rem * viewWidth) / size.width : 0;
  const xs = points.map((p) => p.x);
  const lowest = MAP_FRAME.x + MAP_FRAME.width + margin - viewWidth / 2;
  const highest = MAP_FRAME.x - margin + viewWidth / 2;
  const center =
    lowest <= highest
      ? Math.min(highest, Math.max(lowest, (Math.min(...xs) + Math.max(...xs)) / 2))
      : MAP_FRAME.x + MAP_FRAME.width / 2;
  const viewX = Math.min(MAP_WIDTH - viewWidth, Math.max(0, center - viewWidth / 2));
  const scale = size ? Math.min(size.width / viewWidth, size.height / MAP_HEIGHT) : 0;
  const px = (x: number, y: number) => ({
    left: (size!.width - viewWidth * scale) / 2 + (x - viewX) * scale,
    top: (size!.height - MAP_HEIGHT * scale) / 2 + y * scale,
  });

  const radius = (s: RestaurantSnapshot) =>
    s.open
      ? Math.max(map.dotMin, map.dotMax * Math.sqrt(Math.min(1, s.recent / map.fullAt)))
      : map.closedDot;
  // Les petits points par-dessus les gros : aucun ne disparaît dessous.
  const drawOrder = snapshots.filter((s) => !inTown(s.index)).sort(
    (a, b) => Number(a.index === selected) - Number(b.index === selected) || b.recent - a.recent
  );
  const hovered = hover == null ? null : snapshots[hover];
  // Le restaurant ouvert, s'il est sur la carte (sinon, le détail de l'agglomération le montre).
  const current = selected == null || inTown(selected) ? null : snapshots[selected];
  // Pastilles des restaurants en rush, numérotées comme leur liste.
  const markers: { index: number; rank: number; left: number; top: number }[][] = [];
  // L'étiquette du restaurant ouvert se pose du côté où elle ne couvre
  // aucune pastille ; à égalité, vers le centre de la France.
  let labelLeft = false;
  if (size) {
    const reach = (map.markerRem + map.markerGapRem) * size.rem;
    rushOrder.forEach((index, rank) => {
      if (inTown(index)) return;
      const at = { index, rank, ...px(points[index].x, points[index].y) };
      const near = markers.find((group) =>
        group.some((m) => Math.hypot(m.left - at.left, m.top - at.top) < reach)
      );
      if (near) near.push(at);
      else markers.push([at]);
    });
    if (current) {
      const origin = px(points[current.index].x, points[current.index].y);
      const reachLabel = map.labelRem * size.rem;
      const blocked = (sign: number) =>
        markers.flat().filter((m) => {
          const dx = (m.left - origin.left) * sign;
          return m.index !== current.index && dx > 0 && dx < reachLabel && Math.abs(m.top - origin.top) < map.markerRem * size.rem;
        }).length;
      const right = blocked(1);
      const left = blocked(-1);
      labelLeft = right === left ? points[current.index].x > MAP_FRAME.x + MAP_FRAME.width / 2 : right > left;
    }
  }
  // Pastilles voisines réunies en une seule, leurs numéros côte à côte, au
  // centre du groupe.
  const pills = markers.map((members) => ({
    members: [...members].sort((a, b) => a.rank - b.rank),
    left: members.reduce((sum, m) => sum + m.left, 0) / members.length,
    top: members.reduce((sum, m) => sum + m.top, 0) / members.length,
  }));
  // L'étiquette du restaurant ouvert part du bord de sa pastille (ou de son
  // point), à `markerGapRem` : jamais collée au contour de sélection.
  const labelAt = (side: number) => {
    const gap = map.markerGapRem * size!.rem;
    const pill = current && pills.find((p) => p.members.some((m) => m.index === current.index));
    if (pill) {
      const half = (pill.members.length * map.markerRem * size!.rem) / 2;
      return { left: pill.left + side * (half + gap), top: pill.top };
    }
    const at = px(points[current!.index].x, points[current!.index].y);
    return { left: at.left + side * (radius(current!) * scale + gap), top: at.top };
  };
  return (
    <div
      ref={frame}
      className="relative aspect-[1000/913] max-h-[min(60svh,36rem)] w-full overflow-hidden rounded-xl wall:aspect-auto wall:h-full wall:max-h-none wall:rounded-none"
      onMouseLeave={() => setHover(null)}
    >
      <svg
        viewBox={`${viewX} 0 ${viewWidth} ${MAP_HEIGHT}`}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label={`Carte du réseau : ${snapshots.length} restaurants, dont ${rushOrder.length} en rush.`}
      >
        {/* La Suisse, seulement si le réseau y a un restaurant. */}
        {[MAP_PATHS.france, ...(fixture.restaurants.some((r) => r.country === "CH") ? [MAP_PATHS.suisse] : [])].map((d) => (
          <path
            key={d.length}
            d={d}
            className="fill-foreground/[0.085] stroke-foreground/20"
            strokeWidth={1}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {showCoverage && (
          <g className="fill-foreground" opacity={0.1}>
            {points.map((p, i) => (
              <circle key={fixture.restaurants[i].id} cx={p.x} cy={p.y} r={p.coverage} />
            ))}
          </g>
        )}
        {hub && (
          <circle
            cx={hub.x}
            cy={hub.y}
            r={map.clusterRadius}
            className={townRush ? "fill-ember-2/[0.1] stroke-ember-2" : "fill-foreground/[0.06] stroke-foreground/45"}
            strokeWidth={1}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <g aria-hidden>
          {drawOrder.map((s) => {
            const { x, y } = points[s.index];
            const r = radius(s);
            const fresh = s.last != null && seconds - s.last.createdAt < rippleSeconds;
            return (
              <g
                key={fixture.restaurants[s.index].id}
                className="cursor-pointer"
                onMouseEnter={() => setHover(s.index)}
                onClick={() => onSelect(s.index)}
              >
                <circle cx={x} cy={y} r={Math.max(r, points[s.index].hit)} fill="transparent" />
                {fresh && !s.rush && (
                  <circle
                    key={s.last!.number}
                    cx={x}
                    cy={y}
                    r={r}
                    className="reseau-ripple fill-none stroke-foreground/70"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {!s.rush && (
                  <circle
                    cx={x}
                    cy={y}
                    r={r}
                    className={`transition-[r] duration-700 motion-reduce:transition-none ${
                      s.open ? "fill-foreground/75 stroke-surface" : "fill-surface stroke-faint"
                    }`}
                    strokeWidth={s.open ? 1.5 : 1.25}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {/* Ouvert depuis peu : l'anneau du classement. */}
                {s.isNew && !s.rush && (
                  <circle
                    cx={x}
                    cy={y}
                    r={r + map.dotMin / 2}
                    className="fill-none stroke-foreground/50"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {s.index === selected && !s.rush && (
                  <circle
                    cx={x}
                    cy={y}
                    r={r + map.dotMin}
                    className="fill-none stroke-foreground"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {size &&
        pills.map((pill) => (
          <span
            key={pill.members[0].index}
            className={`absolute flex -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember-2 shadow-[0_0_0_2px_var(--background)] ${
              pill.members.some((m) => m.index === selected) ? "outline-2 outline-offset-2 outline-foreground" : ""
            }`}
            style={{ left: pill.left, top: pill.top, height: `${map.markerRem}rem` }}
          >
            {pill.members.map((m, k) => (
              <button
                key={m.index}
                type="button"
                tabIndex={-1}
                aria-hidden
                onClick={() => onSelect(m.index)}
                onMouseEnter={() => setHover(m.index)}
                className={`relative flex items-center justify-center rounded-full text-[0.75rem] font-bold tabular-nums ${
                  k && pill.members[k - 1].index !== selected && m.index !== selected
                    ? "before:absolute before:inset-y-1 before:left-0 before:w-px before:bg-background/30"
                    : ""
                } ${m.index === selected && pill.members.length > 1 ? "bg-background text-ember-2" : "text-background"}`}
                style={{ width: `${map.markerRem}rem` }}
              >
                {m.rank + 1}
              </button>
            ))}
          </span>
        ))}

      {size && hub && fixture.display.map.inset && (
        <span
          aria-hidden
          className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-[0.6875rem] font-semibold text-muted"
          style={{ left: px(hub.x, hub.y).left, top: px(hub.x, hub.y).top + map.clusterRadius * scale + 2 }}
        >
          {`${fixture.display.map.inset.name} · ${town!.length}`}
          {townRush > 0 && <span className="text-ember-2">{` · ${townRush} en rush`}</span>}
        </span>
      )}

      {size &&
        map.labels &&
        snapshots
          .filter((s) => !inTown(s.index) && s.index !== current?.index)
          .map((s) => {
            const at = px(points[s.index].x, points[s.index].y);
            const reach = s.rush ? (map.markerRem * size.rem) / 2 : radius(s) * scale;
            return (
              <span
                key={fixture.restaurants[s.index].id}
                aria-hidden
                className="pointer-events-none absolute -translate-y-1/2 whitespace-nowrap text-[0.75rem] font-medium text-muted"
                style={{ left: at.left + reach + 5, top: at.top }}
              >
                {fixture.restaurants[s.index].name}
              </span>
            );
          })}

      {size && current && (
        <span
          aria-hidden
          className={`pointer-events-none absolute z-10 -translate-y-1/2 whitespace-nowrap rounded-md border border-hairline bg-surface px-1.5 py-0.5 text-[0.8125rem] font-medium ${
            labelLeft ? "-translate-x-full" : ""
          }`}
          style={labelAt(labelLeft ? -1 : 1)}
        >
          {fixture.restaurants[current.index].name}
          {current.waitNow != null && (
            <span className={current.rush ? "text-ember-2" : "text-muted"}> · {formatWait(current.waitNow)}</span>
          )}
        </span>
      )}

      {size && hovered && (
        <div
          className="pointer-events-none absolute z-10 w-max max-w-[16rem] -translate-x-1/2 -translate-y-[calc(100%+1rem)] rounded-xl border border-hairline bg-surface-raised px-3 py-2 shadow-xl shadow-black/40"
          style={px(points[hovered.index].x, points[hovered.index].y)}
        >
          <p className="text-[0.8125rem] font-semibold">{fixture.restaurants[hovered.index].name}</p>
          <p className="mt-0.5 text-xs text-muted tabular-nums">
            {hovered.open
              ? `${hovered.rush ? "En rush" : "Ouvert"} · délai ${formatWait(hovered.waitNow ?? 0)}`
              : hovered.hours
                ? `Fermé · ${formatHourInText(hovered.hours.open)} – ${formatHourInText(hovered.hours.close)}`
                : "Pas encore ouvert"}
          </p>
          {hovered.hours && (
            <p className="text-xs text-faint tabular-nums">
              {formatInteger(hovered.recent)} commande{hovered.recent > 1 ? "s" : ""} QR en{" "}
              {fixture.simulation.recentMinutes}&nbsp;min
            </p>
          )}
        </div>
      )}

      {showCoverage && (
        <p className="pointer-events-none absolute inset-x-3 bottom-3 text-xs text-muted">
          Cercles : {fixture.simulation.coverageKm}&nbsp;km autour de chaque restaurant — l’objectif
          « personne à plus de {fixture.simulation.coverageKm}&nbsp;km ».
        </p>
      )}
    </div>
  );
}
