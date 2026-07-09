/**
 * Origine publique du site, source unique pour metadataBase, robots et sitemap.
 * Surchargeable via NEXT_PUBLIC_SITE_URL (préprod/preview) ; retombe sur le
 * domaine de production. Sans slash final pour concaténer proprement les chemins.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ominin.com"
).replace(/\/$/, "");
