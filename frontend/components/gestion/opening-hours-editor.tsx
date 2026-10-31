"use client";

import { useState } from "react";
import { GlassButton, Input } from "@/components/gestion/ui";
import { DAY_NAMES, type DayRanges, type OpeningHours } from "@/lib/collect/hours";

/*
 * Horaires par jour : des plages ouverture–fermeture (midi, soir…). Le click
 * & collect propose ses créneaux de retrait dedans ; un jour sans plage est
 * fermé. Les cinq jours de semaine se saisissent d'une seule ligne tant
 * qu'ils ont les mêmes plages ; « Jour par jour » les sépare, et une ligne
 * se recopie sur toute la semaine.
 */

const WEEKDAYS = ["1", "2", "3", "4", "5"] as const;
const WEEKEND = ["6", "7"] as const;

const sameRanges = (a: DayRanges, b: DayRanges) => JSON.stringify(a) === JSON.stringify(b);

function weekdaysAlike(value: OpeningHours): boolean {
  const first = value[WEEKDAYS[0]] ?? [];
  return WEEKDAYS.every((day) => sameRanges(value[day] ?? [], first));
}

function Row({
  label,
  ranges,
  invalid = false,
  onChange,
  copyAll,
}: {
  label: string;
  ranges: DayRanges;
  /** Une plage de ce jour est refusée : ses saisies le disent. */
  invalid?: boolean;
  onChange: (ranges: DayRanges) => void;
  /** Recopie ces plages sur les sept jours. */
  copyAll?: () => void;
}) {
  const name = label.toLowerCase();
  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="text-g-label font-semibold">{label}</span>
        <span className="flex flex-wrap items-center gap-1">
          {copyAll && ranges.length > 0 && (
            <button
              type="button"
              onClick={copyAll}
              className="g-press h-g-control rounded-full px-2.5 text-g-meta font-semibold text-muted"
            >
              Copier sur la semaine
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const last = ranges.at(-1);
              onChange([...ranges, [last?.[1] ?? "", ""]]);
            }}
            aria-label={`Ajouter une plage, ${name}`}
            className="g-press h-g-control rounded-full border border-hairline px-3 text-g-meta font-semibold text-muted"
          >
            + Plage
          </button>
        </span>
      </div>
      {ranges.length === 0 ? (
        <p className="text-g-meta text-faint">Fermé</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ranges.map(([open, close], r) => (
            <div key={r} className="flex items-center gap-2">
              <Input
                type="time"
                value={open}
                aria-label={`${label}, ouverture ${r + 1}`}
                aria-invalid={invalid || undefined}
                onChange={(event) =>
                  onChange(ranges.map((range, k) => (k === r ? [event.target.value, range[1]] : range)))
                }
                required
                className="tabular-nums"
              />
              <span className="text-faint" aria-hidden>
                –
              </span>
              <Input
                type="time"
                value={close}
                aria-label={`${label}, fermeture ${r + 1}`}
                aria-invalid={invalid || undefined}
                onChange={(event) =>
                  onChange(ranges.map((range, k) => (k === r ? [range[0], event.target.value] : range)))
                }
                required
                className="tabular-nums"
              />
              <GlassButton
                variant="icon"
                aria-label={`Retirer la plage ${r + 1} du ${name}`}
                onClick={() => onChange(ranges.filter((_, k) => k !== r))}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </GlassButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function OpeningHoursEditor({
  value,
  invalidDay,
  onChange,
}: {
  value: OpeningHours;
  /** Jour ISO (« 1 » à « 7 ») dont une plage est refusée à l'enregistrement. */
  invalidDay?: string;
  onChange: (next: OpeningHours) => void;
}) {
  // Séparés à la main, les jours restent séparés même redevenus identiques.
  const [perDay, setPerDay] = useState(() => !weekdaysAlike(value));
  const setDays = (days: readonly string[], ranges: DayRanges) =>
    onChange({ ...value, ...Object.fromEntries(days.map((day) => [day, ranges])) });
  const copyAll = (ranges: DayRanges) => setDays([...WEEKDAYS, ...WEEKEND], ranges);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-g-meta text-muted">
          {perDay
            ? "Chaque jour a ses plages. Regrouper reprend celles du lundi pour toute la semaine de travail."
            : "Du lundi au vendredi, les mêmes plages."}
        </p>
        <button
          type="button"
          onClick={() => {
            // Regrouper aligne mardi–vendredi sur le lundi.
            if (perDay) setDays(WEEKDAYS, value[WEEKDAYS[0]] ?? []);
            setPerDay(!perDay);
          }}
          className="g-press h-g-control rounded-full px-2.5 text-g-meta font-semibold text-ember-1"
        >
          {perDay ? "Regrouper lun–ven" : "Séparer les jours"}
        </button>
      </div>
      <div className="flex flex-col divide-y divide-hairline">
        {perDay ? (
          WEEKDAYS.map((day) => (
            <Row
              key={day}
              label={DAY_NAMES[Number(day) - 1]}
              ranges={value[day] ?? []}
              invalid={invalidDay === day}
              onChange={(ranges) => setDays([day], ranges)}
              copyAll={day === WEEKDAYS[0] ? () => copyAll(value[day] ?? []) : undefined}
            />
          ))
        ) : (
          <Row
            label="Lundi – vendredi"
            ranges={value[WEEKDAYS[0]] ?? []}
            invalid={invalidDay !== undefined && (WEEKDAYS as readonly string[]).includes(invalidDay)}
            onChange={(ranges) => setDays(WEEKDAYS, ranges)}
            copyAll={() => copyAll(value[WEEKDAYS[0]] ?? [])}
          />
        )}
        {WEEKEND.map((day) => (
          <Row
            key={day}
            label={DAY_NAMES[Number(day) - 1]}
            ranges={value[day] ?? []}
            invalid={invalidDay === day}
            onChange={(ranges) => setDays([day], ranges)}
          />
        ))}
      </div>
    </div>
  );
}

export interface HoursProblem {
  /** Jour ISO (« 1 » à « 7 ») de la plage refusée. */
  day: string;
  text: string;
}

/** Une plage dont la fermeture ne suit pas l'ouverture : à signaler. */
export function hoursProblem(hours: OpeningHours): HoursProblem | null {
  for (const [i, name] of DAY_NAMES.entries()) {
    for (const [open, close] of hours[String(i + 1)] ?? []) {
      if (!open || !close || close <= open) {
        return {
          day: String(i + 1),
          text: `${name} : l'heure de fermeture doit suivre l'ouverture (après minuit, coupez en deux plages).`,
        };
      }
    }
  }
  return null;
}
