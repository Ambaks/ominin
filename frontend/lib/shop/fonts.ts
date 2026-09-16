import {
  Allura,
  Cormorant_Garamond,
  DM_Sans,
  DM_Serif_Display,
  Inter,
  Montserrat,
  Playfair_Display,
} from "next/font/google";
import type { CSSProperties } from "react";
import type { ShopFontPreset, ShopPalette } from "./theme";
import { paletteStyle } from "./theme";

/*
 * Les polices des boutiques, déclarées une seule fois. Le site public et
 * l'espace de gestion s'habillent du même thème : les déclarer dans chacun
 * des deux layouts créerait deux chargeurs pour les mêmes fichiers.
 *
 * Toutes sont auto-hébergées au build ; aucune n'est préchargée, puisque
 * seules celles du préréglage d'une boutique donnée servent vraiment.
 */

const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], preload: false });
const allura = Allura({ variable: "--font-allura", weight: "400", subsets: ["latin"], preload: false });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], preload: false });
const cormorant = Cormorant_Garamond({ variable: "--font-cormorant", subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], preload: false });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], preload: false });
const dmSerif = DM_Serif_Display({ variable: "--font-dm-serif", weight: "400", style: ["normal", "italic"], subsets: ["latin"], preload: false });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], preload: false });

/** À poser en classe sur la racine, pour que les variables de police existent. */
export const FONT_VARIABLES = [playfair, allura, montserrat, cormorant, inter, dmSerif, dmSans]
  .map((font) => font.variable)
  .join(" ");

const PRESET_FONTS: Record<ShopFontPreset, { display: string; script: string; sans: string }> = {
  romantique: { display: "var(--font-playfair)", script: "var(--font-allura)", sans: "var(--font-montserrat)" },
  elegant: { display: "var(--font-cormorant)", script: "var(--font-cormorant)", sans: "var(--font-inter)" },
  moderne: { display: "var(--font-dm-serif)", script: "var(--font-dm-serif)", sans: "var(--font-dm-sans)" },
};

/** Palette et polices d'une boutique, en variables CSS pour sa racine. */
export function shopThemeStyle(palette: ShopPalette, fonts: ShopFontPreset): CSSProperties {
  const preset = PRESET_FONTS[fonts];
  return {
    ...paletteStyle(palette),
    "--font-shop-display": preset.display,
    "--font-shop-script": preset.script,
    "--font-shop-sans": preset.sans,
  } as CSSProperties;
}
