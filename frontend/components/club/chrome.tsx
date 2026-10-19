import Link from "next/link";
import { EtoileMark } from "@/components/menu/etoile/logo";
import { clubHref } from "@/lib/club/links";

/* L'en-tête et le pied communs aux pages d'un club. */

export function ClubTop({
  slug,
  name,
  tagline,
  back,
}: {
  slug: string;
  name: string;
  tagline?: string | null;
  back?: string;
}) {
  return (
    <header className="club-top">
      <Link href={clubHref(`/${slug}`)} className="club-top-brand">
        <EtoileMark className="club-top-mark" />
        <span className="club-wordmark-sm">{name}</span>
        {tagline && <span className="club-top-tagline">{tagline}</span>}
      </Link>
      {back && (
        <Link href={clubHref(`/${slug}`)} className="club-top-back">
          <svg viewBox="0 0 16 16" aria-hidden>
            <path d="M10 3 5 8l5 5" />
          </svg>
          {back}
        </Link>
      )}
    </header>
  );
}

export function ClubFooter({
  name,
  address,
  phone,
}: {
  name: string;
  address: string | null;
  phone: string | null;
}) {
  return (
    <footer className="club-footer" data-chapter>
      <EtoileMark className="club-footer-mark" />
      <p className="club-wordmark-sm">{name}</p>
      {address && <p className="club-footer-line">{address}</p>}
      {phone && (
        <a className="club-footer-line club-link" href={`tel:${phone.replace(/\s/g, "")}`}>
          {phone}
        </a>
      )}
      <p className="club-footer-by">
        Réservation par <span>Ominin Club</span>
      </p>
    </footer>
  );
}
