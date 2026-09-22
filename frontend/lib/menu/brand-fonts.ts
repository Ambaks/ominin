import { Archivo_Black, Barlow_Semi_Condensed } from "next/font/google";

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

/** À poser sur la racine des pages qui rendent une carte d'établissement. */
export const brandFontVariables = `${archivoBlack.variable} ${barlowSemiCondensed.variable}`;
