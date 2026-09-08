"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { formatTime } from "@/lib/gestion/format";
import {
  addDays,
  copyWeek,
  displayNameOf,
  entriesOf,
  formatDuration,
  plannedMinutes,
  shiftsOf,
  weekDays,
  workedMinutes,
  type Shift,
  type TimeEntry,
} from "@/lib/gestion/temps";
import type { Member } from "@/lib/gestion/types";
import { ShiftModal } from "./shift-modal";

/*
 * Le planning de la semaine. Le gérant le pose dans une grille équipe × jours ;
 * chaque membre retrouve la sienne en liste, avec ses badgeages en regard —
 * l'écart entre ce qui était prévu et ce qui a été fait se lit d'un coup d'œil.
 */

function dayLabel(day: Date): string {
  return day.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
}

function isToday(day: Date): boolean {
  return day.toDateString() === new Date().toDateString();
}

export function WeekNav({
  start,
  onChange,
  children,
}: {
  start: Date;
  onChange: (start: Date) => void;
  children?: React.ReactNode;
}) {
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(addDays(start, -7))}
          aria-label="Semaine précédente"
          className="rounded-full border border-hairline px-3 py-1.5 text-sm text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
        >
          ‹
        </button>
        <p className="text-sm font-medium">
          {start.toLocaleDateString("fr-FR", {
            day: "numeric",
            ...(sameMonth ? {} : { month: "short" }),
          })}
          {" – "}
          {end.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
        </p>
        <button
          type="button"
          onClick={() => onChange(addDays(start, 7))}
          aria-label="Semaine suivante"
          className="rounded-full border border-hairline px-3 py-1.5 text-sm text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
        >
          ›
        </button>
      </div>
      {children}
    </div>
  );
}

