/**
 * Chemin d'une page d'Ominin Club, tel que le navigateur doit le suivre : à
 * la racine de club.ominin.com quand le sous-domaine est actif, sous /clubs
 * sur le domaine principal sinon (proxy.ts). clubHref("/l-etoile") ⇒
 * « /l-etoile » ou « /clubs/l-etoile ».
 */
export function clubHref(path: string): string {
  return process.env.NEXT_PUBLIC_CLUB_HOST ? path : `/clubs${path}`;
}

/** La page de réservation d'un client, relative à la racine d'Ominin Club. */
export const bookingPath = (slug: string, token: string) => `/${slug}/reservation/${token}`;
