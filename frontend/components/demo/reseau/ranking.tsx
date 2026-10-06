"use client";

import { useRef, useState } from "react";
import type { NetworkFixture } from "@/lib/demo/reseau/data";
import { formatInteger, formatRoundCents, formatWait } from "@/lib/demo/reseau/format";
import type { RestaurantSnapshot } from "@/lib/demo/reseau/simulation";
import { useRowFit } from "./use-row-fit";

type SortKey = "name" | "orders" | "revenue" | "wait";

const COLUMNS: {
  key: SortKey;
  label: string;
  /** Largeur fixe : le nom du restaurant prend le reste, et se tronque. */
  className: string;
  value: (s: RestaurantSnapshot) => number;
}[] = [
  { key: "orders", label: "Cmd", className: "hidden w-10 sm:table-cell", value: (s) => s.orders },
  { key: "revenue", label: "CA QR", className: "w-20 max-sm:pr-5", value: (s) => s.revenue },
  { key: "wait", label: "Délai", className: "hidden w-18 pr-5 sm:table-cell", value: (s) => s.waitNow ?? 0 },
];

const waitLabel = (s: RestaurantSnapshot) =>
  s.waitNow != null ? formatWait(s.waitNow) : s.hours ? "Fermé" : "À venir";

/**
 * Le classement du jour, trié au choix. En plein écran il montre les lignes
 * entières que tient sa carte, et défile en entier à la demande ; ailleurs il
 * montre les premiers restaurants et s'ouvre de même — sur deux colonnes en
 * tablette. Au téléphone, commandes et attente passent sous le nom. Un rush
 * porte son numéro de la carte et son attente en jaune ; un restaurant
 * récent, son anneau.
 */
