/** Durées des pages publiques d'Ominin Club (ms) : valeurs nommées, à valider. */
export const CLUB_TIMING = {
  /* Relecture des tables prises (plan) et du statut (page de réservation). */
  refresh: 20_000,
  /* Décalage entre deux affiches, deux tables qui s'allument. */
  stagger: 90,
  tableStagger: 22,
  /* Passage d'une zone à l'autre. */
  warp: 560,
  /* Le total qui défile jusqu'à sa valeur. */
  roll: 520,
  /* La constellation du paiement réussi. */
  burst: 1800,
} as const;

/* La courbe d'entrée de toute la mise en scène (aussi --c-ease dans club.css). */
export const CLUB_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/*
 * Le saut d'une zone à l'autre : le plan arrive de côté (% de sa largeur) en
 * grandissant ; une traînée d'étoiles le traverse (déplacement en %,
 * étirement au départ et à l'arrivée, instant de son éclat).
 */
export const CLUB_WARP = {
  shift: 8,
  scale: 0.92,
  streak: 30,
  streakFrom: 0.4,
  streakTo: 1.6,
  streakPeak: 0.35,
} as const;

/* La gerbe du paiement réussi : étoiles lancées, portée (px) de la plus proche à la plus lointaine. */
export const CLUB_BURST = { stars: 18, reach: [70, 170] } as const;
