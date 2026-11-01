import { BOHO_DEMO_PATH, BOHO_DEMO_SLUG } from "@/lib/bulles/demo";
import { menuSiteUrl } from "@/lib/site";
import { siteOriginOf } from "@/lib/sites/bespoke";

/*
 * Le site d'un établissement et ses réservations vivent sur son domaine s'il en
 * a un, sinon sous menu.ominin.com/w/<slug> ; ceux de la démonstration du Boho
 * sous /demo/boho.
 * Absolues, elles marchent aussi bien dans un e-mail que sous la
 * forme préfixée /menu du domaine principal.
 */
const publicBase = (slug: string) =>
  slug === BOHO_DEMO_SLUG ? `${menuSiteUrl}${BOHO_DEMO_PATH}` : (siteOriginOf(slug) ?? `${menuSiteUrl}/w/${slug}`);

/** La carte (le menu QR) de l'établissement. */
export const carteUrl = (slug: string) =>
  slug === BOHO_DEMO_SLUG ? `${publicBase(slug)}/carte` : `${menuSiteUrl}/m/${slug}`;

/** Son site. */
export const siteUrlOf = (slug: string) =>
  slug === BOHO_DEMO_SLUG ? `${publicBase(slug)}/site` : publicBase(slug);

export const bulleUrl = (slug: string) => `${publicBase(slug)}/bulle`;

/** La page de réservation de l'organisateur. */
export const reservationUrl = (slug: string, token: string) => `${publicBase(slug)}/bulle/${token}`;

/** Le lien que l'organisateur envoie à ses amis pour qu'ils paient leur place. */
export const partageUrl = (slug: string, shareToken: string) =>
  `${publicBase(slug)}/bulle/partage/${shareToken}`;

/** La clé de la page de réservation : 16 octets en hexadécimal (bulle_reservations.token). */
export const isReservationToken = (value: string) => /^[0-9a-f]{32}$/.test(value);

/** La clé d'un lien de partage : 12 octets en hexadécimal (bulle_reservations.share_token). */
export const isShareToken = (value: string) => /^[0-9a-f]{24}$/.test(value);
