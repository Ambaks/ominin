"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { project } from "@/lib/demo/reseau/carte";
import type { NetworkFixture } from "@/lib/demo/reseau/data";
import type { RestaurantSnapshot } from "@/lib/demo/reseau/simulation";
import { townGroup } from "./network-map";

/** « Toulouse Matabiau » → « Matabiau » sous le titre « Toulouse ». */
const shortName = (name: string, place: string) => (name.startsWith(`${place} `) ? name.slice(place.length + 1) : name);

/**
 * L'agglomération que la carte de France résume à un repère (six restaurants
 * autour de Toulouse) : ses restaurants à leurs vraies positions, nommés, en
 * rush avec leur numéro de la liste. À côté de la carte, pas dessus : en
 * médaillon, il cachait un tiers de la France.
 */
export function TownInset({
  fixture,
  snapshots,
  rushOrder,
  selected,
  onSelect,
  title,
}: {
  fixture: NetworkFixture;
  snapshots: RestaurantSnapshot[];
  rushOrder: number[];
  selected: number | null;
  onSelect: (index: number) => void;
  /** Classes du titre, celles des autres blocs de la colonne. */
  title: string;
}) {
  const town = useMemo(() => townGroup(fixture), [fixture]);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; rem: number } | null>(null);
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, rem: parseFloat(getComputedStyle(document.documentElement).fontSize) })
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { map } = fixture.display;
  const { inset } = map;
  if (!town || !inset) return null;

  const real = town.map((index) => {
    const { lng, lat } = fixture.restaurants[index];
    const [x, y] = project(lng, lat);
    return { index, x, y };
  });
  const xs = real.map((p) => p.x);
  const ys = real.map((p) => p.y);
  const mid = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  // Une marge autour des points, pour leurs noms.
  const spanX = (Math.max(...xs) - Math.min(...xs)) * 2.8 || 1;
  const spanY = (Math.max(...ys) - Math.min(...ys)) * 1.35 || 1;
  const width = size?.width ?? 0;
  // Plus large que haut : en plein écran, la colonne a une hauteur comptée.
  const height = Math.min(width * 0.56, Math.max(width * 0.48, (width * spanY) / spanX));
  const k = Math.min(width / spanX, height / spanY);
  const rem = size?.rem ?? 16;
  // Largeur d'un nom, estimée (≈ 0,45 rem le caractère à 12 px) ; un nom peut
  // déborder un peu dans la marge du bloc.
  const labelWidth = (index: number) => shortName(fixture.restaurants[index].name, inset.name).length * 0.45 * rem + 10;
  const slack = rem;
  const placed = real
    .map((p) => ({ index: p.index, left: width / 2 + (p.x - mid.x) * k, top: height / 2 + (p.y - mid.y) * k }))
    .sort((a, b) => a.left - b.left);
  // Chaque nom du côté où il tient ; deux voisins à la même hauteur
  // s'écartent, le plus à gauche à gauche.
  const items = placed.map((item, i) => {
    const fits = (side: number) =>
      side < 0 ? item.left - labelWidth(item.index) > -slack : item.left + labelWidth(item.index) < width + slack;
    const level = (other: (typeof placed)[number]) => Math.abs(other.top - item.top) < 1.1 * rem;
    let side = item.left < width / 2 ? -1 : 1;
    if (placed.slice(i + 1).some(level)) side = -1;
    else if (placed.slice(0, i).some(level)) side = 1;
    else if (!fits(side)) side = -side;
    return { ...item, side };
  });

  return (
    <div>
      <h3 className={`mb-2 flex items-baseline justify-between ${title}`}>
        {inset.name}
        <span className="tabular-nums">{town.length}</span>
      </h3>
      <div ref={box} className="relative rounded-xl border border-hairline bg-foreground/[0.03]" style={{ height }}>
        {size &&
          items.map((item) => {
            const s = snapshots[item.index];
            const rank = rushOrder.indexOf(item.index);
            const dot = s.open
              ? map.dotMin + (map.dotMax - map.dotMin) * 0.4 * Math.sqrt(Math.min(1, s.recent / map.fullAt))
              : map.dotMin;
            const mark = rank >= 0 ? map.markerRem * rem : dot;
            return (
              <button
                key={fixture.restaurants[item.index].id}
                type="button"
                tabIndex={-1}
                aria-hidden
                onClick={() => onSelect(item.index)}
                className="absolute"
                style={{ left: item.left, top: item.top }}
              >
                {rank >= 0 ? (
                  <span
                    className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ember-2 text-[0.75rem] font-bold text-background tabular-nums ${
                      item.index === selected ? "outline-2 outline-offset-2 outline-foreground" : ""
                    }`}
                    style={{ width: mark, height: mark }}
                  >
                    {rank + 1}
                  </span>
                ) : (
                  <span
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${
                      s.open ? "bg-foreground/75" : "border border-faint bg-surface"
                    } ${item.index === selected ? "outline-2 outline-offset-2 outline-foreground" : s.isNew ? "outline outline-1 outline-offset-2 outline-foreground/50" : ""}`}
                    style={{ width: dot, height: dot }}
                  />
                )}
                <span
                  className={`absolute top-0 -translate-y-1/2 whitespace-nowrap text-[0.75rem] font-medium ${
                    s.rush ? "text-ember-2" : item.index === selected ? "text-foreground" : "text-foreground/80"
                  } ${item.side < 0 ? "-translate-x-full" : ""}`}
                  style={{ left: item.side * (mark / 2 + 5) }}
                >
                  {shortName(fixture.restaurants[item.index].name, inset.name)}
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
