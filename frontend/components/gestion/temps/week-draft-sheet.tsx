"use client";

import { useEffect, useState } from "react";
import { TrashIcon } from "@/components/gestion/icons";
import { Chip, ErrorNotice, Field, GlassButton, Input, Select, Sheet, Shimmer } from "@/components/gestion/ui";
import { dayLabel, Fact, money } from "@/components/gestion/analyses/parts";
import { useToast } from "@/components/ui/toast";
import {
  draftWeek,
  lastWeekHours,
  nextMondayAfter,
  serverRatio,
  shiftHours,
  weekSavings,
  type DraftShift,
  type StaffingData,
  type StaffTeam,
} from "@/lib/gestion/analyses";
import { saveServerRatio } from "@/lib/gestion/api";
import { ANALYSES, ENCAISSER_WAIT_WARN_MINUTES } from "@/lib/gestion/constants";
import { describeError } from "@/lib/gestion/errors";
import { visibleStaff } from "@/lib/gestion/selectors";
import { addDays, createShifts, loadWeek, type Shift } from "@/lib/gestion/temps";
import type { Staff } from "@/lib/gestion/types";
import { useStaffing } from "@/lib/gestion/use-staffing";

const TEAM_LABEL: Record<StaffTeam, string> = { cuisine: "Cuisine", salle: "Salle" };
const SERVICE_HOURS = Array.from({ length: 25 }, (_, hour) => hour);

type Line = DraftShift & { key: number };

/** L'instant réel d'une heure de service : le jour de service commence à la bascule du restaurant. */
function instant(day: string, hour: number, dayEndHour: number): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date, hour + dayEndHour);
}

/**
 * Le brouillon de la semaine prochaine, à relire ligne à ligne. Rien n'entre au planning
 * avant la confirmation, et ce qui s'y trouve déjà ne bouge pas.
 */
