import { Bodoni_Moda, Montserrat } from "next/font/google";

/*
 * Les pages publiques d'Ominin Club : Bodoni Moda, un Didot à contrastes
 * forts, pour les titres (L'Étoile titre en Didot), Montserrat pour le texte
 * et les capitales espacées. preload: false, comme brand-fonts.ts : aucun
 * fichier n'est réclamé tant qu'aucun texte rendu ne l'appelle.
 */
const bodoni = Bodoni_Moda({
  variable: "--font-club-display",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz"],
  preload: false,
});

const montserrat = Montserrat({
  variable: "--font-club-sans",
  subsets: ["latin"],
  preload: false,
});

export const clubFonts = `${bodoni.variable} ${montserrat.variable}`;
