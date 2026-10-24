"use client";

import { inputClass } from "@/components/ui/field";
import { Toggle } from "@/components/ui/toggle";

/**
 * Toute la journée, ou un créneau (« 09:00 » → « 10:30 ») qui peut passer
 * minuit : les heures d'un tarif planifié ou d'une formule.
 */
export function HoursField({
  allDay,
  onAllDayChange,
  startsAt,
  onStartsAtChange,
  endsAt,
  onEndsAtChange,
}: {
  allDay: boolean;
  onAllDayChange: (allDay: boolean) => void;
  startsAt: string;
  onStartsAtChange: (time: string) => void;
  endsAt: string;
  onEndsAtChange: (time: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <label className="flex items-center gap-3">
        <Toggle checked={allDay} onChange={onAllDayChange} label="Toute la journée" />
        <span className="text-sm">Toute la journée</span>
      </label>
      {!allDay && (
        <div className="flex flex-wrap items-center gap-2">
          {/* inputClass prend toute la largeur : la case la tient à la mesure d'une heure. */}
          <span className="w-32">
            <input
              type="time"
              value={startsAt}
              onChange={(event) => onStartsAtChange(event.target.value)}
              aria-label="Heure de début"
              className={inputClass}
            />
          </span>
          <span className="text-sm text-faint">→</span>
          <span className="w-32">
            <input
              type="time"
              value={endsAt}
              onChange={(event) => onEndsAtChange(event.target.value)}
              aria-label="Heure de fin"
              className={inputClass}
            />
          </span>
          {startsAt !== "" && endsAt !== "" && startsAt >= endsAt && (
            <span className="w-full text-xs text-faint">
              Le créneau passe minuit : il se rattache au jour où il commence.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
