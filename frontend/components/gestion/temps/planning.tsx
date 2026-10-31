"use client";

import { useState } from "react";
import { EmptyState, GlassButton, Plate, Shimmer, StatTile } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { describeError } from "@/lib/gestion/errors";
import { formatTime } from "@/lib/gestion/format";
import { isPickupShop, visibleStaff } from "@/lib/gestion/selectors";
import { useGestion } from "@/lib/gestion/store";
import {
  addDays,
  copyWeek,
  entriesOf,
  formatDuration,
  plannedMinutes,
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
 * chaque membre retrouve la sienne en liste par son lien — avec ses badgeages
 * en regard quand le restaurant les lui montre.
 */

function dayLabel(day: Date): string {
  return day.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
}

function isToday(day: Date): boolean {
  return day.toDateString() === new Date().toDateString();
}

function Arrow({ left = false }: { left?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={left ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
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
        <GlassButton variant="icon" onClick={() => onChange(addDays(start, -7))} aria-label="Semaine précédente">
          <Arrow left />
        </GlassButton>
        <p className="text-center text-g-label font-semibold tabular-nums">
          {start.toLocaleDateString("fr-FR", {
            day: "numeric",
            ...(sameMonth ? {} : { month: "short" }),
          })}
          {" – "}
          {end.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
        </p>
        <GlassButton variant="icon" onClick={() => onChange(addDays(start, 7))} aria-label="Semaine suivante">
          <Arrow />
        </GlassButton>
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
  loading = false,
  onWeekChange,
  onChange,
}: {
  etablissementId: string;
  staff: Staff[];
  shifts: Shift[];
  start: Date;
  /** La semaine se relit : la grille attend avant de se dire vide. */
  loading?: boolean;
  onWeekChange: (start: Date) => void;
  onChange: () => void;
}) {
  const toast = useToast();
  const state = useGestion();
  const pickupShop = isPickupShop(state);
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
  // Une fiche masquée ne se planifie pas : elle attend dans Équipe.
  const team = visibleStaff(staff);

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
        describeError(error).message
      );
    } finally {
      setCopying(false);
    }
  };

  const addStaff = (
    <GlassButton onClick={() => setEditingStaff(null)}>
      {pickupShop ? "+ Ajouter un employé" : "+ Ajouter un serveur"}
    </GlassButton>
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

  if (team.length === 0) {
    return (
      <>
        <EmptyState
          text={`Personne dans l'équipe pour l'instant. Ajoutez vos ${pickupShop ? "employés" : "serveurs"} : ils n'ont pas besoin de compte pour figurer au planning ni pour badger.`}
          action={addStaff}
        />
        {staffModal}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <WeekNav start={start} onChange={onWeekChange}>
        <div className="flex flex-wrap items-center gap-2">
          {addStaff}
          {shifts.length > 0 ? (
            <GlassButton onClick={() => void copyToNext()} disabled={copying}>
              Recopier sur la semaine suivante
            </GlassButton>
          ) : (
            !loading && (
              <p className="text-g-meta text-muted">
                Aucun créneau cette semaine : touchez une case pour en ajouter un.
              </p>
            )
          )}
        </div>
      </WeekNav>

      {loading ? (
        <Shimmer className="h-40" />
      ) : (
      <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <p className="mb-2 text-g-meta text-muted lg:hidden">Faites glisser la grille pour voir toute la semaine.</p>
        <Plate className="min-w-4xl overflow-hidden">
          <div
            role="group"
            aria-label="Planning de la semaine"
            className="grid grid-cols-[9rem_repeat(7,1fr)_5rem] gap-px bg-hairline"
          >
            <div className="sticky left-0 z-10 bg-surface px-3 py-2.5" />
            {days.map((day) => (
              <div
                key={day.toDateString()}
                className={`bg-surface px-2 py-2.5 text-center text-g-meta font-semibold capitalize ${
                  isToday(day) ? "border-b-2 border-ember-1 text-ember-1" : "text-muted"
                }`}
              >
                {dayLabel(day)}
              </div>
            ))}
            <div className="bg-surface px-2 py-2.5 text-center text-g-meta font-semibold text-muted">
              Total
            </div>

            {team.map((member) => {
              const mine = shiftsOf(shifts, member.id);
              return (
                <div key={member.id} className="contents">
                  <button
                    type="button"
                    onClick={() => setEditingStaff(member)}
                    title={`Fiche de ${member.name}`}
                    className="sticky left-0 z-10 flex min-h-g-control items-center bg-surface px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1"
                  >
                    <span className="truncate text-g-label font-semibold">{member.name}</span>
                  </button>
                  {days.map((day) => {
                    const cell = shiftsOf(shifts, member.id, day);
                    return (
                      <div
                        key={day.toDateString()}
                        className={`flex min-h-16 flex-col gap-1 p-1.5 ${isToday(day) ? "bg-surface-raised" : "bg-surface"}`}
                      >
                        {cell.map((shift) => (
                          <button
                            key={shift.id}
                            type="button"
                            onClick={() => setEditing({ day, shift })}
                            title={shift.note}
                            className="g-press g-orders min-h-g-control rounded-lg border border-(--g-ring-hover) bg-surface-raised px-1.5 py-2 text-g-meta font-semibold tabular-nums text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1"
                          >
                            {formatTime(shift.startsAt)}–{formatTime(shift.endsAt)}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setEditing({ day, member })}
                          aria-label={`Ajouter un créneau pour ${member.name}`}
                          className="g-press flex min-h-g-control items-center justify-center rounded-lg border border-dashed border-hairline text-g-body text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1"
                        >
                          +
                        </button>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-center bg-surface px-2 py-2 text-g-meta tabular-nums text-muted">
                    {mine.length ? formatDuration(plannedMinutes(mine)) : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </Plate>
      </div>
      )}

      {editing && (
        <ShiftModal
          etablissementId={etablissementId}
          staff={team}
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
 * Vue d'un membre sur sa semaine : ses créneaux, et — si le restaurant le
 * montre — le total prévu, le total badgé et ses badgeages jour par jour.
 */
export function MonPlanning({
  staffId,
  shifts,
  entries,
  start,
  showHours,
}: {
  staffId: string;
  shifts: Shift[];
  entries: EntrySpan[];
  start: Date;
  showHours: boolean;
}) {
  const mine = shiftsOf(shifts, staffId);
  const mineEntries = entriesOf(entries, staffId);

  const week = (
    <Plate className="divide-y divide-hairline px-4">
      {weekDays(start).map((day) => {
        const dayShifts = shiftsOf(mine, staffId, day);
        const dayEntries = entriesOf(mineEntries, staffId, day);
        return (
          <div
            key={day.toDateString()}
            className={`flex flex-wrap items-start justify-between gap-3 py-3 ${isToday(day) ? "-mx-4 bg-surface-raised px-4" : ""}`}
          >
            <p
              className={`w-24 shrink-0 text-g-label capitalize ${
                isToday(day) ? "font-semibold text-ember-1" : "text-muted"
              }`}
            >
              {dayLabel(day)}
            </p>
            <div className="min-w-0 flex-1">
              {dayShifts.length === 0 && dayEntries.length === 0 ? (
                <p className="text-g-label text-muted">Repos</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {dayShifts.map((shift) => (
                    <p key={shift.id} className="text-g-label">
                      <span className="tabular-nums">
                        {formatTime(shift.startsAt)} – {formatTime(shift.endsAt)}
                      </span>
                      {shift.note && <span className="text-muted"> · {shift.note}</span>}
                    </p>
                  ))}
                  {dayEntries.map((entry) => (
                    <p key={entry.id} className="text-g-meta tabular-nums text-ember-2">
                      Badgé {formatTime(entry.startedAt)} –{" "}
                      {entry.endedAt ? formatTime(entry.endedAt) : "en cours"}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </Plate>
  );

  if (!showHours) return week;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <StatTile plain label="Prévu" value={formatDuration(plannedMinutes(mine))} />
        <StatTile
          plain
          entity="money"
          label="Badgé"
          value={formatDuration(workedMinutes(mineEntries, new Date()))}
        />
      </div>
      {week}
    </div>
  );
}
