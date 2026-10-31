"use client";

import { Input, Switch } from "@/components/gestion/ui";

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
      <Switch checked={allDay} onChange={onAllDayChange} label="Toute la journée" />
      {!allDay && (
        <div className="flex flex-wrap items-center gap-2">
          {/* La saisie prend toute la largeur : la case la tient à la mesure d'une heure. */}
          <span className="w-32">
            <Input
              type="time"
              value={startsAt}
              onChange={(event) => onStartsAtChange(event.target.value)}
              aria-label="Heure de début"
              className="tabular-nums"
            />
          </span>
          <span className="text-g-label text-faint" aria-hidden>→</span>
          <span className="w-32">
            <Input
              type="time"
              value={endsAt}
              onChange={(event) => onEndsAtChange(event.target.value)}
              aria-label="Heure de fin"
              className="tabular-nums"
            />
          </span>
          {startsAt !== "" && endsAt !== "" && startsAt >= endsAt && (
            <span className="w-full text-g-meta text-muted">
              Le créneau passe minuit : il se rattache au jour où il commence.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
