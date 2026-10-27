/*
 * La démonstration des bulles du Boho, montrée à son gérant avant la vente :
 * un établissement à part en base (boho-demo, migration 20261027000002), servi
 * sous menu.ominin.com/demo/boho — site, carte, réservation et gestion des
 * bulles, sans compte. Le vrai Boho n'en a rien.
 */
export const BOHO_DEMO_SLUG = "boho-demo";

/** L'adresse des pages de la démo, sous le menu (proxy : /demo → /menu/demo). */
export const BOHO_DEMO_PATH = "/demo/boho";

/** L'établissement en base derrière une adresse /demo/<slug> ; null si ce n'est pas une démo de bulles. */
export function bulleDemoSlug(slug: string): string | null {
  return slug === "boho" ? BOHO_DEMO_SLUG : null;
}
