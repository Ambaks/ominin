import { parisParts, toMinutes } from "@/lib/collect/hours";
import type { MenuCategory, MenuItem } from "@/lib/menu-data";
import { WEEK_DAYS } from "./constants";
import { formatDays } from "./format";
import type { Closure, MenuTarget } from "./types";

/*
 * L'état des fermetures, lu par l'espace de gestion. C'est le miroir de
 * fermeture_active en base (20261013000001_fermetures_minimum.sql), qui seule
 * fait autorité pour les commandes : tout se compte en heure de service,
 * l'heure de Paris reculée de dayEndHour.
 */

const MINUTES_PER_DAY = 24 * 60;

export interface ServiceClock {
  /** Journée de service, "2026-10-13". */
  day: string;
  isoDay: number;
  /** Minutes écoulées depuis la bascule. */
  minutes: number;
}

export function serviceClock(now: Date, dayEndHour: number): ServiceClock {
  const paris = parisParts(now);
  // Recul sur l'heure affichée à Paris, comme `local_ts - interval` en base.
  const shifted = new Date(
    Date.parse(`${paris.date}T00:00:00Z`) +
      (paris.minutes - dayEndHour * 60) * 60_000
  );
  return {
    day: shifted.toISOString().slice(0, 10),
    isoDay: ((shifted.getUTCDay() + 6) % 7) + 1,
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

/** Une heure de Paris ("22:00") en minutes de service. */
export const serviceMinutes = (time: string, dayEndHour: number) =>
  (toMinutes(time) - dayEndHour * 60 + MINUTES_PER_DAY) % MINUTES_PER_DAY;

/**
 * Le créneau ne contient aucune minute : une fin qui précède le début dans
 * la journée de service. Une fin à la bascule vaut fin de journée.
 */
export function emptyWindow(
  startsAt: string,
  endsAt: string,
  dayEndHour: number
): boolean {
  const end = serviceMinutes(endsAt, dayEndHour);
  return end !== 0 && end <= serviceMinutes(startsAt, dayEndHour);
}

/** L'horaire seul, sans le forçage à la main. */
function closureScheduled(
  closure: Closure,
  clock: ServiceClock,
  dayEndHour: number
): boolean {
  if (!closure.startsAt || !closure.days?.includes(clock.isoDay)) return false;
  if (clock.minutes < serviceMinutes(closure.startsAt, dayEndHour)) return false;
  if (!closure.endsAt) return true;
  const end = serviceMinutes(closure.endsAt, dayEndHour);
  return end === 0 || clock.minutes < end;
}

export function closureActive(
  closure: Closure,
  clock: ServiceClock,
  dayEndHour: number
): boolean {
  return closure.overrideDay === clock.day
    ? Boolean(closure.overrideClosed)
    : closureScheduled(closure, clock, dayEndHour);
}

const targets = (closure: Closure, kind: MenuTarget["kind"], id: string) =>
  closure.targets.some((target) => target.kind === kind && target.id === id);

/** Les articles que la fermeture vise, catégories dépliées, dans l'ordre de la carte. */
export function targetedItems(
  closure: Closure,
  categories: MenuCategory[]
): MenuItem[] {
  return categories.flatMap((category) =>
    targets(closure, "category", category.id)
      ? category.items
      : category.items.filter((item) => targets(closure, "item", item.id))
  );
}

/**
 * Articles coupés en ce moment, avec la fermeture qui les coupe : la plus
 * ancienne quand plusieurs se recouvrent.
 */
export function closedItems(
  closures: Closure[],
  categories: MenuCategory[],
  clock: ServiceClock,
  dayEndHour: number
): Map<string, string> {
  const closed = new Map<string, string>();
  for (const closure of closures) {
    if (!closureActive(closure, clock, dayEndHour)) continue;
    for (const item of targetedItems(closure, categories)) {
      if (!closed.has(item.id)) closed.set(item.id, closure.name);
    }
  }
  return closed;
}

/** Ouverte, mais son horaire la fermera plus tard dans la journée : à quelle heure. */
export function closesLater(
  closure: Closure,
  clock: ServiceClock,
  dayEndHour: number
): string | null {
  if (closure.overrideDay === clock.day || !closure.startsAt) return null;
  if (!closure.days?.includes(clock.isoDay)) return null;
  return clock.minutes < serviceMinutes(closure.startsAt, dayEndHour)
    ? formatHeure(closure.startsAt)
    : null;
}

/** Rouverte à la main pendant son horaire : levée pour le reste de la journée. */
export const liftedToday = (closure: Closure, clock: ServiceClock) =>
  closure.overrideDay === clock.day && closure.overrideClosed === false;

/** L'heure où une fermeture active rouvrira d'elle-même. */
export function closureUntil(
  closure: Closure,
  clock: ServiceClock,
  dayEndHour: number
): string {
  return closure.overrideDay !== clock.day && closure.endsAt
    ? formatHeure(closure.endsAt)
    : dayEndLabel(dayEndHour);
}

// ---------------------------------------------------------------------------
// Mise en mots

/** « 22 h », « 22 h 30 », « minuit » : l'heure comme on la dit en salle. */
export function formatHeure(time: string): string {
  const [hours, minutes] = time.split(":");
  if (Number(hours) === 0 && minutes === "00") return "minuit";
  return `${Number(hours)} h${minutes === "00" ? "" : ` ${minutes}`}`;
}

/** L'heure où la journée de service bascule : « 5 h », ou « minuit ». */
export const dayEndLabel = (dayEndHour: number) =>
  dayEndHour === 0 ? "minuit" : `${dayEndHour} h`;

/** « Entrées », « Entrées et Plats », « Entrées, Plats et Desserts ». */
export const listFr = (names: string[]) =>
  names.length <= 1
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;

/** « Tous les jours », « du lundi au vendredi », « vendredi et samedi ». */
function describeDays(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  const consecutive = sorted.every((day, i) => i === 0 || day === sorted[i - 1] + 1);
  if (sorted.length >= 3 && sorted.length < WEEK_DAYS.length && consecutive) {
    const name = (iso: number) => WEEK_DAYS.find((day) => day.iso === iso)?.long;
    return `du ${name(sorted[0])} au ${name(sorted[sorted.length - 1])}`;
  }
  return formatDays(sorted);
}

/** « Tous les jours dès 22 h », « Du lundi au vendredi de 15 h à 23 h 30 ». */
export function describeSchedule(closure: Closure): string | null {
  if (!closure.startsAt || !closure.days) return null;
  const days = describeDays(closure.days);
  const hours = closure.endsAt
    ? `de ${formatHeure(closure.startsAt)} à ${formatHeure(closure.endsAt)}`
    : `dès ${formatHeure(closure.startsAt)}`;
  return `${days.charAt(0).toUpperCase()}${days.slice(1)} ${hours}`;
}

/** Ce que la fermeture coupe, dans l'ordre de la carte : « Entrées et Plats ». */
export function describeTargets(
  closure: Closure,
  categories: MenuCategory[]
): string {
  return listFr(
    categories.flatMap((category) =>
      targets(closure, "category", category.id)
        ? [category.name]
        : category.items
            .filter((item) => targets(closure, "item", item.id))
            .map((item) => item.name)
    )
  );
}
