import { formatCents } from "@/lib/club/format";
import { parisDate, parisInstant } from "@/lib/collect/hours";

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

/** Les prix d'une place, le seuil qui les sépare et le minimum facturé (bulle_reglages). */
export type BullePricing = {
  placeCents: number;
  smallGroupPlaceCents: number | null;
  groupThreshold: number;
  /** Une réservation paie au moins ces places, même à moins de personnes. */
  minBilledPlaces: number;
};

/** Le prix d'une place pour un groupe de cette taille, à l'affichage : la base calcule le sien (bulle_prix_place). */
export const bullePlaceCents = (pricing: BullePricing, party: number) =>
  party < pricing.groupThreshold && pricing.smallGroupPlaceCents !== null
    ? pricing.smallGroupPlaceCents
    : pricing.placeCents;

/** Les places qu'une réservation paie : le groupe, au moins le minimum facturé (bulle_places_facturees). */
export const bullePlacesFacturees = (party: number, minBilledPlaces: number) => Math.max(party, minBilledPlaces);

/** Le prix d'une réservation de cette taille. */
export const bulleTotalCents = (pricing: BullePricing, party: number) =>
  bullePlacesFacturees(party, pricing.minBilledPlaces) * bullePlaceCents(pricing, party);

/** Les places payées qui confirment une réservation de tant de places facturées (bulle_places_confirmation). */
export const bulleConfirmPlaces = (billedPlaces: number, groupThreshold: number) => Math.min(billedPlaces, groupThreshold);

/** Ce qu'une réservation sait de son argent : sa taille, son tarif, son minimum facturé, ce qui est payé. */
export type BulleCompte = {
  partySize: number;
  placeCents: number;
  minBilledPlaces: number;
  paidCents: number;
};

/**
 * Le reste dû au tarif de la taille actuelle (bulle_reste_cents), en centimes
 * et en places à payer, la dernière au plus au reste ; et le trop-perçu après
 * un changement de taille.
 */
export function bulleReste(compte: BulleCompte) {
  const due = bullePlacesFacturees(compte.partySize, compte.minBilledPlaces) * compte.placeCents;
  const cents = Math.max(due - compte.paidCents, 0);
  return { cents, places: Math.ceil(cents / compte.placeCents), trop: Math.max(compte.paidCents - due, 0) };
}

/** Les places facturées couvertes par ce qui est payé. */
export const bullePlacesCouvertes = (compte: BulleCompte) =>
  bullePlacesFacturees(compte.partySize, compte.minBilledPlaces) - bulleReste(compte).places;

/** Les places qui manquent encore pour confirmer. */
export const bulleManquePourConfirmer = (compte: BulleCompte, confirmPlaces: number) =>
  Math.ceil(Math.max(confirmPlaces * compte.placeCents - compte.paidCents, 0) / compte.placeCents);

/** Le prix de tant de places, la dernière au plus au reste (contribuer_bulle). */
export const bulleMontant = (places: number, placeCents: number, resteCents: number) =>
  Math.min(places * placeCents, resteCents);

/**
 * « 14,90 € par personne à 2, 9,90 € dès 3 », ou le seul prix sans tarif
 * distinct ; précédé de « Seul : 29,80 €, le prix de deux » quand on réserve à
 * moins que le minimum facturé.
 */
export function formatBulleTarifs(pricing: BullePricing, minParty: number): string {
  const { placeCents, smallGroupPlaceCents: small, groupThreshold: threshold, minBilledPlaces } = pricing;
  const from = Math.max(minParty, minBilledPlaces);
  let tarifs: string;
  if (small === null || from >= threshold) tarifs = `${formatCents(placeCents)} par personne`;
  else {
    const group = from === threshold - 1 ? `à ${from}` : `de ${from} à ${threshold - 1}`;
    tarifs = `${formatCents(small)} par personne ${group}, ${formatCents(placeCents)} dès ${threshold}`;
  }
  if (minParty >= minBilledPlaces) return tarifs;
  return `${formatSoloPrice(pricing)} · ${tarifs}`;
}

const COUNT_WORDS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];

/** « Seul : 29,80 €, le prix de deux ». */
export function formatSoloPrice(pricing: BullePricing): string {
  const billed = pricing.minBilledPlaces;
  return `Seul : ${formatCents(bulleTotalCents(pricing, 1))}, le prix de ${COUNT_WORDS[billed] ?? billed}`;
}

/** Ce que voit toute personne juste avant de payer : la règle de bulle_rembourser_part. */
export const BULLE_NO_REFUND =
  "Les sommes payées, acomptes compris, ne sont pas remboursées, sauf si la bulle ne peut pas être tenue.";

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

// Un créneau déborde d'au plus deux jours sur la nuit (start_minutes < 2880)
// et revient chaque semaine.
const CRENEAU_OVERFLOW_DAYS = 2;
const WEEK_DAYS = 7;

/**
 * Le créneau jusqu'à la fin duquel une table ouverte par l'accueil le reste :
 * celui en cours, ou entre deux créneaux le suivant. Même règle que la base
 * (bulle_fin_ouverture), qui fixe la fin.
 */
export function bulleOpeningSlot(
  creneaux: { weekday: number; start_minutes: number }[],
  durationMinutes: number,
  now: number
): { startsAt: string; endsAt: string } | null {
  const today = parisDate(new Date(now));
  let best: { start: number; end: number } | null = null;
  for (let offset = -CRENEAU_OVERFLOW_DAYS; offset <= WEEK_DAYS; offset++) {
    const date = addDays(today, offset);
    for (const creneau of creneaux) {
      if (creneau.weekday !== isoWeekday(date)) continue;
      const start = parisInstant(date, creneau.start_minutes).getTime();
      const end = start + durationMinutes * 60_000;
      if (end > now && (!best || end < best.end)) best = { start, end };
    }
  }
  return best && { startsAt: new Date(best.start).toISOString(), endsAt: new Date(best.end).toISOString() };
}
