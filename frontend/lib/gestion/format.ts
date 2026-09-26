import { WEEK_DAYS } from "./constants";

/** « samedi et dimanche », « tous les jours », « lundi, mardi et jeudi ». */
export function formatDays(days: number[]): string {
  if (days.length === WEEK_DAYS.length) return "tous les jours";
  const names = WEEK_DAYS.filter((day) => days.includes(day.iso)).map(
    (day) => day.long
  );
  if (names.length <= 1) return names[0] ?? "aucun jour";
  return `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
}

/** Parse une saisie de prix française ("7,90", "7.90", "7") → nombre, ou null si invalide. */
export function parsePriceInput(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Number(normalized);
}

/** Nombre → saisie de prix française ("7,90", "7"). */
export function priceToInput(price: number): string {
  return Number.isInteger(price)
    ? String(price)
    : price.toFixed(2).replace(".", ",");
}

/** Parse un montant saisi ("12,50", "12.5") → nombre au centime, ou null. */
export function parseAmount(raw: string): number | null {
  const value = parseFloat(raw.replace(",", "."));
  return Number.isNaN(value) ? null : Math.round(value * 100) / 100;
}

/** Nombre → montant saisi, toujours au centime ("12,50"). */
export function amountToInput(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** « 3 sept., 14:32 » — pour un instant qui peut dater d'un autre jour. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Heure de retrait — précédée du jour quand ce n'est pas aujourd'hui. */
export function formatPickup(iso: string): string {
  return new Date(iso).toDateString() === new Date().toDateString()
    ? formatTime(iso)
    : formatDateTime(iso);
}
