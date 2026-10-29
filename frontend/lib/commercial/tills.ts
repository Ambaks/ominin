/*
 * Frais de paiement carte que chaque caisse du composeur prend au
 * restaurant, en France, relevés sur les tarifs publics. Le commercial les
 * voit sous la question de la caisse (questionnaire d'inscription).
 *   percent : la caisse encaisse elle-même, pourcentage + frais fixe ;
 *   none    : abonnement seul, la banque du restaurant encaisse ;
 *   check   : tarif sur devis ou ambigu, à demander au restaurant.
 * Une caisse absente d'ici (ou tapée à la main) est « check » : c'est le cas
 * de Zelty, Popina, Innovorder, Cashpad, Tactill et des caisses HubRise,
 * dont les tarifs ne sont que sur devis (recherche du 2026-10-29).
 */
export type TillFees =
  | { kind: "percent"; percent: number; fixedCents: number }
  | { kind: "none" }
  | { kind: "check" };

interface TillFeesEntry {
  fees: TillFees;
  /** Page de tarifs lue, et date de lecture (AAAA-MM-JJ). */
  source?: { url: string; readOn: string };
}

const TILL_FEES: Record<string, TillFeesEntry> = {
  // 1,65 % cartes UE/EEE, + 1,5 % hors EEE.
  Square: {
    fees: { kind: "percent", percent: 1.65, fixedCents: 0 },
    source: { url: "https://squareup.com/fr/fr/payments/pricing", readOn: "2026-10-29" },
  },
  // PayPal Point of Sale depuis 2025 ; « Carte et sans contact : 1,75 % ».
  Zettle: {
    fees: { kind: "percent", percent: 1.75, fixedCents: 0 },
    source: { url: "https://www.paypal.com/fr/business/pos-system/pricing", readOn: "2026-10-29" },
  },
  // Tarif sans abonnement ; 0,89 % avec « Paiements Plus » à 19 €/mois.
  "SumUp POS (ex-Tiller)": {
    fees: { kind: "percent", percent: 1.75, fixedCents: 0 },
    source: { url: "https://www.sumup.com/fr-fr/tarifs/", readOn: "2026-10-29" },
  },
  // Ne fournit ni ne loue de TPE : le restaurant garde celui de sa banque.
  Hiboutik: {
    fees: { kind: "none" },
    source: { url: "https://independant.io/meilleur/logiciel-caisse/gratuit/", readOn: "2026-10-29" },
  },
  // Forfait mensuel par tranche de volume (75 € jusqu'à 18 179 €…), pas un pourcentage.
  Lightspeed: {
    fees: { kind: "check" },
    source: { url: "https://pdf.lightspeedhq.com/Lightspeed-Transaction-Fee-table-FR.pdf", readOn: "2026-10-29" },
  },
  // Paiements par SumUp ou Zettle selon le pays, à leurs tarifs.
  Loyverse: {
    fees: { kind: "check" },
    source: { url: "https://loyverse.com/payment-systems", readOn: "2026-10-29" },
  },
};

const UNKNOWN: TillFeesEntry = { fees: { kind: "check" } };

export const tillFees = (name: string): TillFeesEntry => TILL_FEES[name] ?? UNKNOWN;
