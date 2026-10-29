import type { TillFees } from "@/lib/commercial/tills";

/*
 * Offre « caisse Stripe d'Ominin » au comptoir, montrée par le commercial
 * face aux frais de la caisse du restaurant. En ligne, rien ne change : la
 * commission Connect reste celle de connectCommission.
 *
 * Règle validée avec Marwan : taux proposé = taux de la caisse − RATE_CUT,
 * jamais sous FLOOR ; s'il n'est pas strictement inférieur au taux de la
 * caisse, pas d'offre. Le frais fixe Stripe card-present (proposition du
 * 2026-10-29 : 0,150 % + 0,080 € par paiement, + 0,025 € Terminal Services,
 * + frais réseaux) est à la charge d'Ominin : l'offre n'est qu'un pourcentage.
 */

/** Points de pourcentage retirés au taux de la caisse. */
const RATE_CUT = 0.5;

/** Plancher, en % : la part Stripe plus la marge d'Ominin. */
const FLOOR = {
  stripe: 0.3,
  ominin: 0.7,
};

/** Exemple chiffré de l'économie : panier moyen (€) et paiements carte par mois. */
export const SAVING_EXAMPLE = {
  basket: 20,
  paymentsPerMonth: 1000,
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Le taux proposé et l'économie mensuelle de l'exemple, ou null sans offre. */
export function cardOffer(fees: Extract<TillFees, { kind: "percent" }>) {
  const percent = round2(Math.max(fees.percent - RATE_CUT, FLOOR.stripe + FLOOR.ominin));
  if (percent >= fees.percent) return null;
  const { basket, paymentsPerMonth } = SAVING_EXAMPLE;
  const perPayment = (basket * (fees.percent - percent)) / 100 + fees.fixedCents / 100;
  return { percent, monthlySaving: round2(perPayment * paymentsPerMonth) };
}
