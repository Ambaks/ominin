/**
 * Domaine du cookie de session Supabase. Les trois produits vivent sur des
 * hôtes distincts (ominin.com, collect.ominin.com, clip.ominin.com) mais ne
 * partagent qu'un seul espace de gestion : sans domaine parent, la session
 * ouverte depuis le sous-domaine collect ne suivrait pas jusqu'à /gestion.
 * Non défini en local, où les hôtes n'ont pas de domaine parent commun.
 */
export const authCookieOptions = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN
  ? { domain: process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN }
  : undefined;
