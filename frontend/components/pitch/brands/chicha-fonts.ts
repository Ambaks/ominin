import { Geist } from "next/font/google";

/*
 * La police du pitch aux restaurants-chicha (les rôles : o-crousti-poulet-fonts.ts) :
 * Geist partout, titres, chiffres et texte, comme dans le film.
 */
const geist = Geist({
  variable: "--font-pitch-text",
  subsets: ["latin"],
});

export const chichaFonts = geist.variable;
