import {
  Anton,
  Archivo,
  Archivo_Black,
  Barlow,
  Barlow_Condensed,
  Barlow_Semi_Condensed,
  Bebas_Neue,
  Bodoni_Moda,
  Cinzel,
  Cormorant_Garamond,
  DM_Sans,
  Didact_Gothic,
  Fraunces,
  Josefin_Sans,
  Noto_Serif_Display,
  Playball,
  Playfair_Display,
  Poppins,
  Questrial,
  Source_Serif_4,
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
 * Les quatre adresses de l'Écusson (Montpellier, octobre 2026) : chaque
 * police est prise à leur identité (site, logo, enseigne), comparée en
 * demos/<slug>/profile.json. Le Victoria reprend Source Serif 4 (L'Adresse),
 * le Café des Arts Questrial, Caffè Panis DM Sans pour son texte (Baï-Kō).
 */

/**
 * Le Novelty — les polices de son site (lenovelty-montpellier.fr) : une
 * Garamond de titrage, le nom en italique doré, et une géométrique fine en
 * capitales espacées pour la navigation et les descriptions.
 */
const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  preload: false,
});

const josefinSans = Josefin_Sans({
  variable: "--font-josefin-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
  preload: false,
});

/**
 * Café Riche — les titres et les prix de son site (caferiche-montpellier.com)
 * sont en Playfair Display ; le texte reprend DM Sans (Baï-Kō), les capitales
 * espacées Josefin Sans, proches du « CAFÉ » de son logo.
 */
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  weight: "variable",
  preload: false,
});

/**
 * Café des Arts — titres, noms et prix : la géométrique Century Gothic de son
 * mot-symbole, sans les approches larges de Didact Gothic, qui doublaient
 * l'espace avant une capitale.
 */
const questrial = Questrial({
  variable: "--font-questrial",
  subsets: ["latin"],
  weight: "400",
  preload: false,
});

/**
 * Caffè Panis — la plus proche de son mot-symbole (store, logo du Linktree) :
 * Fraunces avec l'axe SOFT, que la Fraunces du site ne charge pas — en
 * extra-gras, les terminaisons en boule et les fûts évasés du logo.
 */
const frauncesSoft = Fraunces({
  variable: "--font-fraunces-soft",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  preload: false,
});

/**
 * Cyprien — le logotype « CYPRIEN » est une didone aux capitales espacées :
 * Bodoni Moda (taille optique) pour les titres. Les capitales espacées de son
 * site (Miso, sans équivalent libre) passent en Barlow Condensed, le texte en
 * Barlow, de la même famille.
 */
const bodoniModa = Bodoni_Moda({
  variable: "--font-bodoni-moda",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz"],
  preload: false,
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  preload: false,
});

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  preload: false,
});

/**
 * Brasserie Laissac — « LAISSAC » de son écusson et « HAPPY » de son visuel
 * happy hour sont des capitales romaines à la Trajan : Cinzel, le même dessin
 * en Google Fonts, pour le nom et les titres. Les plats et les prix reprennent
 * Barlow et Barlow Condensed (Cyprien), les plus proches de la linéale fine et
 * des prix étroits du visuel.
 */
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: "variable",
  preload: false,
});

/** Les trois polices de Cyprien, pour son site comme pour sa page de commande. */
export const cyprienFontVariables = [bodoniModa, barlowCondensed, barlow]
  .map((font) => font.variable)
  .join(" ");

/**
 * Café Poulard — « POULARD » sur ses visuels : des capitales à empattements
 * étroites et contrastées. Noto Serif Display à sa chasse la plus étroite
 * (axe wdth) est la plus proche mesurée parmi les Google Fonts ; le texte
 * reprend Source Serif 4, ci-dessus.
 */
const notoSerifDisplay = Noto_Serif_Display({
  variable: "--font-noto-serif-display",
  subsets: ["latin"],
  weight: "variable",
  axes: ["wdth"],
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
  cormorantGaramond,
  josefinSans,
  playfairDisplay,
  questrial,
  frauncesSoft,
  bodoniModa,
  barlowCondensed,
  barlow,
  cinzel,
  notoSerifDisplay,
]
  .map((font) => font.variable)
  .join(" ");
