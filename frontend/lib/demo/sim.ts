/*
 * Les briques communes des démos simulées (vue réseau, vue groupe) : un
 * hasard reproductible, les jours de service, et l'horloge — celle de Paris,
 * ou celle que fixent ?heure=, ?jour= et ?vitesse=.
 */

export const DAY = 86_400;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 : générateur 32 bits, léger et reproductible. */
export function random(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const between = (rand: () => number, [min, max]: readonly [number, number]) =>
  min + (max - min) * rand();

export function gaussian(rand: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
}

export function poisson(rand: () => number, lambda: number): number {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = rand();
  while (p > limit) {
    k++;
    p *= rand();
  }
  return k;
}

export function pick<T extends { weight: number }>(rand: () => number, items: readonly T[]): T {
  let r = rand() * items.reduce((sum, item) => sum + item.weight, 0);
  for (const item of items) {
    r -= item.weight;
    if (r < 0) return item;
  }
  return items[items.length - 1];
}

/** « HH:MM » → minutes depuis minuit. */
export const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export function dayIndex(day: string): number {
  return Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)) / (DAY * 1000);
}

export function addDays(day: string, delta: number): string {
  return new Date((dayIndex(day) + delta) * DAY * 1000).toISOString().slice(0, 10);
}

export function weekdayOf(day: string): number {
  return (((dayIndex(day) + 4) % 7) + 7) % 7;
}

/**
 * Un cache borné, du plus récemment lu au plus ancien : une lecture remet
 * l'entrée en tête, et au-delà de `limit` la plus ancienne sort. Une horloge
 * accélérée qui change de jour ne fait pas grossir la mémoire indéfiniment.
 */
export function remember<K, V>(cache: Map<K, V>, key: K, limit: number, compute: () => V): V {
  const hit = cache.get(key);
  if (hit !== undefined) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const value = compute();
  cache.set(key, value);
  if (cache.size > limit) cache.delete(cache.keys().next().value!);
  return value;
}

export interface Clock {
  day: string;
  seconds: number;
  /** Secondes simulées par seconde réelle ; 0 fige l'horloge. */
  speed: number;
  /** Suit l'heure de Paris (aucun paramètre) : bascule seule au jour suivant. */
  follow: boolean;
}

const PARIS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Jour de service et secondes à Paris : avant `dayStartHour`, c'est encore la nuit de la veille. */
export function parisClock(now: Date, dayStartHour: number): { day: string; seconds: number } {
  const parts = Object.fromEntries(PARIS.formatToParts(now).map((p) => [p.type, p.value]));
  const seconds = +parts.hour * 3600 + +parts.minute * 60 + +parts.second;
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  return seconds < dayStartHour * 3600
    ? { day: addDays(day, -1), seconds: seconds + DAY }
    : { day, seconds };
}

/**
 * ?heure=12:34 (ou 12h34, 12:34:56) fige le point de départ de l'horloge,
 * qui avance ensuite en temps réel : chaque chargement rejoue la même
 * séquence. ?vitesse=0 l'arrête, ?vitesse=60 fait défiler une heure par
 * minute. ?jour=AAAA-MM-JJ choisit la journée simulée — par défaut celle de
 * référence dès que l'heure est imposée, aujourd'hui sinon.
 */
export function resolveClock(
  { dayStartHour, referenceDay }: { dayStartHour: number; referenceDay: string },
  params: { heure?: string; jour?: string; vitesse?: string },
  now: Date
): Clock {
  const live = parisClock(now, dayStartHour);
  const time = params.heure?.match(/^(\d{1,2})[:h](\d{2})(?::(\d{2}))?$/);
  // Une date réelle seulement : « 2026-99-99 » ou « 0000-01-01 » ne retombent pas sur elles-mêmes.
  const day =
    params.jour && /^\d{4}-\d{2}-\d{2}$/.test(params.jour) && addDays(params.jour, 0) === params.jour ? params.jour : null;
  const speed = Number(params.vitesse);
  let seconds = live.seconds;
  if (time && +time[1] < 24 && +time[2] < 60) {
    seconds = +time[1] * 3600 + +time[2] * 60 + +(time[3] ?? 0);
    if (seconds < dayStartHour * 3600) seconds += DAY;
  }
  return {
    day: day ?? (time ? referenceDay : live.day),
    seconds,
    speed: Number.isFinite(speed) && speed >= 0 ? speed : 1,
    follow: !time && !day,
  };
}

const single = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

/** Les paramètres d'horloge d'une page (?heure=, ?jour=, ?vitesse=), une valeur chacun. */
export function clockParams(search: Record<string, string | string[] | undefined>) {
  return { heure: single(search.heure), jour: single(search.jour), vitesse: single(search.vitesse) };
}
