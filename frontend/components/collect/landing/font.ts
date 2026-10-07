import { Geist } from "next/font/google";

/** Titres et chiffres de la landing Collect. */
export const collectFont = Geist({
  variable: "--font-collect",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});
