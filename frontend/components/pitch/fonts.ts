import { Anton, Didact_Gothic, Playball, Poppins } from "next/font/google";

/*
 * Les polices d'O'Crousti, déclarées ici et non reprises de
 * lib/menu/brand-fonts.ts : celles-là servent les cartes, sans préchargement ;
 * le pitch les veut au premier rendu. Poppins pour le texte (800 pour les
 * titres, comme les articles du panneau-menu), Anton pour les grands
 * chiffres, Playball pour les touches néon, Didact Gothic pour le nom de
 * l'enseigne. Fraunces (le mot-symbole Ominin) vient du layout racine.
 */
const poppins = Poppins({
  variable: "--font-pitch-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const anton = Anton({
  variable: "--font-pitch-anton",
  subsets: ["latin"],
  weight: "400",
});

const playball = Playball({
  variable: "--font-pitch-playball",
  subsets: ["latin"],
  weight: "400",
});

const didactGothic = Didact_Gothic({
  variable: "--font-pitch-didact",
  subsets: ["latin"],
  weight: "400",
});

export const pitchFontVariables = [poppins, anton, playball, didactGothic]
  .map((font) => font.variable)
  .join(" ");
