/*
 * Les réglages fixes de la roue de fidélité, validés par Ominin. Ce que le
 * gérant choisit (budget, lots, commande minimum, roue dorée) vit en base
 * (loyalty_wheels) ; ces valeurs-ci valent pour toutes les maisons.
 */

/** Cases de la roue : chaque lot en prend une, les points le reste. */
export const WHEEL_SLOTS = 18;

/** Lots qu'une roue porte au plus. */
export const WHEEL_MAX_PRIZES = 6;

/** Ce qu'une nouvelle roue offre en lots, en moyenne, à chaque tour (€, prix de carte). */
export const WHEEL_DEFAULT_BUDGET = 0.2;

/** Marchandise payée (€) qui ouvre le tour du jour d'une nouvelle roue. */
export const WHEEL_DEFAULT_MIN_ORDER = 5;

/** La roue dorée d'une nouvelle roue : le n-ième tour de la carte, puis tous les n, points multipliés. */
export const WHEEL_DEFAULT_GOLDEN = { every: 5, multiplier: 2 } as const;

/** Un bon gagné à la roue se garde ce nombre de jours. */
export const WHEEL_VOUCHER_DAYS = 14;

/**
 * Le reste de la roue, après les lots : des points, chaque valeur avec sa
 * part de cette chance-là (en tout 100). Tout tour gagne au moins des points.
 */
export const WHEEL_POINTS = [
  { points: 2, share: 30 },
  { points: 4, share: 28 },
  { points: 6, share: 20 },
  { points: 10, share: 13 },
  { points: 20, share: 6 },
  { points: 50, share: 3 },
] as const;
