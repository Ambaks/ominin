import { formatCents } from "@/lib/club/format";
import { parisDate } from "@/lib/collect/hours";

const HOUR_MS = 3_600_000;

/** Le soir de service en cours : avant l'heure de bascule, c'est encore la veille. */
export const serviceDateOf = (instant: number, dayEndHour: number) => parisDate(new Date(instant - dayEndHour * HOUR_MS));

export const currentServiceDate = (dayEndHour: number) => serviceDateOf(Date.now(), dayEndHour);

// Des dates civiles (« 2026-11-07 »), lues à midi UTC : aucun fuseau ne les fait changer de jour.
const civil = (date: string) => new Date(`${date}T12:00:00Z`);
const NIGHT_FORMATS = {
  long: {
    day: new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric" }),
    dayMonth: new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }),
  },
  short: {
    day: new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short", day: "numeric" }),
    dayMonth: new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }),
  },
};

/**
 * Le soir d'une bulle, celui du jour de service où le créneau a été réservé :
 * « samedi 7 novembre », ou pour un créneau d'après minuit « nuit du samedi 7
 * au dimanche 8 novembre » (court : « nuit du sam. 7 au dim. 8 nov. »).
 */
export function formatBulleNight(startsAt: string, dayEndHour: number, short = false): string {
  const instant = Date.parse(startsAt);
  const night = serviceDateOf(instant, dayEndHour);
  const calendar = parisDate(new Date(instant));
  const { day, dayMonth } = NIGHT_FORMATS[short ? "short" : "long"];
  if (night === calendar) return dayMonth.format(civil(night));
  const sameMonth = night.slice(0, 7) === calendar.slice(0, 7);
  return `nuit du ${(sameMonth ? day : dayMonth).format(civil(night))} au ${dayMonth.format(civil(calendar))}`;
}

/** « Nuit du samedi 7… » en tête d'une ligne. */
export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

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

/** Les prix d'une place et le seuil qui les sépare (bulle_reglages). */
export type BullePricing = {
  placeCents: number;
  smallGroupPlaceCents: number | null;
  groupThreshold: number;
};

/** Le prix d'une place pour un groupe de cette taille, à l'affichage : la base calcule le sien (bulle_prix_place). */
export const bullePlaceCents = (pricing: BullePricing, party: number) =>
  party < pricing.groupThreshold && pricing.smallGroupPlaceCents !== null
    ? pricing.smallGroupPlaceCents
    : pricing.placeCents;

/** Les places payées qui confirment un groupe de cette taille (bulle_places_confirmation). */
export const bulleConfirmPlaces = (party: number, groupThreshold: number) => Math.min(party, groupThreshold);

/** « 14,90 € par personne à 2, 9,90 € dès 3 », ou le seul prix sans tarif distinct. */
export function formatBulleTarifs(pricing: BullePricing, minParty: number): string {
  const { placeCents, smallGroupPlaceCents: small, groupThreshold: threshold } = pricing;
  if (small === null || minParty >= threshold) return `${formatCents(placeCents)} par personne`;
  const group = minParty === threshold - 1 ? `à ${minParty}` : `de ${minParty} à ${threshold - 1}`;
  return `${formatCents(small)} par personne ${group}, ${formatCents(placeCents)} dès ${threshold}`;
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
