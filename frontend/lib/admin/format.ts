/*
 * Dates et texte du CRM, fr-FR partout, sans bibliothèque (convention
 * lib/gestion/format.ts). Les timestamps sont des ISO UTC rendus dans le
 * fuseau de l'appareil.
 */

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

export function dayStart(date = new Date()): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isToday(iso: string, now = new Date()): boolean {
  return dayStart(new Date(iso)).getTime() === dayStart(now).getTime();
}

export function isTomorrow(iso: string, now = new Date()): boolean {
  return (
    dayStart(new Date(iso)).getTime() === dayStart(addDays(now, 1)).getTime()
  );
}

/** Fin de la semaine courante : dimanche 23:59:59 local. */
export function endOfWeek(now = new Date()): Date {
  const start = dayStart(now);
  // getDay() : dimanche = 0 → la semaine française se termine ce jour-là.
  const daysLeft = start.getDay() === 0 ? 0 : 7 - start.getDay();
  const end = addDays(start, daysLeft + 1);
  return new Date(end.getTime() - 1);
}

/** « il y a 5 min », « hier », « dans 3 j »… Passé et futur symétriques. */
export function formatRelative(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const diff = now.getTime() - date.getTime();
  const abs = Math.abs(diff);
  const past = diff >= 0;

  if (abs < MINUTE) return "à l'instant";
  if (abs < HOUR) {
    const minutes = Math.floor(abs / MINUTE);
    return past ? `il y a ${minutes} min` : `dans ${minutes} min`;
  }
  if (abs < DAY && dayStart(date).getTime() === dayStart(now).getTime()) {
    const hours = Math.floor(abs / HOUR);
    return past ? `il y a ${hours} h` : `dans ${hours} h`;
  }

  const days = Math.round(
    Math.abs(dayStart(date).getTime() - dayStart(now).getTime()) / DAY
  );
  if (days <= 1) return past ? "hier" : "demain";
  if (days < 7) return past ? `il y a ${days} j` : `dans ${days} j`;
  if (days < 35) {
    const weeks = Math.round(days / 7);
    return past ? `il y a ${weeks} sem.` : `dans ${weeks} sem.`;
  }
  const months = Math.round(days / 30);
  return past ? `il y a ${months} mois` : `dans ${months} mois`;
}

/** « mer. 12 août » */
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** « mercredi 12 août » */
export function formatDayLong(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** « 12/08/2026 » — export CSV et listes denses. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** « mer. 12 août à 15:30 » */
export function formatDayTime(iso: string): string {
  return `${formatDay(iso)} à ${formatTime(iso)}`;
}

/** ISO → valeur locale d'un <input type="datetime-local">. */
export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Valeur d'un <input type="datetime-local"> (heure locale) → ISO UTC. */
export function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

/**
 * Href sûr pour une URL saisie ou importée : force http(s). Neutralise les
 * schémas dangereux (javascript:, data:…) et répare au passage les adresses
 * sans protocole (« exemple.fr » deviendrait sinon un lien relatif cassé).
 */
export function httpHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** Normalisation de recherche : minuscules, sans accents. */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
