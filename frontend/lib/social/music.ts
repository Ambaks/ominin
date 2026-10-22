/*
 * Musiques des Reels, sous la voix off. Sélection faite à la main sur
 * Mixkit, chaque morceau sous la « Mixkit Stock Music Free License » (usage
 * commercial sur les réseaux, publicités comprises, sans attribution),
 * vérifiée sur sa page. Le rédacteur (backend) choisit un morceau par Reel
 * d'après son ambiance (/api/social/music).
 */

export interface MusicTrack {
  id: string;
  /** Ambiance et meilleur usage, pour le rédacteur. */
  mood: string;
  /** MP3 lu au moment du rendu. */
  url: string;
  /** Page Mixkit du morceau, pour retrouver sa licence. */
  source: string;
}

export const MUSIC: readonly MusicTrack[] = [
  {
    id: "happy-times",
    mood:
      "Pop entraînante, confiante et lumineuse : pub énergique pour annoncer une offre ou un lancement.",
    url: "https://assets.mixkit.co/music/158/158.mp3",
    source: "https://mixkit.co/free-stock-music/indie-pop/",
  },
  {
    id: "turn-it-up-louder",
    mood:
      "Pop insouciante et dynamique avec batterie franche : Reel rythmé sur le coup de feu du service ou une promo.",
    url: "https://assets.mixkit.co/music/1048/1048.mp3",
    source: "https://mixkit.co/free-stock-music/indie-pop/",
  },
  {
    id: "just-keep-walking",
    mood:
      "Guitare acoustique chaleureuse et optimiste : portrait d'un commerçant, d'un artisan ou d'une boulangerie de quartier.",
    url: "https://assets.mixkit.co/music/963/963.mp3",
    source: "https://mixkit.co/free-stock-music/indie-pop/",
  },
  {
    id: "happy-home",
    mood:
      "Acoustique joyeuse et détendue, ambiance familiale : restaurant convivial ou repas entre amis.",
    url: "https://assets.mixkit.co/music/801/801.mp3",
    source: "https://mixkit.co/free-stock-music/pop/",
  },
  {
    id: "ramp-it-up",
    mood:
      "Rythmique corporate moderne et technologique : démo produit, menu QR et commande à table.",
    url: "https://assets.mixkit.co/music/69/69.mp3",
    source: "https://mixkit.co/free-stock-music/corporate-music/",
  },
  {
    id: "digital-clouds",
    mood:
      "Électro positive et futuriste, propre et tech : explication du fonctionnement de la plateforme ou tableau de bord.",
    url: "https://assets.mixkit.co/music/175/175.mp3",
    source: "https://mixkit.co/free-stock-music/chillout/",
  },
  {
    id: "lo-fi-02",
    mood:
      "Lo-fi détendue et légèrement décalée : Reel chill sur le quotidien d'un café ou d'une boutique en ligne.",
    url: "https://assets.mixkit.co/music/764/764.mp3",
    source: "https://mixkit.co/free-stock-music/chillout/",
  },
  {
    id: "sweet-september",
    mood:
      "Beat hip-hop calme et mélodique, ambiance lo-fi douce : ambiance de fin de service ou coulisses.",
    url: "https://assets.mixkit.co/music/282/282.mp3",
    source: "https://mixkit.co/free-stock-music/chillout/",
  },
  {
    id: "dreaming-big",
    mood:
      "Piano et cordes inspirants qui montent vers un final triomphant : manifeste de marque et vision d'Ominin.",
    url: "https://assets.mixkit.co/music/31/31.mp3",
    source: "https://mixkit.co/free-stock-music/film-score/",
  },
  {
    id: "i-believe-in-us",
    mood:
      "Piano chaleureux et inspirant, émotion sincère : récit de marque ou histoire d'un restaurateur.",
    url: "https://assets.mixkit.co/music/1030/1030.mp3",
    source: "https://mixkit.co/free-stock-music/pop/",
  },
  {
    id: "funky-martian",
    mood:
      "Jazz-funk vif et groovy : Reel fun sur la cuisine, le click and collect ou une offre décalée.",
    url: "https://assets.mixkit.co/music/1029/1029.mp3",
    source: "https://mixkit.co/free-stock-music/funk/",
  },
  {
    id: "blue-funk",
    mood:
      "Funk motivant et positif avec une basse groovy : pub rythmée pour les boutiques en ligne des petits vendeurs.",
    url: "https://assets.mixkit.co/music/1054/1054.mp3",
    source: "https://mixkit.co/free-stock-music/funk/",
  },
];

export const MUSIC_BY_ID = new Map(MUSIC.map((track) => [track.id, track]));
