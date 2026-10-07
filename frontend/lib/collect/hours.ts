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

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/** Date (AAAA-MM-JJ), jour ISO et minutes écoulées à Paris pour un instant. */
function parisParts(at: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    })
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
function parisInstant(date: string, minutes: number): Date {
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

/** Jour de Paris (AAAA-MM-JJ) d'un instant : la valeur des champs date. */
export function parisDate(at: Date): string {
  return parisParts(at).date;
}

/**
 * Créneaux de retrait d'un jour : alignés sur la grille, pendant les plages
 * d'ouverture, au plus tôt le créneau qui suit celui en cours.
 */
export function pickupSlots(
  hours: OpeningHours | null,
  date: string,
  slotMinutes: number,
  now: Date
): Date[] {
  if (!hours) return [];
  const isoDay = ((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
  const earliest = now.getTime() + slotMinutes * 60_000;
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

/** « Lun. 11:30–14:30, 18:30–22:30 · … » : le texte affiché sur la carte. */
export function formatOpeningHours(hours: OpeningHours): string {
  return DAY_NAMES.flatMap((name, i) => {
    const ranges = hours[String(i + 1)] ?? [];
    return ranges.length
      ? [`${name.slice(0, 3)}. ${ranges.map(([open, close]) => `${open}–${close}`).join(", ")}`]
      : [];
  }).join(" · ");
}
