import { toCsv } from "@/lib/admin/csv";
import { serviceDate } from "./selectors";
import {
  addDays,
  formatDuration,
  plannedMinutes,
  weekStart,
  workedMinutes,
  type ReportData,
} from "./temps";
import type { Staff } from "./types";

/*
 * Le rapport d'heures, pour le gérant et son comptable : par personne, les
 * heures prévues, les heures badgées et leur différence, sur une semaine ou un
 * mois de service. Un pointage encore ouvert est signalé et ne compte pas : le
 * comptable ne paie pas une durée qui n'est pas finie.
 */

export type ReportKind = "semaine" | "mois";

export interface ReportPeriod {
  kind: ReportKind;
  from: Date;
  to: Date;
  label: string;
  /** Pour le nom du fichier : « 2026-11 », « semaine-2026-11-02 ». */
  slug: string;
}

const CSV_DELIMITER = ";";

const pad = (value: number) => String(value).padStart(2, "0");

/** La semaine ou le mois de service qui contient `anchor`, bornes à l'heure de bascule. */
export function reportPeriod(kind: ReportKind, anchor: Date, dayEndHour: number): ReportPeriod {
  if (kind === "semaine") {
    const from = weekStart(anchor, dayEndHour);
    const end = addDays(from, 6);
    const sameMonth = from.getMonth() === end.getMonth();
    const first = from.toLocaleDateString("fr-FR", { day: "numeric", ...(sameMonth ? {} : { month: "short" }) });
    return {
      kind,
      from,
      to: addDays(from, 7),
      label: `${first} – ${end.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`,
      slug: `semaine-${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`,
    };
  }
  const day = serviceDate(anchor, dayEndHour);
  const from = new Date(day.getFullYear(), day.getMonth(), 1, dayEndHour);
  return {
    kind,
    from,
    to: new Date(day.getFullYear(), day.getMonth() + 1, 1, dayEndHour),
    label: from.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    slug: `${from.getFullYear()}-${pad(from.getMonth() + 1)}`,
  };
}

/** Un instant dans la période d'avant ou d'après. */
export function nextAnchor({ kind, from, to }: ReportPeriod, step: -1 | 1): Date {
  if (step === 1) return to;
  return kind === "semaine" ? addDays(from, -7) : new Date(from.getFullYear(), from.getMonth() - 1, from.getDate(), from.getHours());
}

export interface ReportRow {
  key: string;
  name: string;
  planned: number;
  worked: number;
  difference: number;
  /** Pointages sans départ, laissés hors de `worked`. */
  open: number;
}

export interface HoursReport {
  rows: ReportRow[];
  total: ReportRow;
}

export function buildHoursReport(staff: Staff[], { shifts, entries }: ReportData): HoursReport {
  const known = new Set(staff.map((member) => member.id));
  const isRemoved = (entry: ReportData["entries"][number]) => !entry.staffId || !known.has(entry.staffId);
  const row = (key: string, name: string, staffId: string | null): ReportRow => {
    const mine = entries.filter((entry) =>
      staffId ? entry.staffId === staffId : isRemoved(entry) && entry.memberName === name
    );
    const finished = mine.filter((entry) => entry.endedAt);
    // Minutes entières dès la ligne : le total est la somme de ce qui s'affiche.
    const planned = Math.round(plannedMinutes(shifts.filter((shift) => shift.staffId === staffId)));
    const worked = Math.round(workedMinutes(finished, new Date()));
    return { key, name, planned, worked, difference: worked - planned, open: mine.length - finished.length };
  };

  const removed = new Set(entries.filter(isRemoved).map((entry) => entry.memberName));
  const rows = [
    ...staff.map((member) => row(member.id, member.name, member.id)),
    // Les heures survivent à une fiche retirée, sous le nom figé au badgeage.
    ...[...removed].sort((a, b) => a.localeCompare(b, "fr")).map((name) => row(`retire:${name}`, name, null)),
  ].filter((candidate, index) => {
    const member = staff[index];
    return !member?.hidden || candidate.planned > 0 || candidate.worked > 0 || candidate.open > 0;
  });
  const sum = (pick: (candidate: ReportRow) => number) => rows.reduce((total, candidate) => total + pick(candidate), 0);
  const planned = sum((candidate) => candidate.planned);
  const worked = sum((candidate) => candidate.worked);
  return {
    rows,
    total: { key: "total", name: "Total", planned, worked, difference: worked - planned, open: sum((candidate) => candidate.open) },
  };
}

/** « +1 h 30 », « −45 min » : la différence entre le badgé et le prévu. */
export function formatDifference(minutes: number): string {
  if (minutes === 0) return formatDuration(0);
  return `${minutes > 0 ? "+" : "−"}${formatDuration(Math.abs(minutes))}`;
}

/** Heures décimales à la française (« 37,50 ») : Excel en fait un nombre, le comptable additionne. */
const decimalHours = (minutes: number) => (minutes / 60).toFixed(2).replace(".", ",");

export function hoursReportCsv({ rows, total }: HoursReport, period: ReportPeriod): string {
  return toCsv<ReportRow>(
    [...rows, total],
    [
      { header: "Période", value: () => period.label },
      { header: "Personne", value: (row) => row.name },
      { header: "Heures prévues", value: (row) => decimalHours(row.planned) },
      { header: "Heures badgées", value: (row) => decimalHours(row.worked) },
      { header: "Écart (heures)", value: (row) => decimalHours(row.difference) },
      { header: "Pointages en cours (non comptés)", value: (row) => row.open },
    ],
    CSV_DELIMITER
  );
}
