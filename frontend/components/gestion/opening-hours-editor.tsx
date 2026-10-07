"use client";

import { DAY_NAMES, type DayRanges, type OpeningHours } from "@/lib/collect/hours";

const timeClass =
  "w-full min-w-0 rounded-lg border border-hairline bg-background px-2 py-1.5 text-sm tabular-nums outline-none focus:border-ember-2/50";

/**
 * Horaires par jour : des plages ouverture–fermeture (midi, soir…). Le click
 * & collect propose ses créneaux de retrait dedans ; un jour sans plage est
 * fermé.
 */
export function OpeningHoursEditor({
  value,
  onChange,
}: {
  value: OpeningHours;
  onChange: (next: OpeningHours) => void;
}) {
  const setDay = (day: string, ranges: DayRanges) =>
    onChange({ ...value, [day]: ranges });

  return (
    <div className="flex flex-col divide-y divide-hairline rounded-xl border border-hairline">
      {DAY_NAMES.map((name, i) => {
        const day = String(i + 1);
        const ranges = value[day] ?? [];
        return (
          <div key={day} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
            <span className="w-20 shrink-0 text-sm font-medium">{name}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {ranges.length === 0 && <span className="text-sm text-faint">Fermé</span>}
              {ranges.map(([open, close], r) => (
                <div key={r} className="flex items-center gap-1.5">
                  <input
                    type="time"
                    value={open}
                    aria-label={`${name}, ouverture ${r + 1}`}
                    onChange={(event) =>
                      setDay(day, ranges.map((range, k) => (k === r ? [event.target.value, range[1]] : range)))
                    }
                    required
                    className={timeClass}
                  />
                  <span className="text-faint">–</span>
                  <input
                    type="time"
                    value={close}
                    aria-label={`${name}, fermeture ${r + 1}`}
                    onChange={(event) =>
                      setDay(day, ranges.map((range, k) => (k === r ? [range[0], event.target.value] : range)))
                    }
                    required
                    className={timeClass}
                  />
                  <button
                    type="button"
                    onClick={() => setDay(day, ranges.filter((_, k) => k !== r))}
                    aria-label={`Retirer la plage ${r + 1} du ${name.toLowerCase()}`}
                    className="flex size-9 shrink-0 items-center justify-center text-lg text-muted hover:text-foreground"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const last = ranges.at(-1);
                setDay(day, [...ranges, [last?.[1] ?? "", ""]]);
              }}
              className="rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground"
            >
              + Plage
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Une plage dont la fermeture ne suit pas l'ouverture : à signaler. */
export function hoursProblem(hours: OpeningHours): string | null {
  for (const [i, name] of DAY_NAMES.entries()) {
    for (const [open, close] of hours[String(i + 1)] ?? []) {
      if (!open || !close || close <= open) {
        return `${name} : l'heure de fermeture doit suivre l'ouverture (après minuit, coupez en deux plages).`;
      }
    }
  }
  return null;
}