function DraftBody({
  etablissementId,
  staff,
  data,
  to,
  ratio,
  dayEndHour,
  ratioChanged,
  ratioField,
  onClose,
  onSaved,
}: {
  etablissementId: string;
  staff: Staff[];
  data: StaffingData;
  to: string;
  ratio: number;
  dayEndHour: number;
  ratioChanged: boolean;
  ratioField: React.ReactNode;
  onClose: () => void;
  onSaved: (nextWeek: Date) => void;
}) {
  const toast = useToast();
  const [draft] = useState(() => draftWeek(data, to, ratio, ENCAISSER_WAIT_WARN_MINUTES));
  const [lines, setLines] = useState<Line[]>(() => draft.shifts.map((shift, key) => ({ ...shift, key })));
  // Nul tant que le planning n'est pas lu : sans lui, on ne sait pas ce qui ferait doublon.
  const [existing, setExisting] = useState<Shift[] | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const nextMonday = nextMondayAfter(to);
  const weekStartsAt = instant(nextMonday, 0, dayEndHour);

  useEffect(() => {
    let cancelled = false;
    loadWeek(etablissementId, weekStartsAt, addDays(weekStartsAt, 7)).then(
      (week) => {
        if (!cancelled) setExisting(week.shifts);
      },
      (error: unknown) => {
        if (!cancelled) setLoadError(error);
      }
    );
    return () => {
      cancelled = true;
    };
    // weekStartsAt se déduit de nextMonday et dayEndHour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etablissementId, nextMonday, dayEndHour]);

  const team = visibleStaff(staff);
  const people = (line: Line) =>
    team.filter((member) => (line.team === "cuisine" ? member.role === "cuisinier" : member.role !== "cuisinier"));
  const clock = (hour: number) => `${(hour + dayEndHour) % 24}h`;
  const update = (key: number, change: Partial<Line>) =>
    setLines((all) => all.map((line) => (line.key === key ? { ...line, ...change } : line)));
  const days = Array.from({ length: 7 }, (_, index) => {
    const [year, month, date] = nextMonday.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, date + index)).toISOString().slice(0, 10);
  });
  const addLine = (day: string, lineTeam: StaffTeam) => {
    const first = lines.find((line) => line.day === day);
    const startHour = first?.startHour ?? 0;
    setLines((all) => [
      ...all,
      {
        key: Math.max(0, ...all.map((line) => line.key)) + 1,
        day,
        team: lineTeam,
        startHour,
        endHour: Math.min(24, startHour + ANALYSES.staffing.minShiftHours),
        staffId: null,
      },
    ]);
  };

  const backwards = lines.some((line) => line.endHour <= line.startHour);
  const hours = lines.reduce((sum, line) => sum + Math.max(0, shiftHours(line)), 0);
  const savings = weekSavings(draft.usualHours, hours);
  const hourlyCost = data.settings?.hourly_labor_cost ?? null;
  const lastWeek = lastWeekHours(data, to);
  const hoursLabel = (value: number) => `${Math.round(value).toLocaleString("fr-FR")} h`;
  const saved = (value: number) =>
    hourlyCost != null ? `≈ ${money(value * hourlyCost)} · ${hoursLabel(value)}` : `≈ ${hoursLabel(value)}`;

  const overlapsExisting = (line: Line) => {
    const start = instant(line.day, line.startHour, dayEndHour).getTime();
    const end = instant(line.day, line.endHour, dayEndHour).getTime();
    return (existing ?? []).some(
      (shift) =>
        shift.staffId === line.staffId && Date.parse(shift.startsAt) < end && start < Date.parse(shift.endsAt)
    );
  };
  const doubled = lines.some((line) =>
    lines.some(
      (other) =>
        other.key !== line.key &&
        other.staffId != null &&
        other.staffId === line.staffId &&
        other.day === line.day &&
        other.startHour < line.endHour &&
        line.startHour < other.endHour
    )
  );
  const invalid = backwards || doubled || existing == null;
  const toPlace = lines.filter((line) => line.staffId != null && !overlapsExisting(line));
  const open = lines.filter((line) => line.staffId == null).length;
  const skipped = lines.filter((line) => line.staffId != null && overlapsExisting(line)).length;

  const save = async () => {
    setBusy(true);
    try {
      // Le ratio d'abord : un échec ici ne laisse aucun créneau posé à doublonner.
      if (ratioChanged) await saveServerRatio(ratio);
      await createShifts(
        etablissementId,
        toPlace.map((line) => ({
          staffId: line.staffId as string,
          startsAt: instant(line.day, line.startHour, dayEndHour).toISOString(),
          endsAt: instant(line.day, line.endHour, dayEndHour).toISOString(),
        }))
      );
      toast.success(`${toPlace.length} créneau${toPlace.length > 1 ? "x" : ""} ajouté${toPlace.length > 1 ? "s" : ""} au planning.`);
      onSaved(weekStartsAt);
    } catch (error) {
      toast.error(describeError(error).message);
      setBusy(false);
    }
  };

  return (
    <Sheet
      title="Planning proposé pour la semaine prochaine"
      description="Un brouillon d’après les commandes prévues. À relire : il ne connaît ni les contrats, ni les congés, ni les pauses."
      size="wide"
      onClose={onClose}
      footer={
        <>
          {(open > 0 || skipped > 0 || backwards || doubled) && (
            <p role="status">
              {[
                backwards ? "Un créneau finit avant de commencer" : null,
                doubled ? "Une personne a deux créneaux en même temps" : null,
                open > 0 ? `${open} à pourvoir ne ser${open > 1 ? "ont" : "a"} pas posé${open > 1 ? "s" : ""}` : null,
                skipped > 0 ? `${skipped} déjà couvert${skipped > 1 ? "s" : ""} au planning` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton variant="primary" disabled={busy || invalid || toPlace.length === 0} onClick={save}>
            {busy ? "Ajout…" : "Ajouter au planning"}
          </GlassButton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {loadError != null && <ErrorNotice error={loadError} />}
        <div className="grid gap-x-8 lg:grid-cols-2">
          <div>
            {ratioField}
            {lastWeek != null && <Fact label="Dernière semaine complète" value={hoursLabel(lastWeek)} />}
            <Fact label="Semaine habituelle" value={hoursLabel(draft.usualHours)} />
            <Fact label="Planning proposé" value={hoursLabel(hours)} />
          </div>
          {draft.usualHours > 0 && savings.week >= 1 ? (
            <div>
              <Fact label="Économie sur la semaine" value={saved(savings.week)} />
              <Fact label="Sur un mois" value={saved(savings.month)} />
              <Fact label="Sur un an, si chaque semaine lui ressemble" value={saved(savings.year)} />
            </div>
          ) : (
            <p className="self-center text-g-meta text-muted">
              {draft.usualHours > 0 ? "Pas d’économie : le volume prévu demande au moins l’équipe habituelle." : "Pas encore de pointages pour comparer."}
            </p>
          )}
        </div>

        {days.map((day) => {
          const ofDay = lines.filter((line) => line.day === day);
          return (
            <section key={day} aria-label={dayLabel(day)} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">{dayLabel(day)}</h3>
                <span className="flex gap-2">
                  <GlassButton aria-label={`Ajouter en salle, ${dayLabel(day)}`} onClick={() => addLine(day, "salle")}>+ Salle</GlassButton>
                  <GlassButton aria-label={`Ajouter en cuisine, ${dayLabel(day)}`} onClick={() => addLine(day, "cuisine")}>+ Cuisine</GlassButton>
                </span>
              </div>
              {ofDay.length === 0 && <p className="text-g-meta text-muted">Rien de prévu ce jour-là.</p>}
              {ofDay.map((line) => (
                <div
                  key={line.key}
                  role="group"
                  aria-label={`${TEAM_LABEL[line.team]}, ${clock(line.startHour)} à ${clock(line.endHour)}`}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[4rem_minmax(0,1fr)_6rem_6rem_auto]"
                >
                  <span className="text-g-meta text-muted max-sm:col-span-3">
                    {TEAM_LABEL[line.team]} {line.staffId == null && <Chip tone="problem">À pourvoir</Chip>}
                  </span>
                  <Select
                    className="max-sm:col-span-3"
                    aria-label={`Personne, ${dayLabel(day)}`}
                    value={line.staffId ?? ""}
                    onChange={(event) => update(line.key, { staffId: event.target.value || null })}
                  >
                    <option value="">À pourvoir</option>
                    {people(line).map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label="Début"
                    value={line.startHour}
                    onChange={(event) => update(line.key, { startHour: Number(event.target.value) })}
                  >
                    {SERVICE_HOURS.slice(0, 24).map((hour) => (
                      <option key={hour} value={hour}>
                        {clock(hour)}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label="Fin"
                    aria-invalid={line.endHour <= line.startHour || undefined}
                    value={line.endHour}
                    onChange={(event) => update(line.key, { endHour: Number(event.target.value) })}
                  >
                    {SERVICE_HOURS.slice(1).map((hour) => (
                      <option key={hour} value={hour}>
                        {clock(hour)}
                      </option>
                    ))}
                  </Select>
                  <GlassButton
                    variant="icon"
                    aria-label={`Retirer ce créneau, ${dayLabel(day)}, ${clock(line.startHour)}`}
                    onClick={() => setLines((all) => all.filter((other) => other.key !== line.key))}
                  >
                    <TrashIcon />
                  </GlassButton>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </Sheet>
  );
}

export function WeekDraftSheet({
  etablissementId,
  staff,
  dayEndHour,
  onClose,
  onSaved,
}: {
  etablissementId: string;
  staff: Staff[];
  dayEndHour: number;
  onClose: () => void;
  onSaved: (nextWeek: Date) => void;
}) {
  const { loaded, failed } = useStaffing(true, dayEndHour);
  const [typed, setTyped] = useState<string | null>(null);
  const [applied, setApplied] = useState<number | null>(null);

  if (!loaded) {
    return (
      <Sheet title="Semaine prochaine" onClose={onClose}>
        {failed ? (
          <ErrorNotice error={new Error("Les données du planning sont indisponibles.")} />
        ) : (
          <div className="flex flex-col gap-3" aria-busy>
            <Shimmer className="h-16 rounded-g-card" />
            <Shimmer className="h-48 rounded-g-card" />
          </div>
        )}
      </Sheet>
    );
  }

  const stored = serverRatio(loaded.data);
  const ratio = applied ?? stored;
  const parsed = Number((typed ?? String(ratio)).replace(",", "."));
  // La colonne s'arrête à 9 999,9 : au-delà, l'enregistrement échouerait.
  const valid = Number.isFinite(parsed) && parsed > 0 && parsed < 10000;
  const commit = () => {
    if (valid) setApplied(parsed);
  };

  return (
    <DraftBody
      // Un autre ratio refait le brouillon : les retouches repartent de zéro.
      key={ratio}
      etablissementId={etablissementId}
      staff={staff}
      data={loaded.data}
      to={loaded.to}
      ratio={ratio}
      dayEndHour={dayEndHour}
      ratioChanged={ratio !== stored}
      ratioField={
        <Field
          label="Commandes par serveur et par heure"
          hint="Toutes commandes confondues. Recalculer refait le brouillon et efface vos retouches."
          error={valid ? undefined : "Un nombre positif."}
        >
          <span className="flex items-center gap-2">
            <Input
              numeric
              value={typed ?? String(ratio)}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commit();
              }}
            />
            <GlassButton disabled={!valid || parsed === ratio} onClick={commit}>
              Recalculer
            </GlassButton>
          </span>
        </Field>
      }
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
