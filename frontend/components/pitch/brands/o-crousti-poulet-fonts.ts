import { Anton, Didact_Gothic, Playball, Poppins } from "next/font/google";

/*
 * Les polices du pitch O'Crousti Poulet, déclarées ici et non reprises de
 * lib/menu/brand-fonts.ts : celles-là servent les cartes, sans préchargement ;
 * le pitch les veut au premier rendu. Un module par enseigne : une page ne
 * charge que les siennes. Les rôles, que pitch.css lit : --font-pitch-text
 * (texte et titres), -numeral (grands chiffres), -flourish (touche
 * manuscrite), -wordmark (son nom).
 *
 * Poppins (800 pour les titres, comme les articles du panneau-menu), Anton,
 * Playball, Didact Gothic pour le nom de l'enseigne.
 */
const poppins = Poppins({
  variable: "--font-pitch-text",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const anton = Anton({
  variable: "--font-pitch-numeral",
  subsets: ["latin"],
  weight: "400",
});

const playball = Playball({
  variable: "--font-pitch-flourish",
  subsets: ["latin"],
  weight: "400",
});

const didactGothic = Didact_Gothic({
  variable: "--font-pitch-wordmark",
  subsets: ["latin"],
  weight: "400",
});

export const oCroustiPouletFonts = [poppins, anton, playball, didactGothic].map((font) => font.variable).join(" ");
