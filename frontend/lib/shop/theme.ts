import type { CSSProperties } from "react";
import type { Json } from "@/lib/supabase/database.types";

/*
 * Thème d'une boutique : une palette de jetons et un préréglage de polices,
 * stockés dans shops.theme et posés en variables CSS sur la racine du site
 * de la boutique (les utilitaires shop-* de globals.css les référencent).
 * Aucune couleur n'est écrite dans les composants : MyBox est rose, la
 * boutique suivante sera ce que sa propriétaire choisira dans Réglages.
 */

export type ShopFontPreset = "romantique" | "elegant" | "moderne";

export const FONT_PRESET_LABELS: Record<ShopFontPreset, string> = {
  romantique: "Romantique · Playfair Display, Allura et Montserrat",
  elegant: "Élégant · Cormorant Garamond et Inter",
  moderne: "Moderne · DM Serif Display et DM Sans",
};

export interface ShopPalette {
  /** Fond des pages. */
  bg: string;
  /** Surfaces (cartes, en-tête, pied de page). */
  paper: string;
  /** Teintes claires de l'accent (sections, puces). */
  tint: string;
  tintStrong: string;
  /** Accent principal (boutons) et ses variantes. */
  accentSoft: string;
  accent: string;
  accentStrong: string;
  accentDeep: string;
  /** Texte. */
  ink: string;
  inkSoft: string;
  inkMute: string;
  inkFaint: string;
  /** Filets. */
  line: string;
  lineSoft: string;
  /** Touche « premium » (séparateurs, badges best-seller). */
  gold: string;
  goldSoft: string;
  cream: string;
}

export const PALETTE_LABELS: Record<keyof ShopPalette, string> = {
  bg: "Fond",
  paper: "Surfaces",
  tint: "Teinte claire",
  tintStrong: "Teinte soutenue",
  accentSoft: "Accent doux",
  accent: "Accent (boutons)",
  accentStrong: "Accent survol",
  accentDeep: "Accent foncé (titres)",
  ink: "Texte",
  inkSoft: "Texte secondaire",
  inkMute: "Texte discret",
  inkFaint: "Bordures de champs",
  line: "Filets",
  lineSoft: "Filets légers",
  gold: "Doré",
  goldSoft: "Doré clair",
  cream: "Crème",
};

/** Palette MyBox (brandkit rose poudré, doré mat) : défaut des nouvelles boutiques. */
export const DEFAULT_PALETTE: ShopPalette = {
  bg: "#fdf4f6",
  paper: "#fffbfc",
  tint: "#fbe9ee",
  tintStrong: "#f8d5dd",
  accentSoft: "#efb3c2",
  accent: "#cb7b8d",
  accentStrong: "#b96479",
  accentDeep: "#8f4b5e",
  ink: "#3d2a30",
  inkSoft: "#7b6369",
  inkMute: "#a8949a",
  inkFaint: "#d8c3c9",
  line: "#ead3d9",
  lineSoft: "#f3e3e7",
  gold: "#b9937a",
  goldSoft: "#e6d3c3",
  cream: "#f7ebdd",
};

export interface ShopTheme {
  fonts: ShopFontPreset;
  palette: ShopPalette;
}

const FONT_PRESETS: ShopFontPreset[] = ["romantique", "elegant", "moderne"];
const HEX = /^#[0-9a-f]{6}$/i;

/** Lit shops.theme en tolérant un JSON partiel ou vide : chaque jeton manquant reprend le défaut. */
export function resolveTheme(raw: Json | null | undefined): ShopTheme {
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const fonts = FONT_PRESETS.includes(obj.fonts as ShopFontPreset)
    ? (obj.fonts as ShopFontPreset)
    : "romantique";
  const colors =
    obj.palette && typeof obj.palette === "object" && !Array.isArray(obj.palette)
      ? (obj.palette as Record<string, Json | undefined>)
      : {};
  const palette = { ...DEFAULT_PALETTE };
  for (const key of Object.keys(DEFAULT_PALETTE) as (keyof ShopPalette)[]) {
    const value = colors[key];
    if (typeof value === "string" && HEX.test(value)) palette[key] = value;
  }
  return { fonts, palette };
}

/** Variables CSS de la palette, à poser sur la racine du site de la boutique. */
export function paletteStyle(palette: ShopPalette): CSSProperties {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(palette)) {
    vars[`--shop-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`] = value;
  }
  return vars as CSSProperties;
}
