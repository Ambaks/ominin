/*
 * Les établissements dont Ominin a développé le site. Sans lui, les capacités
 * « Site web » et « Réservations » restent grisées dans l'admin.
 */
const BESPOKE_SITE_SLUGS = ["boho"];

export const hasBespokeSite = (slug: string) => BESPOKE_SITE_SLUGS.includes(slug);

/*
 * Le domaine d'un site, s'il en a un : le site y répond à la racine, et son
 * ancienne adresse /w/<slug> y redirige. Host absent ⇒ il reste sous le menu.
 * Un host localhost (dev) est servi en http.
 */
const SITE_HOSTS: Record<string, string | undefined> = {
  boho: process.env.NEXT_PUBLIC_BOHO_HOST,
};

export const siteHostOf = (slug: string) => SITE_HOSTS[slug];

export const siteSlugOfHost = (host: string) => Object.keys(SITE_HOSTS).find((slug) => SITE_HOSTS[slug] === host);

export function siteOriginOf(slug: string) {
  const host = siteHostOf(slug);
  return host && `${host.includes("localhost") ? "http" : "https"}://${host}`;
}
