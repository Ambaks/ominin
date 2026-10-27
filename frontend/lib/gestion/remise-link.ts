import { menuSiteUrl } from "@/lib/site";

/*
 * Le code de retrait d'une commande : l'adresse de sa remise. Le ticket du
 * client l'affiche (order-ticket) ; l'appareil photo du téléphone l'ouvre
 * (/gestion/remise/<id>), le scanner de l'espace en tire la commande. Les
 * deux sens ici, pour qu'ils ne se perdent pas de vue.
 */

/** site : l'adresse où l'équipe est connectée (club.ominin.com pour un club). */
export const remiseUrl = (orderId: string, site = menuSiteUrl) => `${site}/gestion/remise/${orderId}`;

/** Le QR d'une table ou du comptoir : la carte (/m/<établissement>), pas un ticket. */
export const isMenuLink = (text: string) => {
  try {
    return /\/m\/[^/]+\/?$/.test(new URL(text).pathname);
  } catch {
    return false;
  }
};

/** La commande d'un code de retrait, ou null pour tout autre code. */
export function orderIdOf(text: string): string | null {
  try {
    return new URL(text).pathname.match(/\/gestion\/remise\/([0-9a-f-]{36})$/i)?.[1] ?? null;
  } catch {
    return null;
  }
}
