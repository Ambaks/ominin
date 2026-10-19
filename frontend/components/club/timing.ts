/*
 * Les réglages de mouvement des pages publiques d'Ominin Club, côté script
 * (ms, px) : valeurs nommées, à valider. Les durées CSS sont dans tokens.css.
 */

export const CLUB_TIMING = {
  /* Relecture des tables prises (plan) et du statut (page de réservation). */
  refresh: 20_000,
  /* Après un délai expiré, la table rendue reste libre ici le temps que le serveur la libère aussi. */
  releaseGrace: 5_000,
  /* Décalage entre deux cartes de soirée. */
  stagger: 70,
  /* Fondu croisé d'une zone à l'autre (les deux plans se chevauchent). */
  crossfade: 320,
  /* L'étoile choisie s'embrase. */
  ignite: 420,
  /* Une table prise qu'on touche : refus d'un mouvement de tête. */
  shake: 180,
  /* Le total qui défile jusqu'à sa valeur. */
  roll: 420,
  /* Bulle au-dessus de la table touchée qui n'est pas libre. */
  toast: 2_400,
  /* Infobulle au survol d'une table (bureau), après ce délai. */
  hover: 120,
  /* Hauteur animée de la feuille d'une étape à l'autre. */
  step: 320,
  /* La constellation du paiement réussi, lancée quand le QR code s'est posé. */
  burstDelay: 450,
  /* Au plus ce délai pour qu'un défilement vers l'élément fêté se pose. */
  scrollSettle: 900,
  burst: 1_600,
  /* « Lien copié » reste affiché. */
  copied: 1_800,
} as const;

/*
 * La caméra du plan (use-plan-camera.ts). Zoom du cadrage de repos à max
 * fois celui-ci, double toucher à doubleZoom ; un geste devient un glissement au-delà de
 * tapSlop px ; deux touchers à moins de doubleTapMs et doubleTapSlop px font
 * un double toucher ; à l'échelle 1, un glissement horizontal de swipe px
 * change de zone. Au-delà des bords, le plan résiste (rubber) ; relâché, il
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
  swipe: 56,
  /* Un glissement compte comme horizontal s'il l'est swipeRatio fois plus que vertical. */
  swipeRatio: 1.5,
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
 * de son centre (cible de 2 × tapRadius) ; la lumière suit le curseur
 * (lerp par image) et éclaire les tables à moins de proximity px.
 */
export const PLAN_POINTER = { tapRadius: 28, proximity: 140, lerp: 0.18 } as const;

/*
 * Le plan côté client : tables dessinées tableScale fois plus grandes que
 * sur le plan du club (lisibles au téléphone), cadrées sur leur ensemble à
 * margin unités près.
 */
export const PLAN_FIT = { tableScale: 1.25, margin: 16 } as const;

/* Le bouton principal attiré par le curseur : portée (px) et déplacement maximal (px). */
export const CLUB_MAGNET = { reach: 60, pull: 6 } as const;

/* La gerbe du paiement réussi : étoiles lancées, portée (px) de la plus proche à la plus lointaine. */
export const CLUB_BURST = { stars: 18, reach: [70, 170] } as const;

/* La feuille basse glissée : au-delà de ce déplacement (px) ou de cette vitesse (px/ms), elle se ferme. */
export const CLUB_SHEET = { dismiss: 120, velocity: 0.6 } as const;
