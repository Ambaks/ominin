"use client";

import { WEEK_DAYS } from "@/lib/gestion/constants";

/** Les jours de la semaine à cocher, lundi en tête (jours ISO). */
export function DayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  const toggle = (iso: number) =>
    onChange(
      value.includes(iso)
        ? value.filter((day) => day !== iso)
        : [...value, iso].sort((a, b) => a - b)
    );

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
        Jours <span className="text-ember-2">*</span>
      </span>
      <div className="flex gap-1.5">
        {WEEK_DAYS.map((day) => {
          const picked = value.includes(day.iso);
          return (
            <button
              key={day.iso}
              type="button"
              onClick={() => toggle(day.iso)}
              aria-pressed={picked}
              aria-label={day.long}
              className={`flex size-9 items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                picked
                  ? "ember-gradient text-background"
                  : "border border-hairline text-muted hover:border-ember-2/40 hover:text-foreground"
              }`}
            >
              {day.short}
            </button>
          );
        })}
      </div>
    </div>
  );
}
