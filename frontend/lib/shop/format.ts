import { COUNTRY_NAMES } from "./constants";

/* Montants en centimes partout côté données ; conversion uniquement à l'affichage et à la saisie. */

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** Saisie française (« 42,50 », « 42 ») → centimes ; NaN si invalide. */
export function eurosToCents(input: string): number {
  const normalized = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return Number.NaN;
  return Math.round(Number(normalized) * 100);
}

export function centsToEurosInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return cents % 100 === 0
    ? String(cents / 100)
    : (cents / 100).toFixed(2).replace(".", ",");
}

export function formatDate(
  iso: string | Date,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }
): string {
  return new Intl.DateTimeFormat("fr-FR", options).format(new Date(iso));
}

export function formatDateTime(iso: string | Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** « il y a 3 min », « hier », « il y a 12 j » — pour les listes de messages. */
export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} j`;
  return formatDate(iso);
}

export function initials(name: string): string {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function countryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] ?? code;
}

export function fullName(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(" ");
}
