import { Anton, Archivo } from "next/font/google";

/*
 * Les polices du pitch Chicken Street (les rôles : o-crousti-poulet-fonts.ts) :
 * Archivo pour le texte et les titres ; Anton, capitales condensées et
 * grasses, pour les grands chiffres et la touche de l'enseigne, à la place
 * de WoodHeinz, la police du site, dont la licence n'est pas connue.
 */
const archivo = Archivo({
  variable: "--font-pitch-text",
  subsets: ["latin"],
  axes: ["wdth"],
});

const anton = Anton({
  variable: "--font-pitch-numeral",
  subsets: ["latin"],
  weight: "400",
});

export const chickenStreetFonts = [archivo, anton].map((font) => font.variable).join(" ");
