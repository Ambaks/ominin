"use client";

import { Fragment, useState, type CSSProperties } from "react";
import { ENTITY, Segmented } from "@/components/gestion/ui";
import type { HeatCell } from "@/lib/gestion/analyses";
import { Card, money, WEEKDAYS } from "./parts";

type Metric = "revenue" | "staff";

/** Repère des heures : une sur trois, la grille reste lisible au téléphone. */
const HOUR_LABEL_EVERY = 3;

/**
 * Jour × heure. L'heure reçue est celle du jour de service, décalée de la fin de
 * journée du restaurant : minuit après un service du soir reste dans la même
 * ligne. Au doigt, pas d'infobulle : toucher une case écrit son détail dessous.
 */
export function SalesHeatmap({
  cells,
  dayEndHour,
  htShare,
  hasLabor,
}: {
  cells: readonly HeatCell[];
  dayEndHour: number;
  /** Part HT du CA : le CA par heure d'équipe se lit hors taxes, comme les autres ratios. */
  htShare: number;
  hasLabor: boolean;
}) {
  const [metric, setMetric] = useState<Metric>("revenue");
  const [picked, setPicked] = useState<string | null>(null);
  if (cells.length === 0) return null;

  const hours = cells.map((cell) => cell.hour);
  const first = Math.min(...hours);
  const span = Math.max(...hours) - first + 1;
  const columns = Array.from({ length: span }, (_, index) => first + index);
  const clockHour = (hour: number) => (hour + dayEndHour) % 24;
  const byKey = new Map(cells.map((cell) => [`${cell.dow}/${cell.hour}`, cell]));
  const perHour = (cell: HeatCell) => (cell.revenue * htShare) / cell.staffHours;
  // En mode équipe, un créneau sans heure pointée n'a pas de valeur : ni zéro, ni « aucune vente ».
  const value = (cell: HeatCell): number | null =>
    metric === "revenue" ? cell.revenue : cell.staffHours > 0 ? perHour(cell) : null;
  const rated = cells.filter((cell) => value(cell) != null);
  const top = Math.max(...rated.map((cell) => value(cell) ?? 0), 1);
  const describe = (cell: HeatCell) =>
    `${WEEKDAYS[cell.dow - 1]} ${clockHour(cell.hour)} h : ${money(cell.revenue)} TTC en moyenne` +
    (cell.staffHours > 0
      ? ` · ${cell.staffHours.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h d’équipe · ${money(perHour(cell))} HT par heure`
      : "");
  const peak = rated.reduce<HeatCell | null>(
    (best, cell) => (best == null || (value(cell) ?? 0) > (value(best) ?? 0) ? cell : best),
    null
  );
  const weakest = rated.reduce<HeatCell | null>(
    (best, cell) => (best == null || (value(cell) ?? 0) < (value(best) ?? 0) ? cell : best),
    null
  );
  const pickedCell = picked ? byKey.get(picked) : undefined;
  const legend = `0 → ${money(top)}${metric === "staff" ? " HT par heure d’équipe" : " TTC"}`;

  return (
    <Card
      title="Jour × heure"
      sub="moyenne par jour de vente"
      right={
        hasLabor ? (
          <Segmented
            label="Mesure"
            glass={false}
            options={[
              { value: "revenue", label: "CA TTC" },
              { value: "staff", label: "CA HT / h d’équipe" },
            ]}
            value={metric}
            onChange={(next: Metric) => {
              setMetric(next);
              setPicked(null);
            }}
          />
        ) : undefined
      }
    >
      <div
        className={`g-heat ${ENTITY.money}`}
        style={{ "--g-heat-n": span } as CSSProperties}
        role="group"
        aria-label={`Ventes par jour et par heure${peak ? ` ; pointe : ${describe(peak)}` : ""}`}
      >
        <span />
        {columns.map((hour) => (
          <span key={hour} className="g-heat-hour">
            {(hour - first) % HOUR_LABEL_EVERY === 0 ? clockHour(hour) : ""}
          </span>
        ))}
        {WEEKDAYS.map((name, index) => (
          <Fragment key={name}>
            <span>{name}</span>
            {columns.map((hour) => {
              const key = `${index + 1}/${hour}`;
              const cell = byKey.get(key);
              const cellValue = cell ? value(cell) : null;
              return (
                <button
                  key={key}
                  type="button"
                  className="g-heat-cell"
                  data-empty={cellValue == null ? "" : undefined}
                  disabled={!cell}
                  aria-pressed={picked === key}
                  aria-label={cell ? describe(cell) : `${name} ${clockHour(hour)} h : aucune vente`}
                  title={cell ? describe(cell) : undefined}
                  style={{ "--g-v": (cellValue ?? 0) / top } as CSSProperties}
                  onClick={() => setPicked(key)}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
      <p className="mt-3 text-g-meta text-muted">{legend}</p>
      <p className="mt-1 text-g-meta text-muted" aria-live="polite">
        {pickedCell
          ? describe(pickedCell)
          : metric === "staff" && weakest
            ? `Le moins rentable · ${describe(weakest)}`
            : peak && `Pointe · ${describe(peak)}`}
      </p>
    </Card>
  );
}
