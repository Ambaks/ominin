import type { EventAvailability } from "@/lib/club/public";
import type { Club } from "@/lib/club/types";

/*
 * Le total d'une table tel que reserver_table le fixe en base : le prix du
 * soir, plus les frais de service du club arrondis au centime.
 */
export const serviceFeeCents = (priceCents: number, feePercent: number) =>
  Math.round((priceCents * feePercent) / 100);

export const allInCents = (priceCents: number, feePercent: number) =>
  priceCents + serviceFeeCents(priceCents, feePercent);

/**
 * Une soirée en chiffres, pour son affiche : la table la moins chère frais
 * compris, et combien de tables en vente sont déjà réservées.
 */
export function nightSummary(club: Club, availability: EventAvailability) {
  const open = new Set(availability.zones.map((zone) => zone.zoneId));
  const blocked = new Set(availability.blocked);
  const taken = new Set(availability.taken);
  const tables = club.tables.filter((table) => open.has(table.zoneId) && !blocked.has(table.id));
  const prices = availability.zones.map((zone) => zone.priceCents);
  return {
    fromCents: prices.length ? allInCents(Math.min(...prices), club.feePercent) : null,
    total: tables.length,
    reserved: tables.filter((table) => taken.has(table.id)).length,
  };
}