/** Grille du gérant : une ligne par membre, sept colonnes, tout est cliquable. */
export function PlanningGrid({
  etablissementId,
  members,
  shifts,
  start,
  onWeekChange,
  onChange,
}: {
  etablissementId: string;
  members: Member[];
  shifts: Shift[];
  start: Date;
  onWeekChange: (start: Date) => void;
  onChange: () => void;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState<{
    day: Date;
    member?: Member;
    shift?: Shift;
  } | null>(null);
  const [copying, setCopying] = useState(false);
  const days = weekDays(start);

  const copyToNext = async () => {
    setCopying(true);
    try {
      const count = await copyWeek(etablissementId, shifts);
      toast.success(
        count
          ? `${count} créneau${count > 1 ? "x" : ""} recopié${count > 1 ? "s" : ""} sur la semaine suivante.`
          : "Rien à recopier."
      );
      onChange();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setCopying(false);
    }
  };

  if (members.length === 0) {
    return (
      <p className="text-sm text-muted">
        Invitez votre équipe pour lui poser un planning.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <WeekNav start={start} onChange={onWeekChange}>
        <button
          type="button"
          onClick={() => void copyToNext()}
          disabled={copying || shifts.length === 0}
          className="rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground disabled:opacity-50"
        >
          Recopier sur la semaine suivante
        </button>
      </WeekNav>

      <div className="-mx-5 overflow-x-auto px-5 lg:mx-0 lg:px-0">
        <div className="min-w-[52rem]">
          <div className="grid grid-cols-[9rem_repeat(7,1fr)_5rem] gap-px rounded-2xl border border-hairline bg-hairline">
            <div className="bg-surface-raised px-3 py-2.5" />
            {days.map((day) => (
              <div
                key={day.toDateString()}
                className={`bg-surface-raised px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider ${
                  isToday(day) ? "text-ember-1" : "text-faint"
                }`}
              >
                {dayLabel(day)}
              </div>
            ))}
            <div className="bg-surface-raised px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-faint">
              Total
            </div>

            {members.map((member) => {
              const mine = shiftsOf(shifts, member.userId);
              return (
                <div key={member.userId} className="contents">
                  <div className="flex items-center bg-surface px-3 py-2">
                    <p className="truncate text-sm font-medium">
                      {displayNameOf(member)}
                    </p>
                  </div>
                  {days.map((day) => {
                    const cell = shiftsOf(shifts, member.userId, day);
                    return (
                      <div
                        key={day.toDateString()}
                        className="flex min-h-14 flex-col gap-1 bg-surface p-1.5"
                      >
                        {cell.map((shift) => (
                          <button
                            key={shift.id}
                            type="button"
                            onClick={() => setEditing({ day, shift })}
                            title={shift.note}
                            className="rounded-lg border border-ember-2/30 bg-ember-2/10 px-1.5 py-1 text-[11px] font-semibold tabular-nums text-ember-2 transition-colors hover:border-ember-2/60"
                          >
                            {formatTime(shift.startsAt)}–{formatTime(shift.endsAt)}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setEditing({ day, member })}
                          aria-label={`Ajouter un créneau pour ${displayNameOf(member)}`}
                          className="rounded-lg py-0.5 text-xs text-faint transition-colors hover:bg-surface-raised hover:text-ember-1"
                        >
                          +
                        </button>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-center bg-surface px-2 py-2 text-xs tabular-nums text-muted">
                    {mine.length ? formatDuration(plannedMinutes(mine)) : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {editing && (
        <ShiftModal
          etablissementId={etablissementId}
          members={members}
          day={editing.day}
          shift={editing.shift}
          member={editing.member}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChange();
          }}
        />
      )}
    </div>
  );
}

/** Vue d'un membre sur sa semaine : ce qui est prévu, ce qui a été badgé. */
export function MonPlanning({
  userId,
  shifts,
  entries,
  start,
}: {
  userId: string;
  shifts: Shift[];
  entries: TimeEntry[];
  start: Date;
}) {
  const now = new Date();
  const mine = shiftsOf(shifts, userId);
  const mineEntries = entriesOf(entries, userId);
  const planned = plannedMinutes(mine);
  const worked = workedMinutes(mineEntries, now);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-hairline bg-surface p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
            Prévu
          </p>
          <p className="mt-1 font-display text-2xl tabular-nums">
            {formatDuration(planned)}
          </p>
        </div>
        <div className="rounded-2xl border border-hairline bg-surface p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
            Badgé
          </p>
          <p className="mt-1 font-display text-2xl tabular-nums text-ember-1">
            {formatDuration(worked)}
          </p>
        </div>
      </div>

      <ul className="flex flex-col rounded-2xl border border-hairline bg-surface">
        {weekDays(start).map((day, index) => {
          const dayShifts = shiftsOf(mine, userId, day);
          const dayEntries = entriesOf(mineEntries, userId, day);
          return (
            <li
              key={day.toDateString()}
              className={`flex flex-wrap items-start justify-between gap-3 px-5 py-3.5 ${
                index > 0 ? "border-t border-hairline" : ""
              } ${isToday(day) ? "bg-ember-2/[0.06]" : ""}`}
            >
              <p
                className={`w-24 shrink-0 text-sm capitalize ${
                  isToday(day) ? "font-medium text-ember-1" : "text-muted"
                }`}
              >
                {dayLabel(day)}
              </p>
              <div className="min-w-0 flex-1">
                {dayShifts.length === 0 && dayEntries.length === 0 ? (
                  <p className="text-sm text-faint">Repos</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {dayShifts.map((shift) => (
                      <p key={shift.id} className="text-sm">
                        <span className="tabular-nums">
                          {formatTime(shift.startsAt)} – {formatTime(shift.endsAt)}
                        </span>
                        {shift.note && (
                          <span className="text-faint"> · {shift.note}</span>
                        )}
                      </p>
                    ))}
                    {dayEntries.map((entry) => (
                      <p
                        key={entry.id}
                        className="text-xs tabular-nums text-ember-2"
                      >
                        Badgé {formatTime(entry.startedAt)} –{" "}
                        {entry.endedAt ? formatTime(entry.endedAt) : "en cours"}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
