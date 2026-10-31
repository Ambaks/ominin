import { toMinutes, type OpeningHours } from "@/lib/collect/hours";
import { LUNCH_FALLBACK, LUNCH_PIVOT, WEEK_DAYS } from "@/lib/gestion/constants";
import type { Formule } from "@/lib/gestion/types";
import type { RuleHours } from "@/lib/menu-data";

/*
 * « Quand ? » du constructeur de formules : trois cartes. Toujours ; le midi
 * en semaine, déduit des horaires d'ouverture (décision 13) ; ou un choix
 * libre de jours et d'heures.
 */

export const WEEKDAYS = WEEK_DAYS.slice(0, 5).map((day) => day.iso);
export const ALL_DAYS = WEEK_DAYS.map((day) => day.iso);

export type Quand = "toujours" | "midi" | "choix";

/**
 * Le service du midi, lu dans les horaires de la semaine : la plage qui couvre
 * le pivot chaque jour ouvré, de la première ouverture à la dernière fermeture.
 * Un service continu (la plage du midi file jusqu'au soir) n'a pas de midi
 * distinct : le repli s'applique. « Jusqu'au soir » = au-delà de la fin du
 * repli, plus la durée du repli.
 */
export function lunchWindow(hours: OpeningHours | null): RuleHours {
  const pivot = toMinutes(LUNCH_PIVOT);
  const [fallbackOpen, fallbackClose] = LUNCH_FALLBACK.map(toMinutes);
  const latestClose = fallbackClose + (fallbackClose - fallbackOpen);
  const ranges = WEEKDAYS.flatMap((day) => hours?.[String(day)] ?? []).filter(
    ([open, close]) =>
      toMinutes(open) <= pivot && toMinutes(close) > pivot && toMinutes(close) <= latestClose
  );
  const [startsAt, endsAt] =
    ranges.length === 0
      ? LUNCH_FALLBACK
      : [
          ranges.map(([open]) => open).sort()[0],
          ranges.map(([, close]) => close).sort().at(-1)!,
        ];
  return { startsAt: startsAt.slice(0, 5), endsAt: endsAt.slice(0, 5) };
}

const sameDays = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().every((day, index) => day === [...b].sort()[index]);

/** La carte qui décrit une formule existante. */
export function quandOf(formule: Formule | undefined, lunch: RuleHours): Quand {
  if (!formule || (!formule.days && !formule.hours)) return "toujours";
  return formule.days &&
    sameDays(formule.days, WEEKDAYS) &&
    formule.hours?.startsAt.slice(0, 5) === lunch.startsAt &&
    formule.hours.endsAt.slice(0, 5) === lunch.endsAt
    ? "midi"
    : "choix";
}
