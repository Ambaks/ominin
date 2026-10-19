import type { EventAvailability } from "@/lib/club/public";

/*
 * Le prix d'une table tel que le client le voit et le paie : le prix du
 * soir, frais de réservation du club compris (arrondis au centime, comme
 * reserver_table).
 */
export const serviceFeeCents = (priceCents: number, feePercent: number) =>
  Math.round((priceCents * feePercent) / 100);

export const allInCents = (priceCents: number, feePercent: number) =>
  priceCents + serviceFeeCents(priceCents, feePercent);

/** La table la moins chère d'une soirée, frais compris, parmi les offres encore ouvertes ; null s'il n'y en a plus. */
export function fromCents(availability: EventAvailability, feePercent: number): number | null {
  const prices = availability.offers.filter((offer) => offer.available).map((offer) => offer.priceCents);
  return prices.length ? allInCents(Math.min(...prices), feePercent) : null;
}
