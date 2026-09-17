/*
 * Les quatre marques qui publient, et les réseaux visés. Miroir de BRANDS
 * dans backend/app/prompts/social.py et des contraintes de la migration
 * social : une marque ajoutée se déclare aux trois endroits.
 */

export type SocialBrand = "ominin" | "shop" | "menu" | "collect";
export type SocialPlatform = "instagram" | "facebook" | "snapchat";

export interface BrandTheme {
  background: string;
  foreground: string;
  muted: string;
  /** Dégradé de la barre d'accent et de la pastille d'appel à l'action. */
  accentFrom: string;
  accentTo: string;
  /** Texte posé sur le dégradé. */
  onAccent: string;
}

export interface Brand {
  id: SocialBrand;
  name: string;
  url: string;
  theme: BrandTheme;
}

/*
 * Teintes reprises de app/globals.css (palette candlelit sombre et sa
 * variante claire) : le moteur de rendu des images ne lit pas les variables
 * CSS. Chaque marque garde la famille ember, avec sa dominante — on
 * reconnaît Ominin, on distingue l'offre.
 */
export const BRANDS: readonly Brand[] = [
  {
    id: "ominin",
    name: "Ominin",
    url: "ominin.com",
    theme: {
      background: "#0c0a08",
      foreground: "#f3ece1",
      muted: "#a1937f",
      accentFrom: "#f0b35b",
      accentTo: "#c94f5e",
      onAccent: "#0c0a08",
    },
  },
  {
    id: "menu",
    name: "Ominin Menu",
    url: "menu.ominin.com",
    theme: {
      background: "#15110d",
      foreground: "#f3ece1",
      muted: "#a1937f",
      accentFrom: "#f0b35b",
      accentTo: "#e2764b",
      onAccent: "#0c0a08",
    },
  },
  {
    id: "collect",
    name: "Ominin Collect",
    url: "collect.ominin.com",
    theme: {
      background: "#faf6f0",
      foreground: "#221b13",
      muted: "#7a6a58",
      accentFrom: "#c08515",
      accentTo: "#c05a32",
      onAccent: "#ffffff",
    },
  },
  {
    id: "shop",
    name: "Ominin Shop",
    url: "shop.ominin.com",
    theme: {
      background: "#1c1712",
      foreground: "#f3ece1",
      muted: "#a1937f",
      accentFrom: "#e2764b",
      accentTo: "#c94f5e",
      onAccent: "#ffffff",
    },
  },
];

export const BRAND_BY_ID = new Map(BRANDS.map((brand) => [brand.id, brand]));

export const PLATFORMS: readonly { id: SocialPlatform; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "snapchat", label: "Snapchat" },
];

export interface Slide {
  kicker: string;
  title: string;
  body: string;
}

/** Image n (à partir de 1) d'une publication ; format story pour Snapchat. */
export function slideUrl(postId: string, index: number, story = false): string {
  return `/api/social/slides/${postId}/${index}.jpg${story ? "?format=story" : ""}`;
}
