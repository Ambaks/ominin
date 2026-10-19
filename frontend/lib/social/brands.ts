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
 * Teintes des landings (components/landing-kit, palette candlelit sombre) :
 * le moteur de rendu des images ne lit pas les variables CSS. Toutes les
 * marques sur le même fond que les landings, chacune avec sa dominante dans
 * la famille ember — on reconnaît Ominin, on distingue l'offre.
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
      background: "#0c0a08",
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
      background: "#0c0a08",
      foreground: "#f3ece1",
      muted: "#a1937f",
      accentFrom: "#f5c26b",
      accentTo: "#d9653f",
      onAccent: "#0c0a08",
    },
  },
  {
    id: "shop",
    name: "Ominin Shop",
    url: "shop.ominin.com",
    theme: {
      background: "#0c0a08",
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
  /** Capture de l'outil posée dans un téléphone (lib/social/screens), ou "". */
  screen?: string;
}

/** Image n (à partir de 1) d'une publication ; format story pour Snapchat.
 * version (updated_at du post) : les images sont en cache immuable, une
 * correction doit changer d'URL. */
export function slideUrl(
  postId: string,
  index: number,
  version: string,
  story = false
): string {
  const params = new URLSearchParams({ v: version });
  if (story) params.set("format", "story");
  return `/api/social/slides/${postId}/${index}.jpg?${params}`;
}
