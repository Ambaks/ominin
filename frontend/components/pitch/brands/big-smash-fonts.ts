import { Archivo, Archivo_Black, Big_Shoulders } from "next/font/google";

/*
 * Les polices du pitch Big Smash (les rôles : o-crousti-poulet-fonts.ts) :
 * Archivo, la plus proche d'Obviously (la police du site) parmi les Google
 * Fonts, à chasse variable, pour le texte et les titres ; Big Shoulders pour
 * les grands chiffres, hauts, serrés et arrondis comme les lettres du logo
 * (sa taille optique passe en coupe Display aux grands corps) ; Archivo Black
 * pour la touche de l'enseigne et son nom (big-smash.css en dérive -wordmark).
 */
const archivo = Archivo({
  variable: "--font-pitch-text",
  subsets: ["latin"],
  axes: ["wdth"],
});

const bigShoulders = Big_Shoulders({
  variable: "--font-pitch-numeral",
  subsets: ["latin"],
  axes: ["opsz"],
});

const archivoBlack = Archivo_Black({
  variable: "--font-pitch-flourish",
  subsets: ["latin"],
  weight: "400",
});

export const bigSmashFonts = [archivo, bigShoulders, archivoBlack].map((font) => font.variable).join(" ");
