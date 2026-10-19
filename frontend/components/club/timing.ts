/*
 * Les réglages de mouvement des pages publiques d'Ominin Club, côté script
 * (ms, px) : valeurs nommées, à valider. Les durées CSS sont dans tokens.css.
 */

export const CLUB_TIMING = {
  /* Relecture du statut d'une réservation (paiement, porte, remboursement). */
  refresh: 20_000,
  /* Décalage entre deux cartes de soirée. */
  stagger: 70,
  /* Le total qui défile jusqu'à sa valeur. */
  roll: 420,
  /* Hauteur animée de la feuille d'une étape à l'autre. */
  step: 320,
  /* La constellation du paiement réussi : lancée quand l'élément fêté s'est posé, et sa durée. */
  burstDelay: 450,
  burst: 1_600,
  /* Au plus ce délai pour qu'un défilement vers l'élément fêté se pose. */
  scrollSettle: 900,
  /* « Lien copié » reste affiché. */
  copied: 1_800,
} as const;

/*
 * La caméra du plan (use-plan-camera.ts). Zoom du cadrage de repos à max
 * fois celui-ci, double toucher à doubleZoom ; un geste devient un glissement au-delà de
 * tapSlop px ; deux touchers à moins de doubleTapMs et doubleTapSlop px font
 * un double toucher. Au-delà des bords, le plan résiste (rubber) ; relâché, il
 * glisse et ralentit (friction par 16 ms) jusqu'à minSpeed px/ms. Molette
 * (avec Ctrl ou ⌘, ou le pincement du pavé) : wheel par pixel. Le retour se
 * fait sur un ressort (raideur, amortissement).
 */
export const PLAN_CAMERA = {
  max: 2.5,
  doubleZoom: 2,
  tapSlop: 6,
  doubleTapMs: 300,
  doubleTapSlop: 24,
  rubber: 0.35,
  friction: 0.92,
  minSpeed: 0.02,
  /* La vitesse d'un lâcher se lit sur les sampleMs derniers ms du geste. */
  sampleMs: 80,
  wheel: 0.0025,
  stiffness: 170,
  damping: 26,
  /* Un pincement peut dépasser les bornes d'échelle de ce facteur (en dessous, au-dessus), puis revient. */
  pinchSlack: [0.85, 1.15],
  /* Une image de référence (ms), l'écart maximal pris en compte entre deux images, le repos (px). */
  frameMs: 16,
  maxStep: 32,
  restPx: 0.1,
} as const;

/*
 * Le plan sous le doigt et la souris : une table se touche à tapRadius px
 * de son centre (cible de 2 × tapRadius) ; une lumière qui suit le curseur
 * (spotlight.tsx) le rejoint de lerp par image.
 */
export const PLAN_POINTER = { tapRadius: 28, lerp: 0.18 } as const;

/* Le plan du club cadré sur ses tables, à margin unités près (night-plan.tsx). */
export const PLAN_FIT = { margin: 16 } as const;

/* Le bouton principal attiré par le curseur : portée (px) et déplacement maximal (px). */
export const CLUB_MAGNET = { reach: 60, pull: 6 } as const;

/* La gerbe du paiement réussi : étoiles lancées, portée (px) de la plus proche à la plus lointaine, départs étalés sur jitterMs. */
export const CLUB_BURST = { stars: 18, reach: [70, 170], jitterMs: 140 } as const;

/* La feuille basse glissée : au-delà de ce déplacement (px) ou de cette vitesse (px/ms), elle se ferme. */
export const CLUB_SHEET = { dismiss: 120, velocity: 0.6 } as const;
