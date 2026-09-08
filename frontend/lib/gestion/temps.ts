import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { check, must } from "@/lib/supabase/result";
import type { Member } from "./types";

/*
 * Temps de travail : le planning posé par le gérant et les badgeages signés
 * par l'équipe. Lecture directe de Supabase (RLS), par semaine — rien de tout
 * cela ne vit dans le store de gestion, qui ne porte que le service.
 */

export interface Shift {
  id: string;
  userId: string;
  startsAt: string;
  endsAt: string;
  note?: string;
}

export interface TimeEntry {
  id: string;
  userId: string;
  /** Nom figé au badgeage : la preuve ne bouge pas si le membre est renommé. */
  memberName: string;
  startedAt: string;
  endedAt?: string;
  signatureIn: string;
  signatureOut?: string;
  editedAt?: string;
}

export interface WeekData {
  shifts: Shift[];
  entries: TimeEntry[];
}

/** Lundi minuit de la semaine contenant `reference`. */
export function weekStart(reference: Date): Date {
  const date = new Date(reference);
  date.setHours(0, 0, 0, 0);
  // getDay() : 0 = dimanche, que la semaine française termine.
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Les sept jours de la semaine ouverte, du lundi au dimanche. */
export function weekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function sameDay(iso: string, day: Date): boolean {
  return new Date(iso).toDateString() === day.toDateString();
}

/** « 2 h 30 » — durées de travail, jamais des heures d'horloge. */
export function formatDuration(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  if (!hours) return `${rounded} min`;
  return `${hours} h ${String(rounded % 60).padStart(2, "0")}`;
}

export function minutesBetween(from: string, to: string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / 60_000;
}

/** Minutes travaillées, la période en cours comptée jusqu'à maintenant. */
export function workedMinutes(entries: TimeEntry[], now: Date): number {
  return entries.reduce(
    (sum, entry) =>
      sum + minutesBetween(entry.startedAt, entry.endedAt ?? now.toISOString()),
    0
  );
}

export function plannedMinutes(shifts: Shift[]): number {
  return shifts.reduce(
    (sum, shift) => sum + minutesBetween(shift.startsAt, shift.endsAt),
    0
  );
}

/** Créneau du jour d'un membre, pour rapprocher badgeage et planning. */
export function shiftsOf(shifts: Shift[], userId: string, day?: Date): Shift[] {
  return shifts.filter(
    (shift) =>
      shift.userId === userId && (!day || sameDay(shift.startsAt, day))
  );
}

export function entriesOf(
  entries: TimeEntry[],
  userId: string,
  day?: Date
): TimeEntry[] {
  return entries.filter(
    (entry) =>
      entry.userId === userId && (!day || sameDay(entry.startedAt, day))
  );
}

/** Badgeage ouvert d'un membre : il est présent. */
export function openEntry(
  entries: TimeEntry[],
  userId: string
): TimeEntry | undefined {
  return entries.find((entry) => entry.userId === userId && !entry.endedAt);
}

/** Nom d'affichage d'un membre, celui que porteront ses badgeages. */
export function displayNameOf(member: Member): string {
  return member.displayName ?? member.email;
}

// ---------------------------------------------------------------------------
// Lecture

type EntryRow = Tables<"time_entries">;

function rowToEntry(row: EntryRow): TimeEntry {
  return {
    id: row.id,
    userId: row.user_id,
    memberName: row.member_name,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    signatureIn: row.signature_in,
    signatureOut: row.signature_out ?? undefined,
    editedAt: row.edited_at ?? undefined,
  };
}

/**
 * Qui est en service, maintenant. La badgeuse ne raisonne pas par semaine :
 * elle a besoin des périodes ouvertes, y compris celle d'un service commencé
 * hier soir, quelle que soit la semaine que l'écran affiche par ailleurs.
 */
export async function loadOpenEntries(
  etablissementId: string
): Promise<TimeEntry[]> {
  return must(
    await createClient()
      .from("time_entries")
      .select("*")
      .eq("etablissement_id", etablissementId)
      .is("ended_at", null)
      .order("started_at")
  ).map(rowToEntry);
}

export async function loadWeek(
  etablissementId: string,
  from: Date,
  to: Date
): Promise<WeekData> {
  const supabase = createClient();
  const [shifts, entries] = await Promise.all([
    supabase
      .from("shifts")
      .select("*")
      .eq("etablissement_id", etablissementId)
      .gte("starts_at", from.toISOString())
      .lt("starts_at", to.toISOString())
      .order("starts_at"),
    supabase
      .from("time_entries")
      .select("*")
      .eq("etablissement_id", etablissementId)
      // Une période ouverte avant la fenêtre (nuit à cheval, départ oublié)
      // doit rester visible : c'est elle qu'il faut fermer ou corriger.
      .or(`started_at.gte.${from.toISOString()},ended_at.is.null`)
      .lt("started_at", to.toISOString())
      .order("started_at"),
  ]);
  return {
    shifts: must(shifts).map((row) => ({
      id: row.id,
      userId: row.user_id,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      note: row.note ?? undefined,
    })),
    entries: must(entries).map(rowToEntry),
  };
}

// ---------------------------------------------------------------------------
// Badgeuse

export async function clockIn(
  etablissementId: string,
  member: Member,
  signature: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("time_entries").insert({
    etablissement_id: etablissementId,
    user_id: member.userId,
    member_name: displayNameOf(member),
    signature_in: signature,
    created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
  });
  if (error) {
    // Index partiel : un membre déjà arrivé ne peut pas l'être deux fois.
    throw new Error(
      error.message.includes("time_entries_open_idx")
        ? `${displayNameOf(member)} a déjà badgé son arrivée.`
        : error.message
    );
  }
}

/** L'heure retenue est celle du serveur (trigger) : la tablette peut dérégler. */
export async function clockOut(
  entryId: string,
  signature: string
): Promise<void> {
  check(
    await createClient()
      .from("time_entries")
      .update({ ended_at: new Date().toISOString(), signature_out: signature })
      .eq("id", entryId)
  );
}

// ---------------------------------------------------------------------------
// Corrections et planning (gérant)

export async function correctEntry(
  entryId: string,
  startedAt: string,
  endedAt: string | null
): Promise<void> {
  check(
    await createClient()
      .from("time_entries")
      .update({ started_at: startedAt, ended_at: endedAt })
      .eq("id", entryId)
  );
}

export async function deleteEntry(entryId: string): Promise<void> {
  check(await createClient().from("time_entries").delete().eq("id", entryId));
}

export interface ShiftInput {
  userId: string;
  startsAt: string;
  endsAt: string;
  note?: string;
}

export async function createShift(
  etablissementId: string,
  input: ShiftInput
): Promise<void> {
  check(
    await createClient().from("shifts").insert({
      etablissement_id: etablissementId,
      user_id: input.userId,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      note: input.note ?? null,
    })
  );
}

export async function updateShift(
  shiftId: string,
  input: ShiftInput
): Promise<void> {
  check(
    await createClient()
      .from("shifts")
      .update({
        user_id: input.userId,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        note: input.note ?? null,
      })
      .eq("id", shiftId)
  );
}

export async function deleteShift(shiftId: string): Promise<void> {
  check(await createClient().from("shifts").delete().eq("id", shiftId));
}

/**
 * Recopie la semaine sur la suivante : le service se répète, la saisie non.
 * Le décalage est de sept jours calendaires, pas de 168 heures — sinon le
 * week-end du changement d'heure décalerait tout le planning d'une heure.
 */
export async function copyWeek(
  etablissementId: string,
  shifts: Shift[]
): Promise<number> {
  if (!shifts.length) return 0;
  const shift = (iso: string) => addDays(new Date(iso), 7).toISOString();
  check(
    await createClient()
      .from("shifts")
      .insert(
        shifts.map((source) => ({
          etablissement_id: etablissementId,
          user_id: source.userId,
          starts_at: shift(source.startsAt),
          ends_at: shift(source.endsAt),
          note: source.note ?? null,
        }))
      )
  );
  return shifts.length;
}
