/*
 * Horaires d'ouverture structurés (etablissements.opening_hours) : par jour
 * ISO (1 = lundi … 7 = dimanche), des plages [ouverture, fermeture) en heures
 * de Paris. place_order (collect_open_at) applique les mêmes règles en base :
 * ce fichier ne fait que proposer ce qu'elle acceptera.
 */

export type DayRanges = [string, string][];
export type OpeningHours = Partial<Record<string, DayRanges>>;

export const DAY_NAMES = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
] as const;

const TIME_ZONE = "Europe/Paris";

export const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/** Construit une fois : les listes de commandes l'appellent à chaque rendu. */
const parisFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

/** Date (AAAA-MM-JJ), jour ISO et minutes écoulées à Paris pour un instant. */
export function parisParts(at: Date) {
  const parts = Object.fromEntries(
    parisFormat
      .formatToParts(at)
      .map((part) => [part.type, part.value])
  );
  const isoDay = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday) + 1;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    isoDay,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/** Instant correspondant à une heure de Paris, un jour donné (AAAA-MM-JJ). */
export function parisInstant(date: string, minutes: number): Date {
  const guess = new Date(`${date}T00:00:00Z`);
  guess.setUTCMinutes(minutes);
  // Décalage de Paris à cet instant : la différence entre l'heure lue à Paris
  // et l'heure UTC voulue, corrigée une fois (changement d'heure compris).
  const seen = parisParts(guess);
  const drift =
    (Date.parse(`${seen.date}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 60_000 +
    seen.minutes -
    minutes;
  return new Date(guess.getTime() - drift * 60_000);
}

export function isOpenAt(hours: OpeningHours | null, at: Date): boolean {
  if (!hours) return false;
  const { isoDay, minutes } = parisParts(at);
  return (hours[String(isoDay)] ?? []).some(
    ([open, close]) => minutes >= toMinutes(open) && minutes < toMinutes(close)
  );
}

/**
 * Un jour AAAA-MM-JJ complet : un champ date vidé rend "", et Chrome laisse
 * taper une année à cinq chiffres.
 */
export function isCalendarDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Jour de Paris (AAAA-MM-JJ) d'un instant : la valeur des champs date. */
export function parisDate(at: Date): string {
  return parisParts(at).date;
}

const clockFormat = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

/** « 09:30 » à l'heure de la boutique, quel que soit le fuseau du téléphone. */
export function formatClock(iso: string): string {
  return clockFormat.format(new Date(iso));
}

/** « vendredi 16 octobre » : un jour AAAA-MM-JJ, en toutes lettres. */
export function formatDayLong(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** Jour ISO (1 = lundi … 7 = dimanche) d'un jour AAAA-MM-JJ, celui des horaires. */
export function isoDayOf(date: string): number {
  return ((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
}

/**
 * Créneaux de retrait d'un jour : alignés sur la grille, pendant les plages
 * d'ouverture, au plus tôt le créneau qui suit celui en cours — ou, quand le
 * panier contient un plat à commander à l'avance, son délai écoulé.
 */
export function pickupSlots(
  hours: OpeningHours | null,
  date: string,
  slotMinutes: number,
  now: Date,
  noticeMinutes = 0
): Date[] {
  if (!hours) return [];
  const isoDay = isoDayOf(date);
  const earliest = now.getTime() + Math.max(slotMinutes, noticeMinutes) * 60_000;
  const slots: Date[] = [];
  for (const [open, close] of hours[String(isoDay)] ?? []) {
    const first = Math.ceil(toMinutes(open) / slotMinutes) * slotMinutes;
    for (let m = first; m < toMinutes(close); m += slotMinutes) {
      const slot = parisInstant(date, m);
      if (slot.getTime() >= earliest) slots.push(slot);
    }
  }
  return slots;
}

/** Le jour (AAAA-MM-JJ) décalé de `days` jours. */
export function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Premier jour (AAAA-MM-JJ), à partir de `from`, qui a encore un créneau de
 * retrait : dans la semaine qui suit le délai de commande, au-delà la
 * boutique n'ouvre jamais. `from` lui-même s'il n'y en a aucun.
 */
export function firstPickupDay(
  hours: OpeningHours | null,
  from: string,
  slotMinutes: number,
  now: Date,
  noticeMinutes = 0
): string {
  const days = DAY_NAMES.length + Math.ceil(noticeMinutes / 1440);
  for (let i = 0; i < days; i++) {
    const day = shiftDay(from, i);
    if (pickupSlots(hours, day, slotMinutes, now, noticeMinutes).length) return day;
  }
  return from;
}

/** « Lun. 11:30–14:30, 18:30–22:30 · … » : le texte affiché sur la carte. */
export function formatOpeningHours(hours: OpeningHours): string {
  return DAY_NAMES.flatMap((name, i) => {
    const ranges = hours[String(i + 1)] ?? [];
    return ranges.length
      ? [`${name.slice(0, 3)}. ${ranges.map(([open, close]) => `${open}–${close}`).join(", ")}`]
      : [];
  }).join(" · ");
}

/**
 * Les jours qui se suivent aux mêmes plages, regroupés : « du mardi au
 * samedi » plutôt que cinq fois la même ligne. Pour l'affichage ; le texte
 * enregistré reste celui de formatOpeningHours.
 */
export function groupOpeningHours(
  hours: OpeningHours
): { first: number; last: number; ranges: DayRanges }[] {
  const groups: { first: number; last: number; ranges: DayRanges }[] = [];
  for (let day = 1; day <= DAY_NAMES.length; day++) {
    const ranges = hours[String(day)] ?? [];
    if (!ranges.length) continue;
    const last = groups[groups.length - 1];
    if (last && last.last === day - 1 && JSON.stringify(last.ranges) === JSON.stringify(ranges)) {
      last.last = day;
    } else {
      groups.push({ first: day, last: day, ranges });
    }
  }
  return groups;
}

/** « 08:00 » → « 8h », « 14:30 » → « 14h30 ». */
const heure = (time: string) => {
  const [h, m] = time.split(":");
  return `${Number(h)}h${m === "00" ? "" : m}`;
};

/**
 * Les horaires en une ligne, jours qui se suivent regroupés : « Le lundi :
 * 8h–14h30 · Du mardi au dimanche : 8h–14h30 et 19h30–22h30 ». Les plages
 * s'écrivent au format de la page qui les montre.
 */
export function describeOpeningHours(
  hours: OpeningHours,
  formatRanges: (ranges: DayRanges) => string = (ranges) =>
    // Insécable : une plage ne se coupe pas à son tiret.
    ranges.map(([open, close]) => `${heure(open)}\u2060–\u2060${heure(close)}`).join(" et ")
): string {
  return groupOpeningHours(hours)
    .map(({ first, last, ranges }) => {
      // Insécables, et collés à leur première plage : la ligne ne se coupe
      // qu'entre deux plages ou entre deux groupes de jours.
      const days =
        first === last
          ? `Le\u00a0${DAY_NAMES[first - 1].toLowerCase()}`
          : `Du\u00a0${DAY_NAMES[first - 1].toLowerCase()}\u00a0au\u00a0${DAY_NAMES[last - 1].toLowerCase()}`;
      return `${days}\u00a0:\u00a0${formatRanges(ranges)}`;
    })
    .join(" · ");
}
