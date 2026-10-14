import {
  Anton,
  Archivo,
  Archivo_Black,
  Barlow_Semi_Condensed,
  Bebas_Neue,
  Bricolage_Grotesque,
  DM_Sans,
  DM_Serif_Display,
  Didact_Gothic,
  Playball,
  Playfair_Display,
  Poppins,
  Source_Serif_4,
  Young_Serif,
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

/**
 * Chicken Street — le texte de la carte : Archivo, une grotesque à chasse
 * variable ; les titres passent en Anton, condensée comme les capitales de
 * l'enseigne. Big Smash — bigsmash.fr est en Obviously (commerciale) : Archivo
 * en est la plus proche des Google Fonts, que le thème élargit pour les noms
 * et les titres ; les titres les plus gras reprennent Archivo Black.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
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

/**
 * Baï-Kō — les polices de son site : Bebas Neue, capitales condensées, pour
 * les titres de section et les prix ; DM Sans pour le texte. Les noms
 * coréens des sections (안주, 라면…) prennent le hangeul du système
 * (globals.css, .category-kicker).
 */
const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  // latin-ext : le « Ō » de « Baï·Kō » dans le bandeau.
  subsets: ["latin", "latin-ext"],
  weight: "400",
  preload: false,
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  preload: false,
});

/**
 * L'Adresse — la carte imprimée est tout entière en Source Serif (titres,
 * plats, descriptions). Variable avec l'axe de taille optique : les titres
 * prennent le dessin de titrage, les descriptions celui du texte.
 */
const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz"],
  preload: false,
});

/*
 * Les quatre adresses de l'Écusson (Montpellier, octobre 2026) n'ont livré ni
 * logo ni enseigne en ligne : leurs polices sont une proposition, notée dans
 * demos/<slug>/profile.json, à remplacer par celles de l'enseigne. Le texte de
 * leurs cartes reprend DM Sans, déjà chargée pour Baï-Kō.
 */

/** Le Novelty — bar à cocktails : une grotesque moderne, serrée aux grands corps. */
const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-bricolage-grotesque",
  subsets: ["latin"],
  preload: false,
});

/** Café des Arts — brasserie de la place Castellane : une didone de titrage. */
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  preload: false,
});

/** Le Victoria — bistrot assumé : une didone d'une seule graisse, plus noire. */
const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif-display",
  subsets: ["latin"],
  weight: "400",
  preload: false,
});

/** Caffè Panis — café italien : une serif ronde, d'une seule graisse. */
const youngSerif = Young_Serif({
  variable: "--font-young-serif",
  subsets: ["latin"],
  weight: "400",
  preload: false,
});

/** À poser sur la racine des pages qui rendent une carte d'établissement. */
export const brandFontVariables = [
  archivo,
  archivoBlack,
  barlowSemiCondensed,
  poppins,
  anton,
  didactGothic,
  playball,
  bebasNeue,
  dmSans,
  sourceSerif4,
  bricolageGrotesque,
  playfairDisplay,
  dmSerifDisplay,
  youngSerif,
]
  .map((font) => font.variable)
  .join(" ");
