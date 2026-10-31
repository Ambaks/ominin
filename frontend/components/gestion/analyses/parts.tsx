import type { CSSProperties, ReactNode } from "react";
import { Chip, ENTITY, Plate, type Entity } from "@/components/gestion/ui";
import { isoWeekday, type RangeRow } from "@/lib/gestion/analyses";

const euros = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** Un montant d'analyse : à l'euro, un centime ne décide de rien ici. */
export const money = (value: number) => `${euros.format(Math.round(value))} €`;
export const percentOf = (value: number | null, digits = 0) =>
  value == null ? "—" : `${value.toLocaleString("fr-FR", { maximumFractionDigits: digits })} %`;

export const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

export function dayLabel(day: string): string {
  return `${WEEKDAYS[isoWeekday(day) - 1]} ${Number(day.slice(8))}`;
}

export function Card({
  title,
  sub,
  right,
  children,
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Plate className="px-5 pb-4 pt-4.5">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <h3 className="font-display text-g-h2">{title}</h3>
          {sub && <small className="text-g-meta text-muted">{sub}</small>}
        </div>
        {right}
      </div>
      {children}
    </Plate>
  );
}

/** Une ligne chiffre · repère, pour les petits blocs de faits. */
export function Fact({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="flex min-h-[var(--g-row-h)] items-center justify-between gap-3" title={title}>
      <span className="min-w-0 text-muted">{label}</span>
      <b className="whitespace-nowrap font-semibold tabular-nums">{value}</b>
    </div>
  );
}

/** Jours face à leur fourchette : bande = normal, trait = médiane, point = le réel. */
export function RangeRows({
  rows,
  label,
  entity = "money",
}: {
  rows: readonly RangeRow[];
  label: string;
  entity?: Entity;
}) {
  const top = Math.max(...rows.flatMap((row) => [row.high, row.actual ?? 0]), 1);
  return (
    <ul aria-label={label} className={`${ENTITY[entity]} m-0 list-none p-0`}>
      {rows.map((row) => {
        const summary = `${dayLabel(row.day)} : ${row.actual == null ? "" : `${money(row.actual)}, `}médiane ${money(row.median)}, de ${money(row.low)} à ${money(row.high)}`;
        return (
          <li key={row.day} className="g-range-row" title={summary}>
            <span className="whitespace-nowrap text-muted">{dayLabel(row.day)}</span>
            <span
              className="g-range-track"
              aria-label={summary}
              role="img"
              style={{ "--g-low": row.low / top, "--g-high": row.high / top } as CSSProperties}
            >
              <i className="g-range-band" />
              <i className="g-range-tick" style={{ "--g-at": row.median / top } as CSSProperties} />
              {row.actual != null && (
                <i className="g-range-dot" style={{ "--g-at": row.actual / top } as CSSProperties} />
              )}
            </span>
            <span className="flex items-center justify-end font-semibold">
              {row.outside === "below" ? (
                <Chip tone="problem">↓ {money(row.actual ?? 0)}</Chip>
              ) : (
                `${row.outside === "above" ? "↑ " : ""}${money(row.actual ?? row.median)}`
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Un ratio de coût face à son objectif : plus bas vaut mieux, le dépassement se voit. */
export function TargetRow({
  label,
  value,
  target,
  title,
}: {
  label: string;
  value: number | null;
  target: number;
  title?: string;
}) {
  const top = Math.max(target * 1.5, value ?? 0, 1);
  const over = value != null && value > target;
  return (
    <div className={`g-range-row g-range-row-wide ${over ? ENTITY.problem : ENTITY.money}`} title={title}>
      <span className="text-muted">{label}</span>
      <span
        className="g-range-track"
        role="img"
        aria-label={`${label} : ${percentOf(value, 1)}, objectif ${percentOf(target)}`}
      >
        <i className="g-range-fill" style={{ "--g-v": (value ?? 0) / top } as CSSProperties} />
        <i className="g-range-tick" style={{ "--g-at": target / top } as CSSProperties} />
      </span>
      <span className="flex items-center justify-end font-semibold">
        {over ? <Chip tone="problem">{percentOf(value, 1)}</Chip> : percentOf(value, 1)}
      </span>
    </div>
  );
}
