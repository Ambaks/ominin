import { parisDate } from "@/lib/collect/hours";

const HOUR_MS = 3_600_000;

/** Le soir de service en cours : avant l'heure de bascule, c'est encore la veille. */
export const currentServiceDate = (dayEndHour: number) => parisDate(new Date(Date.now() - dayEndHour * HOUR_MS));

/** 120 → « 2 h », 90 → « 1 h 30 », 45 → « 45 min ». */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, "0")}`;
}

/**
 * L'heure de début d'un créneau, en minutes depuis minuit du soir
 * (bulle_creneaux.start_minutes ; au-delà de 24 h, la nuit) : 1200 → « 20h00 »,
 * 1500 → « 01h00 ».
 */
export function formatStartMinutes(minutes: number): string {
  const inDay = minutes % 1440;
  return `${String(Math.floor(inDay / 60)).padStart(2, "0")}h${String(inDay % 60).padStart(2, "0")}`;
}

/** Les jours ISO (1 = lundi) comme les écrit la gestion. */
export const WEEKDAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;

/** « 2026-10-26 » + n jours, en restant sur des dates civiles. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Jour ISO (1 = lundi … 7 = dimanche) d'une date civile. */
export function isoWeekday(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return ((new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7) + 1;
}
