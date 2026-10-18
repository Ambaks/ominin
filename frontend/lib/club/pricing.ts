/*
 * Le total d'une table tel que reserver_table le fixe en base : le prix du
 * soir, plus les frais de service du club arrondis au centime.
 */
export const serviceFeeCents = (priceCents: number, feePercent: number) =>
  Math.round((priceCents * feePercent) / 100);

export const allInCents = (priceCents: number, feePercent: number) =>
  priceCents + serviceFeeCents(priceCents, feePercent);
