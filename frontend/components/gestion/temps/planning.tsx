"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { formatTime } from "@/lib/gestion/format";
import {
  addDays,
  copyWeek,
  entriesOf,
  formatDuration,
  plannedMinutes,
  sameDay,
  shiftsOf,
  weekDays,
  workedMinutes,
  type EntrySpan,
  type Shift,
} from "@/lib/gestion/temps";
import type { Staff } from "@/lib/gestion/types";
import { ShiftModal } from "./shift-modal";
import { StaffModal } from "./staff-modal";

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

/** Grille du gérant : une ligne par fiche, sept colonnes, tout est cliquable. */
export function PlanningGrid({
  etablissementId,
  staff,
  shifts,
  start,
  onWeekChange,
  onChange,
}: {
  etablissementId: string;
  staff: Staff[];
  shifts: Shift[];
  start: Date;
  onWeekChange: (start: Date) => void;
  onChange: () => void;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState<{
    day: Date;
    member?: Staff;
    shift?: Shift;
  } | null>(null);
  // undefined : la modale est fermée. null : création d'une fiche.
  const [editingStaff, setEditingStaff] = useState<Staff | null | undefined>(
    undefined
  );
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

  const addStaff = (
    <button
      type="button"
      onClick={() => setEditingStaff(null)}
      className="rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
    >
      + Ajouter un serveur
    </button>
  );

  const staffModal = editingStaff !== undefined && (
    <StaffModal
      staff={editingStaff ?? undefined}
      onClose={() => setEditingStaff(undefined)}
      onSaved={() => {
        setEditingStaff(undefined);
        onChange();
      }}
    />
  );

  if (staff.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted">
          Personne dans l&rsquo;équipe pour l&rsquo;instant. Ajoutez vos
          serveurs : ils n&rsquo;ont pas besoin de compte pour figurer au
          planning ni pour badger.
        </p>
        {addStaff}
        {staffModal}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <WeekNav start={start} onChange={onWeekChange}>
        <div className="flex flex-wrap gap-2">
          {addStaff}
          <button
            type="button"
            onClick={() => void copyToNext()}
            disabled={copying || shifts.length === 0}
            className="rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground disabled:opacity-50"
          >
            Recopier sur la semaine suivante
          </button>
        </div>
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

            {staff.map((member) => {
              const mine = shiftsOf(shifts, member.id);
              return (
                <div key={member.id} className="contents">
                  <button
                    type="button"
                    onClick={() => setEditingStaff(member)}
                    title={`Fiche de ${member.name}`}
                    className="flex items-center bg-surface px-3 py-2 text-left transition-colors hover:bg-surface-raised"
                  >
                    <p className="truncate text-sm font-medium">{member.name}</p>
                  </button>
                  {days.map((day) => {
                    const cell = shiftsOf(shifts, member.id, day);
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
                          aria-label={`Ajouter un créneau pour ${member.name}`}
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
          staff={staff}
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
      {staffModal}
    </div>
  );
}

/**
 * La semaine de l'équipe, en lecture. C'est ce qu'il faut sur la tablette
 * partagée du restaurant, où « ma semaine » ne veut rien dire : chacun y
 * cherche son nom, et voit qui travaille avec lui.
 */
export function PlanningEquipe({
  staff,
  shifts,
  start,
}: {
  staff: Staff[];
  shifts: Shift[];
  start: Date;
}) {
  const nameById = new Map(staff.map((member) => [member.id, member.name]));
  return (
    <ul className="flex flex-col rounded-2xl border border-hairline bg-surface">
      {weekDays(start).map((day, index) => {
        const dayShifts = shifts
          .filter((shift) => sameDay(shift.startsAt, day))
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
        return (
          <li
            key={day.toDateString()}
            className={`flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-3.5 ${
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
            {dayShifts.length === 0 ? (
              <p className="text-sm text-faint">Personne</p>
            ) : (
              <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                {dayShifts.map((shift) => (
                  <span
                    key={shift.id}
                    className="rounded-lg border border-hairline px-2 py-1 text-xs"
                  >
                    {nameById.get(shift.staffId) ?? "—"}{" "}
                    <span className="tabular-nums text-muted">
                      {formatTime(shift.startsAt)}–{formatTime(shift.endsAt)}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Vue d'un membre sur sa semaine : ce qui est prévu, ce qui a été badgé. */
export function MonPlanning({
  staffId,
  shifts,
  entries,
  start,
}: {
  staffId: string;
  shifts: Shift[];
  entries: EntrySpan[];
  start: Date;
}) {
  const now = new Date();
  const mine = shiftsOf(shifts, staffId);
  const mineEntries = entriesOf(entries, staffId);
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
          const dayShifts = shiftsOf(mine, staffId, day);
          const dayEntries = entriesOf(mineEntries, staffId, day);
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
