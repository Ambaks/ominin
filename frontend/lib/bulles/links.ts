import { menuSiteUrl } from "@/lib/site";

/*
 * Les pages des bulles vivent sous le menu de l'établissement
 * (menu.ominin.com/m/<slug>/bulle) : absolues, elles marchent aussi bien
 * dans un e-mail que sous la forme préfixée /menu du domaine principal.
 */
export const bulleUrl = (slug: string) => `${menuSiteUrl}/m/${slug}/bulle`;

/** La page de réservation de l'organisateur. */
export const reservationUrl = (slug: string, token: string) =>
  `${menuSiteUrl}/m/${slug}/bulle/${token}`;

/** Le lien que l'organisateur envoie à ses amis pour qu'ils paient leur place. */
export const partageUrl = (slug: string, shareToken: string) =>
  `${menuSiteUrl}/m/${slug}/bulle/partage/${shareToken}`;

/** La clé de la page de réservation : 16 octets en hexadécimal (bulle_reservations.token). */
export const isReservationToken = (value: string) => /^[0-9a-f]{32}$/.test(value);

/** La clé d'un lien de partage : 12 octets en hexadécimal (bulle_reservations.share_token). */
export const isShareToken = (value: string) => /^[0-9a-f]{24}$/.test(value);
