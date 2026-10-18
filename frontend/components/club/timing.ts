/** Durées des pages publiques d'Ominin Club (ms) : valeurs nommées, à valider. */
export const CLUB_TIMING = {
  /* Relecture des tables prises (plan) et du statut (page de réservation). */
  refresh: 20_000,
  /* Après un délai expiré, la table rendue reste libre ici le temps que le serveur la libère aussi. */
  releaseGrace: 5_000,
  /* Décalage entre deux affiches, deux tables qui s'allument. */
  stagger: 90,
  tableStagger: 22,
  /* Passage d'une zone à l'autre : sortie de l'ancienne, entrée de la nouvelle. */
  warpOut: 160,
  warp: 560,
  /* L'étoile choisie s'embrase avant de pulser. */
  ignite: 300,
  /* Le total qui défile jusqu'à sa valeur. */
  roll: 520,
  /* Bulle « déjà réservée » au-dessus de la table touchée. */
  toast: 2_400,
  /* La constellation du paiement réussi, lancée quand le QR code s'est posé. */
  burstDelay: 450,
  burst: 1_800,
} as const;

/* La courbe d'entrée de toute la mise en scène (aussi --c-ease dans club.css). */
export const CLUB_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/*
 * Le saut d'une zone à l'autre : le plan part puis arrive de côté (% de sa
 * largeur) en grandissant ; des traînées d'étoiles le traversent
 * (déplacement en %, étirement au départ et à l'arrivée, instant de leur éclat).
 */
export const CLUB_WARP = {
  shift: 8,
  exitShift: 4,
  scale: 0.92,
  streak: 30,
  streakFrom: 0.4,
  streakTo: 1.6,
  streakPeak: 0.35,
} as const;

/* La gerbe du paiement réussi : étoiles lancées, portée (px) de la plus proche à la plus lointaine. */
export const CLUB_BURST = { stars: 18, reach: [70, 170] } as const;
