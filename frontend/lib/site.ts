/**
 * Origine publique du site, source unique pour metadataBase, robots et sitemap.
 * Surchargeable via NEXT_PUBLIC_SITE_URL (préprod/preview) ; retombe sur le
 * domaine de production. Sans slash final pour concaténer proprement les chemins.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ominin.com"
).replace(/\/$/, "");

/**
 * Origine publique du sous-domaine clippers, pour les canonicals des pages
 * /clip (accessibles aussi via ominin.com/clip à cause de la réécriture).
 * Dérivée du même host que la réécriture du proxy (NEXT_PUBLIC_CLIP_HOST).
 */
export const clipSiteUrl = `https://${
  process.env.NEXT_PUBLIC_CLIP_HOST ?? "clip.ominin.com"
}`;
