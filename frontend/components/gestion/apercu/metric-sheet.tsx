"use client";

import { useState } from "react";
import {
  CompareChart,
  Notice,
  Plate,
  Segmented,
  Sheet,
  niceTicks,
  type DeltaTone,
} from "@/components/gestion/ui";
import { formatPercent } from "@/lib/admin/format";
import type { DayPoint } from "@/lib/gestion/selectors";
import { formatPrice } from "@/lib/menu/format";

export type Metric = "revenue" | "orders";
type View = "day" | "total";

const VIEWS: { value: View; label: string }[] = [
  { value: "day", label: "Par jour" },
  { value: "total", label: "Cumul" },
];
const GRID_LINES = 3;
/** Au-delà, l'axe ne garde qu'un jour sur cinq. */
const DENSE_FROM = 10;
const DENSE_EVERY = 5;

const METRICS: Record<Metric, { title: string; format: (value: number) => string; tick: (value: number) => string }> = {
  revenue: {
    title: "CA encaissé",
    format: formatPrice,
    tick: (value) => `${Math.round(value).toLocaleString("fr-FR")} €`,
  },
  orders: {
    title: "Commandes payées",
    format: (value) => Math.round(value).toLocaleString("fr-FR"),
    tick: (value) => Math.round(value).toLocaleString("fr-FR"),
  },
};

const TONE: Record<DeltaTone, string> = {
  better: "text-status-signed",
  worse: "text-status-lost",
  neutral: "text-muted",
};

function cumulate(values: number[]): number[] {
  let total = 0;
  return values.map((value) => (total += value));
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Plate className="p-4">
      <p className="text-g-meta text-muted">{label}</p>
      <p className="mt-1.5 text-g-kpi tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-g-meta text-muted first-letter:uppercase">{sub}</p>}
    </Plate>
  );
}

/** Le détail d'un chiffre de l'analytique : sa courbe sur l'ombre de la période d'avant. */
export function MetricSheet({
  metric,
  period,
  days,
  prior,
  priorFailed,
  onClose,
}: {
  metric: Metric;
  period: number;
  days: DayPoint[];
  /** Null tant que la période d'avant n'est pas là. */
  prior: DayPoint[] | null;
  priorFailed: boolean;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>("day");
  const { title, format, tick } = METRICS[metric];
  const raw = days.map((day) => day[metric]);
  const rawPrior = prior?.map((day) => day[metric]) ?? null;
  const values = view === "total" ? cumulate(raw) : raw;
  const valuesPrior = rawPrior && (view === "total" ? cumulate(rawPrior) : rawPrior);

  const total = raw.reduce((sum, value) => sum + value, 0);
  const totalPrior = rawPrior?.reduce((sum, value) => sum + value, 0) ?? 0;
  const change = rawPrior && totalPrior > 0 ? (total - totalPrior) / totalPrior : null;
  const tone: DeltaTone = change == null || change === 0 ? "neutral" : change > 0 ? "better" : "worse";
  const best = days.reduce((top, day) => (day[metric] > top[metric] ? day : top), days[0]);
  const worked = raw.filter((value) => value > 0).length;
  const ahead = rawPrior ? raw.filter((value, index) => value > rawPrior[index]).length : null;
  const ceiling = Math.max(...values, ...(valuesPrior ?? []));
  const dense = days.length > DENSE_FROM;

  return (
    <Sheet size="wide" title={`${title} · ${period} jours`} onClose={onClose}>
      <div className="grid gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-g-day tabular-nums">{format(total)}</p>
            <p className="mt-1 text-g-label text-muted">
              {change != null && (
                <b className={`font-semibold ${TONE[tone]}`}>
                  {change > 0 ? "+" : ""}
                  {formatPercent(change)}{" "}
                </b>
              )}
              {rawPrior
                ? `${format(totalPrior)} les ${period} jours d’avant`
                : priorFailed
                  ? `sur ${period} jours`
                  : "La période d’avant arrive…"}
            </p>
          </div>
          <Segmented label="Lecture" options={VIEWS} value={view} onChange={setView} />
        </div>

        {priorFailed && <Notice tone="info" title="La période d’avant n’a pas pu être chargée." text="Rouvrez ce détail dans un instant." />}

        <CompareChart
          entity={metric === "revenue" ? "money" : "orders"}
          current={{
            label: `${period} derniers jours`,
            points: values.map((y, x) => ({ x, y })),
          }}
          previous={
            valuesPrior
              ? { label: `${period} jours d’avant`, points: valuesPrior.map((y, x) => ({ x, y })) }
              : undefined
          }
          domain={[0, days.length - 1]}
          ticks={days.flatMap((day, x) =>
            !dense || x % DENSE_EVERY === 0
              ? [{ x, label: dense ? String(day.day) : day.label, wide: !dense && x % 2 === 1 }]
              : []
          )}
          yTicks={niceTicks(ceiling, GRID_LINES)}
          format={format}
          formatTick={tick}
          tip={(x) => {
            const day = days[Math.round(x)];
            const before = prior?.[Math.round(x)];
            return (
              <>
                <span>{day?.label}</span>
                {before && <span className="text-muted"> / {before.label}</span>}
              </>
            );
          }}
          label={`${title} sur ${period} jours : ${format(total)}${
            rawPrior ? ` ; ${format(totalPrior)} les ${period} jours d’avant` : ""
          }.`}
        />

        <div className="grid gap-g-gap sm:grid-cols-3">
          <Fact label="Meilleur jour" value={format(best[metric])} sub={best[metric] > 0 ? best.full : undefined} />
          <Fact
            label="Moyenne par jour ouvert"
            value={format(worked > 0 ? total / worked : 0)}
            sub={`${worked} jour${worked > 1 ? "s" : ""} avec des ventes`}
          />
          <Fact
            label="Jours au-dessus d’avant"
            value={ahead == null ? "—" : `${ahead} / ${days.length}`}
            sub="comparés au même rang de la période d’avant"
          />
        </div>

        <Plate>
          <details>
            <summary className="cursor-pointer px-5 py-4 text-g-label font-medium text-muted">
              Données détaillées (tableau)
            </summary>
            <div className="overflow-x-auto border-t border-hairline">
              <table className="w-full whitespace-nowrap text-g-body tabular-nums">
                <thead>
                  <tr className="text-left text-g-meta text-muted">
                    <th scope="col" className="px-5 py-3 font-medium">Jour</th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">{title}</th>
                    <th scope="col" className="px-5 py-3 font-medium">Jour d’avant</th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">{title}</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((day, index) => (
                    <tr key={day.full} className="border-t border-hairline">
                      <td className="px-5 py-2.5 first-letter:uppercase">{day.full}</td>
                      <td className="px-5 py-2.5 text-right">{format(day[metric])}</td>
                      <td className="px-5 py-2.5 text-muted first-letter:uppercase">{prior?.[index]?.full ?? "—"}</td>
                      <td className="px-5 py-2.5 text-right text-muted">
                        {prior?.[index] ? format(prior[index][metric]) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Plate>
      </div>
    </Sheet>
  );
}
