import { Geist } from "next/font/google";

/*
 * La police du pitch aux clubs (les rôles : o-crousti-poulet-fonts.ts) :
 * Geist partout, titres, chiffres et texte, comme dans le film. Pas de
 * touche manuscrite ni de nom d'enseigne à composer : la page est d'Ominin.
 */
const geist = Geist({
  variable: "--font-pitch-text",
  subsets: ["latin"],
});

export const clubFonts = geist.variable;
