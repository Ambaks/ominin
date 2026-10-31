import { toMinutes, type OpeningHours } from "@/lib/collect/hours";
import { WEEK_DAYS } from "@/lib/gestion/constants";
import type { Formule } from "@/lib/gestion/types";

/*
 * « Quand ? » du constructeur de formules : trois cartes. Toujours ; le midi
 * en semaine, déduit des horaires d'ouverture (décision 13) ; ou un choix
 * libre de jours et d'heures.
 *
 * Constantes posées ici, dans le périmètre de la session carte, en attendant
 * l'arbitrage de la tête (lib/gestion/constants.ts est gelé).
 */

/** Créneau du midi quand les horaires ne permettent pas de le déduire. */
export const LUNCH_FALLBACK = { startsAt: "11:30", endsAt: "14:30" } as const;
/** Une plage d'ouverture qui couvre cette heure est un service du midi. */
const LUNCH_PIVOT = "12:30";

export const WEEKDAYS = WEEK_DAYS.slice(0, 5).map((day) => day.iso);
export const ALL_DAYS = WEEK_DAYS.map((day) => day.iso);

export type Quand = "toujours" | "midi" | "choix";

export interface Window {
  startsAt: string;
  endsAt: string;
}

/**
 * Le service du midi, lu dans les horaires de la semaine : la plage qui couvre
 * 12 h 30 chaque jour ouvré, de la première ouverture à la dernière fermeture.
 */
export function lunchWindow(hours: OpeningHours | null): Window {
  const pivot = toMinutes(LUNCH_PIVOT);
  const ranges = WEEKDAYS.flatMap((day) => hours?.[String(day)] ?? []).filter(
    ([open, close]) => toMinutes(open) <= pivot && toMinutes(close) > pivot
  );
  if (ranges.length === 0) return LUNCH_FALLBACK;
  const startsAt = ranges.map(([open]) => open).sort()[0];
  const endsAt = ranges.map(([, close]) => close).sort().at(-1)!;
  return { startsAt: startsAt.slice(0, 5), endsAt: endsAt.slice(0, 5) };
}

const sameDays = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().every((day, index) => day === [...b].sort()[index]);

/** La carte qui décrit une formule existante. */
export function quandOf(formule: Formule | undefined, lunch: Window): Quand {
  if (!formule || (!formule.days && !formule.hours)) return "toujours";
  return formule.days &&
    sameDays(formule.days, WEEKDAYS) &&
    formule.hours?.startsAt.slice(0, 5) === lunch.startsAt &&
    formule.hours.endsAt.slice(0, 5) === lunch.endsAt
    ? "midi"
    : "choix";
}
