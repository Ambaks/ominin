import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";

/*
 * Les pages publiques d'Ominin Club : Bricolage Grotesque, une grotesque
 * contemporaine, pour les titres ; Geist pour l'interface et le texte ;
 * Geist Mono pour ce qui se compare ou se recopie (prix, numéros de table,
 * code de réservation, compte à rebours). preload: false, comme
 * brand-fonts.ts : aucun fichier n'est réclamé tant qu'aucun texte rendu ne
 * l'appelle.
 */
const bricolage = Bricolage_Grotesque({
  variable: "--font-club-display",
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
  preload: false,
});

const geist = Geist({
  variable: "--font-club-sans",
  subsets: ["latin"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-club-mono",
  subsets: ["latin"],
  preload: false,
});

export const clubFonts = `${bricolage.variable} ${geist.variable} ${geistMono.variable}`;
