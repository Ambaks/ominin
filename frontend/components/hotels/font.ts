import { Cormorant_Garamond, Jost } from "next/font/google";

/* Le couple de la proposition Plage Palace : Cormorant pour les titres, romain et italique ; Jost pour le texte. */
export const hotelsSerif = Cormorant_Garamond({
  variable: "--font-hotels-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

export const hotelsSans = Jost({
  variable: "--font-hotels-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});
