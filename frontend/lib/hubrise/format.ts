import { TIME_ZONE } from "@/lib/collect/hours";
import { HUBRISE } from "./config";

/** « 9.80 EUR » : le format monétaire de HubRise. */
export function money(amount: number): string {
  return `${amount.toFixed(2)} ${HUBRISE.currency}`;
}

/** Le montant d'une chaîne HubRise (« 9.80 EUR »). */
export function parseMoney(value: string | null | undefined): number | null {
  if (!value) return null;
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? amount : null;
}

const parisParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZoneName: "longOffset",
});

/** ISO 8601 à l'heure de Paris, décalage compris (« 2026-10-19T12:30:00+02:00 »). */
export function parisIso(at: Date): string {
  const parts = Object.fromEntries(
    parisParts.formatToParts(at).map((part) => [part.type, part.value])
  );
  // « GMT+02:00 » ; « GMT » seul à l'heure d'UTC, que Paris n'a jamais.
  const offset = parts.timeZoneName.replace("GMT", "") || "+00:00";
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}

/**
 * Numéro de téléphone au format E.164, que HubRise exige. Les numéros
 * français s'écrivent de cent façons (06 12…, 0033 6…, +33 6…) ; un numéro
 * qui n'en est pas un rend null, jamais une valeur inventée.
 */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  let national: string;
  if (digits.startsWith("+")) national = digits;
  else if (digits.startsWith("00")) national = `+${digits.slice(2)}`;
  else if (/^0\d{9}$/.test(digits)) national = `+33${digits.slice(1)}`;
  else return null;
  return /^\+\d{8,15}$/.test(national) ? national : null;
}

/** « Marie Dupont » → prénom et nom : un seul mot est le prénom. */
export function splitName(full: string | null | undefined): {
  first_name?: string;
  last_name?: string;
} {
  const name = full?.trim();
  if (!name) return {};
  const [first, ...rest] = name.split(/\s+/);
  return rest.length
    ? { first_name: first, last_name: rest.join(" ") }
    : { first_name: first };
}
