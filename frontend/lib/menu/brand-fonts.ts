import {
  Anton,
  Archivo_Black,
  Barlow_Semi_Condensed,
  Didact_Gothic,
  Playball,
  Poppins,
} from "next/font/google";

/*
 * Polices de marque des établissements : un thème .theme-<slug> (globals.css)
 * les réclame via --brand-display / --brand-sans, les autres gardent celles
 * d'Ominin. preload: false parce qu'elles ne servent qu'à une minorité de
 * cartes — la feuille @font-face voyage avec la page, mais aucun fichier de
 * police n'est téléchargé tant qu'aucun texte rendu ne l'appelle.
 */

/**
 * LZ.FOOD — le titrage du flyer : une grotesque géométrique large et grasse,
 * du logo « LZ.FOOD » aux bandeaux « TENDERS » / « NEMS ». Une seule graisse
 * (voir .theme-lz-food, qui neutralise les utilitaires de graisse).
 */
const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  subsets: ["latin"],
  weight: "400",
  preload: false,
});

/** LZ.FOOD — listes d'ingrédients serrées, comme sur le flyer papier. */
const barlowSemiCondensed = Barlow_Semi_Condensed({
  variable: "--font-barlow-semi-condensed",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  preload: false,
});

/**
 * O’Crousti Poulet — le texte du panneau-menu : Poppins grasse, en capitales
 * pour les articles, courante pour le reste.
 */
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  preload: false,
});

/** O’Crousti Poulet — les prix du panneau (« €6.90 »), étroits et noirs. */
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  preload: false,
});

/**
 * O’Crousti Poulet — le nom de l'enseigne, une géométrique à la Century
 * Gothic (O rond, t coupé en biais). Une seule graisse, épaissie par le thème.
 */
const didactGothic = Didact_Gothic({
  variable: "--font-didact-gothic",
  subsets: ["latin"],
  weight: "400",
  preload: false,
});

/**
 * O’Crousti Poulet — les titres manuscrits du panneau (« Nos Suppléments ») :
 * la plus proche de leur script parmi celles dont le « I » se lit (« Inclus »).
 */
const playball = Playball({
  variable: "--font-playball",
  subsets: ["latin"],
  weight: "400",
  preload: false,
});

/** À poser sur la racine des pages qui rendent une carte d'établissement. */
export const brandFontVariables = [
  archivoBlack,
  barlowSemiCondensed,
  poppins,
  anton,
  didactGothic,
  playball,
]
  .map((font) => font.variable)
  .join(" ");
