/** Chemin absolu (sur le host courant) d'une page de la boutique. Module sans directive : utilisable côté serveur comme côté client. */
export function shopHref(slug: string, path = ""): string {
  return `/${slug}${path}`;
}
