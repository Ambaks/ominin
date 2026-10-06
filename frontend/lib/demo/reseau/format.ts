import type { OrderLine } from "./simulation";

const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const roundEuros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const plain = new Intl.NumberFormat("fr-FR");
const oneDecimal = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

/**
 * Les milliers séparés par une espace insécable pleine : l'espace fine
 * d'Intl disparaissait presque en petite taille (« 1008 € » à côté de
 * « 1 284 »). L'espace fine reste devant € et %.
 */
const grouped = (text: string) => text.replace(/(\d)\u202f(?=\d)/g, "$1\u00a0");

export const formatCents = (cents: number) => grouped(euros.format(cents / 100));
export const formatRoundCents = (cents: number) => grouped(roundEuros.format(cents / 100));
export const formatInteger = (value: number) => grouped(integer.format(value));
/** Euros arrondis sans le symbole, posé à part (chiffres clés). */
export const formatEuroAmount = (cents: number) => formatInteger(Math.round(cents / 100));
export const formatDecimal = (value: number) => oneDecimal.format(value);
/** Tel quel, décimales comprises s'il en a : « 3 », « 2,5 ». */
export const formatNumber = (value: number) => grouped(plain.format(value));
export const formatMinutes = (value: number) => `${oneDecimal.format(value)}\u00a0min`;
/** Attente arrondie à la minute : « 12 min ». */
export const formatWait = (minutes: number) => `${Math.round(minutes)}\u00a0min`;
export const formatPercent = (ratio: number) => percent.format(ratio);

const pad = (n: number) => String(n).padStart(2, "0");

/** Secondes du jour de service → « 12 h 34 », la nuit repassant à 0 h. */
export function formatClock(seconds: number): string {
  const s = Math.floor(seconds) % 86_400;
  return `${Math.floor(s / 3600)}\u00a0h\u00a0${pad(Math.floor(s / 60) % 60)}`;
}

/** Secondes → « 13:00 », la forme du paramètre ?heure=. */
export function formatClockParam(seconds: number): string {
  const s = Math.floor(seconds) % 86_400;
  return `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}`;
}

/** Minutes → « 11 h 30 », « 23 h ». */
export function formatHour(minutes: number): string {
  const m = minutes % 1440;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}\u00a0h\u00a0${pad(m % 60)}` : `${h}\u00a0h`;
}

/** Une heure dans une phrase : « jusqu'à minuit », pas « jusqu'à 0 h ». */
export const formatHourInText = (minutes: number) => (minutes % 1440 === 0 ? "minuit" : formatHour(minutes));

const lineName = (l: OrderLine) => (l.quantity > 1 ? `${l.quantity}× ${l.name}` : l.name);

/** Le panier en entier : « 2× Menu Solo + Alloco + Tiramisu ». */
export const formatBasket = (lines: OrderLine[]) => lines.map(lineName).join(" + ");

/**
 * Le panier en une ligne courte, en deux morceaux : les `count` premiers
 * articles nommés, puis « + 1 autre » — que l'affichage garde entier quand
 * les noms se coupent.
 */
export function basketParts(lines: OrderLine[], count: number): { named: string; more: string | null } {
  const more = lines.length - count;
  return {
    named: lines.slice(0, count).map(lineName).join(" + "),
    more: more > 0 ? `+ ${more}\u00a0autre${more > 1 ? "s" : ""}` : null,
  };
}

/** Ancienneté d'une commande : « à l'instant », « il y a 40 s », « il y a 3 min », « il y a 1 h 18 ». */
export function formatAgo(seconds: number): string {
  if (seconds < 10) return "à l’instant";
  if (seconds < 60) return `il y a ${Math.floor(seconds / 10) * 10}\u00a0s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes}\u00a0min`;
  const rest = minutes % 60;
  return `il y a ${Math.floor(minutes / 60)}\u00a0h${rest ? `\u00a0${String(rest).padStart(2, "0")}` : ""}`;
}

export const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** « mardi » → « Mardi ». */
export const capitalize = (text: string) => text[0].toUpperCase() + text.slice(1);
