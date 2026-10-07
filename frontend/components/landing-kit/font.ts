import { Geist } from "next/font/google";

/** Titres et chiffres des landings produit. */
export const kitFont = Geist({
  variable: "--font-kit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});
