import { parisParts, toMinutes } from "@/lib/collect/hours";
import type { MenuCategory, MenuItem } from "@/lib/menu-data";
import { WEEK_DAYS } from "./constants";
import { formatDays } from "./format";
import type { Closure, ClosureWindow, MenuTarget } from "./types";

/*
 * L'état des fermetures, lu par l'espace de gestion. C'est le miroir de
 * fermeture_active en base (20261024000002_fermetures_plages.sql), qui seule
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

/** Ordre d'affichage des plages : premier jour, puis heure de début. */
export const byWindowOrder = (a: ClosureWindow, b: ClosureWindow) =>
  a.days[0] - b.days[0] || a.startsAt.localeCompare(b.startsAt);

/** Fin de plage en minutes de service : la bascule (0) vaut fin de journée. */
const windowEnd = (window: ClosureWindow, dayEndHour: number) => {
  const end = window.endsAt ? serviceMinutes(window.endsAt, dayEndHour) : 0;
  return end === 0 ? MINUTES_PER_DAY : end;
};

const windowCovers = (
  window: ClosureWindow,
  isoDay: number,
  minutes: number,
  dayEndHour: number
) =>
  window.days.includes(isoDay) &&
  minutes >= serviceMinutes(window.startsAt, dayEndHour) &&
  minutes < windowEnd(window, dayEndHour);

/**
 * L'horaire seul, sans le forçage à la main, à une minute de la journée de
 * service. Sans plage : jamais coupée par l'horaire.
 */
function scheduledAt(
  closure: Closure,
  isoDay: number,
  minutes: number,
  dayEndHour: number
): boolean {
  if (closure.windows.length === 0) return false;
  const covered = closure.windows.some((window) =>
    windowCovers(window, isoDay, minutes, dayEndHour)
  );
  return covered !== closure.openWindows;
}

/**
 * Minute de service où l'horaire change d'état, la bascule (24 h) s'il n'en
 * change plus : le premier bord de plage à venir dont l'état diffère.
 * Miroir de fermeture_changement_suivant.
 */
function nextChange(closure: Closure, clock: ServiceClock, dayEndHour: number): number {
  const now = scheduledAt(closure, clock.isoDay, clock.minutes, dayEndHour);
  return Math.min(
    MINUTES_PER_DAY,
    ...closure.windows
      .flatMap((window) => [
        serviceMinutes(window.startsAt, dayEndHour),
        windowEnd(window, dayEndHour),
      ])
      .filter(
        (edge) =>
          edge > clock.minutes &&
          edge < MINUTES_PER_DAY &&
          scheduledAt(closure, clock.isoDay, edge, dayEndHour) !== now
      )
  );
}

/** Minute de service où le forçage cède, s'il court encore à cet instant. */
function overrideEnd(closure: Closure, clock: ServiceClock): number | null {
  if (closure.overrideUntil === null) return null;
  const end =
    (Date.parse(`${closure.overrideUntil}Z`) - Date.parse(`${clock.day}T00:00:00Z`)) /
    60_000;
  return clock.minutes < end ? end : null;
}