export function Ranking({
  fixture,
  snapshots,
  selected,
  onSelect,
}: {
  fixture: NetworkFixture;
  snapshots: RestaurantSnapshot[];
  selected: number | null;
  onSelect: (index: number) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({
    key: "revenue",
    descending: true,
  });
  const [expanded, setExpanded] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const fit = useRowFit(scroller);
  const shown = expanded ? snapshots.length : (fit ?? fixture.display.rankingPreview);
  const name = (s: RestaurantSnapshot) => fixture.restaurants[s.index].name;
  const column = COLUMNS.find((c) => c.key === sort.key);
  const rows = [...snapshots].sort((a, b) => {
    // Fermé ou à venir, sans délai : en bas de la liste, quel que soit le sens.
    if (column?.key === "wait" && (a.waitNow == null) !== (b.waitNow == null)) return a.waitNow == null ? 1 : -1;
    const order = column
      ? column.value(a) - column.value(b)
      : name(a).localeCompare(name(b), "fr");
    return (sort.descending ? -order : order) || name(a).localeCompare(name(b), "fr");
  });

  const toggle = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, descending: !current.descending }
        : { key, descending: key !== "name" }
    );

  const header = (key: SortKey, label: string, className = "") => (
    <th
      key={key}
      scope="col"
      aria-sort={sort.key === key ? (sort.descending ? "descending" : "ascending") : undefined}
      className={`sticky top-0 z-10 bg-surface py-2 font-medium ${
        key === "name" ? "pl-5 pr-2 text-left" : "px-2 text-right"
      } ${className}`}
    >
      {/* La flèche de tri sort du flux : les titres restent alignés sur leurs chiffres. */}
      <button
        type="button"
        onClick={() => toggle(key)}
        className={`relative font-semibold uppercase tracking-wider transition-colors hover:text-foreground ${
          sort.key === key ? "text-foreground" : ""
        }`}
      >
        {label}
        {sort.key === key && (
          <span
            aria-hidden
            className={`absolute top-1/2 -translate-y-1/2 text-[0.55rem] ${key === "name" ? "-right-3" : "-left-3"}`}
          >
            {sort.descending ? "▼" : "▲"}
          </span>
        )}
      </button>
    </th>
  );

  // En plein écran, le tableau remplit sa carte : ses lignes se partagent le reste.
  const table = (subset: RestaurantSnapshot[], offset: number) => (
    <table className="h-full w-full table-fixed border-separate border-spacing-0 text-sm">
      <thead className="text-[0.8125rem] font-semibold text-faint">
        <tr>
          {header("name", "Restaurant")}
          {COLUMNS.map((c) => header(c.key, c.label, c.className))}
        </tr>
      </thead>
      <tbody>
        {subset.map((s, i) => {
          const restaurant = fixture.restaurants[s.index];
          const active = s.index === selected;
          return (
            <tr
              key={restaurant.id}
              data-row
              onClick={() => onSelect(s.index)}
              className={`cursor-pointer transition-colors ${active ? "bg-foreground/[0.06]" : "hover:bg-foreground/[0.03]"}`}
            >
              <th scope="row" className="border-t border-hairline py-2 pl-5 pr-2 text-left font-normal">
                <button
                  type="button"
                  data-row-content
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(s.index);
                  }}
                  aria-pressed={active}
                  className="flex w-full min-w-0 items-center gap-2 rounded text-left"
                >
                  <span className="w-5 shrink-0 text-right text-[0.8125rem] text-faint tabular-nums">{offset + i + 1}</span>
                  <span aria-hidden className="flex w-4 shrink-0 justify-center">
                    {/* Un point, pas le numéro de la liste « En rush » : à côté du rang, deux chiffres se suivaient (« 6 ③ »). */}
                    {s.rush ? (
                      <span className="size-2.5 rounded-full bg-ember-2" />
                    ) : (
                      s.isNew && <span className="size-2 rounded-full border border-foreground/50" />
                    )}
                  </span>
                  <span className="min-w-0 shrink">
                    <span className="block truncate font-medium">
                      {restaurant.name}
                      {s.rush && <span className="sr-only">, en rush</span>}
                      {s.isNew && <span className="sr-only">, nouveau</span>}
                    </span>
                    <span className="block text-[0.8125rem] text-muted tabular-nums sm:hidden">
                      {formatInteger(s.orders)}&nbsp;cmd ·{" "}
                      <span className={s.rush ? "font-medium text-ember-2" : ""}>
                        {s.waitNow == null ? waitLabel(s) : `délai ${waitLabel(s)}`}
                      </span>
                    </span>
                  </span>
                </button>
              </th>
              <td className="hidden border-t border-hairline px-2 py-2 text-right tabular-nums sm:table-cell">
                {formatInteger(s.orders)}
              </td>
              <td className="border-t border-hairline px-2 py-2 text-right tabular-nums max-sm:pr-5">
                {formatRoundCents(s.revenue)}
              </td>
              <td
                className={`hidden border-t border-hairline py-2 pl-2 pr-5 text-right tabular-nums sm:table-cell ${
                  s.rush ? "font-medium text-ember-2" : s.open ? "" : "text-faint"
                }`}
              >
                {waitLabel(s)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
  const visible = rows.slice(0, shown);
  const half = Math.ceil(visible.length / 2);

  return (
    <>
      <div
        ref={scroller}
        className={`min-h-0 flex-1 wall:overflow-y-auto ${
          expanded ? "wall:pb-12 wall:[mask-image:linear-gradient(to_bottom,black_calc(100%-3rem),transparent)]" : ""
        }`}
      >
        {/* En tablette, deux colonnes : une seule laissait un vide entre les noms et les chiffres. */}
        <div className="max-lg:hidden wall:hidden lg:grid lg:grid-cols-2 lg:divide-x lg:divide-hairline">
          {table(visible.slice(0, half), 0)}
          {table(visible.slice(half), half)}
        </div>
        <div className="h-full lg:below-wall:hidden">{table(visible, 0)}</div>
      </div>
      {rows.length > shown || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          className="min-h-11 shrink-0 border-t border-hairline px-5 text-left text-sm font-medium text-foreground transition-colors hover:text-muted"
        >
          {expanded ? "Réduire le classement ↑" : `Voir les ${rows.length} restaurants →`}
        </button>
      ) : null}
    </>
  );
}