export function closureActive(
  closure: Closure,
  clock: ServiceClock,
  dayEndHour: number
): boolean {
  return overrideEnd(closure, clock) !== null
    ? Boolean(closure.overrideClosed)
    : scheduledAt(closure, clock.isoDay, clock.minutes, dayEndHour);
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

/** Une minute de service, dite à l'heure de Paris : « 19 h », ou la bascule. */
function serviceHeure(minutes: number, dayEndHour: number): string {
  if (minutes >= MINUTES_PER_DAY) return dayEndLabel(dayEndHour);
  const paris = (minutes + dayEndHour * 60) % MINUTES_PER_DAY;
  const pad = (value: number) => String(value).padStart(2, "0");
  return formatHeure(`${pad(Math.floor(paris / 60))}:${pad(paris % 60)}`);
}

/** Ouverte, mais son horaire la fermera plus tard dans la journée : à quelle heure. */
export function closesLater(
  closure: Closure,
  clock: ServiceClock,
  dayEndHour: number
): string | null {
  if (overrideEnd(closure, clock) !== null) return null;
  if (scheduledAt(closure, clock.isoDay, clock.minutes, dayEndHour)) return null;
  const change = nextChange(closure, clock, dayEndHour);
  return change < MINUTES_PER_DAY ? serviceHeure(change, dayEndHour) : null;
}

/**
 * Rouverte à la main pendant son horaire : jusqu'à quelle heure l'horaire
 * est suspendu. Null si elle ne l'est pas.
 */
export function liftedUntil(
  closure: Closure,
  clock: ServiceClock,
  dayEndHour: number
): string | null {
  const end = closure.overrideClosed === false ? overrideEnd(closure, clock) : null;
  return end === null ? null : serviceHeure(end, dayEndHour);
}

/**
 * Minute de service où la carte visée est de nouveau servie, l'horaire
 * reprenant la main à `from` : s'il coupe encore, jusqu'à son changement.
 */
function reopensFrom(
  closure: Closure,
  clock: ServiceClock,
  from: number,
  dayEndHour: number
): number {
  return from < MINUTES_PER_DAY && scheduledAt(closure, clock.isoDay, from, dayEndHour)
    ? nextChange(closure, { ...clock, minutes: from }, dayEndHour)
    : from;
}

/**
 * La réouverture dite : « 19 h » ; à la bascule, « minuit » — ou, si
 * l'horaire coupe encore les jours suivants, « demain 12 h », « mardi 12 h ».
 */
function reopenLabel(
  closure: Closure,
  clock: ServiceClock,
  minutes: number,
  dayEndHour: number
): string {
  if (minutes < MINUTES_PER_DAY) return serviceHeure(minutes, dayEndHour);
  // Le jour se dit au calendrier de Paris : passé minuit, une journée de
  // service qui bascule à 5 h est déjà « demain ».
  const parisDay = (serviceDays: number, at: number) =>
    serviceDays + (at + dayEndHour * 60 >= MINUTES_PER_DAY ? 1 : 0);
  const today = parisDay(0, clock.minutes);
  for (let ahead = 1; ahead <= WEEK_DAYS.length; ahead++) {
    const isoDay = ((clock.isoDay + ahead - 1) % WEEK_DAYS.length) + 1;
    const reopen = scheduledAt(closure, isoDay, 0, dayEndHour)
      ? nextChange(closure, { ...clock, isoDay, minutes: 0 }, dayEndHour)
      : 0;
    if (ahead === 1 && reopen === 0) return dayEndLabel(dayEndHour);
    if (reopen === MINUTES_PER_DAY) continue;
    const days = parisDay(ahead, reopen) - today;
    const heure = serviceHeure(reopen, dayEndHour);
    if (days === 0) return heure;
    if (days === 1) return `demain ${heure}`;
    const weekday = ((clock.isoDay - 1 + today + days) % WEEK_DAYS.length) + 1;
    return `${WEEK_DAYS.find((day) => day.iso === weekday)?.long} ${heure}`;
  }
  return dayEndLabel(dayEndHour);
}

/**
 * L'heure où une fermeture active rouvrira d'elle-même : fermée à la main
 * à 13 h, une cuisine servie de 12 h à 14 h 30 et dès 19 h rouvre à 19 h.
 */
export function closureUntil(
  closure: Closure,
  clock: ServiceClock,
  dayEndHour: number
): string {
  const from = overrideEnd(closure, clock) ?? clock.minutes;
  return reopenLabel(closure, clock, reopensFrom(closure, clock, from, dayEndHour), dayEndHour);
}

/** Fermée à la main maintenant, l'heure où elle rouvrirait d'elle-même. */
export function manualCloseUntil(
  closure: Closure,
  clock: ServiceClock,
  dayEndHour: number
): string {
  const from = nextChange(closure, clock, dayEndHour);
  return reopenLabel(closure, clock, reopensFrom(closure, clock, from, dayEndHour), dayEndHour);
}

// ---------------------------------------------------------------------------
// Mise en mots

/** « 22 h », « 22 h 30 », « minuit » : l'heure comme on la dit en salle, insécable. */
export function formatHeure(time: string): string {
  const [hours, minutes] = time.split(":");
  if (Number(hours) === 0 && minutes === "00") return "minuit";
  return `${Number(hours)}\u00a0h${minutes === "00" ? "" : `\u00a0${minutes}`}`;
}

/** L'heure où la journée de service bascule : « 5 h », ou « minuit ». */
export const dayEndLabel = (dayEndHour: number) =>
  dayEndHour === 0 ? "minuit" : `${dayEndHour}\u00a0h`;

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

/**
 * « À l'arrêt tous les jours dès 22 h », « En service du lundi au vendredi
 * de 12 h à 14 h 30 et de 19 h à 22 h 30 · samedi et dimanche de 12 h à
 * 15 h 30 » : les plages aux mêmes jours se disent ensemble.
 */
export function describeSchedule(closure: Closure): string | null {
  if (closure.windows.length === 0) return null;
  const groups = new Map<string, ClosureWindow[]>();
  for (const window of [...closure.windows].sort(byWindowOrder)) {
    const key = [...window.days].sort((a, b) => a - b).join();
    groups.set(key, [...(groups.get(key) ?? []), window]);
  }
  const schedule = [...groups.values()]
    .map(
      (windows) =>
        `${describeDays(windows[0].days)} ${windows
          .map((window) =>
            window.endsAt
              ? `de ${formatHeure(window.startsAt)} à ${formatHeure(window.endsAt)}`
              : `dès ${formatHeure(window.startsAt)}`
          )
          .join(" et ")}`
    )
    .join(" · ");
  return `${closure.openWindows ? "En service" : "À l’arrêt"} ${schedule}`;
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
