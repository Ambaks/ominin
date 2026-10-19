import Image from "next/image";
import type { CSSProperties } from "react";
import type { ClubEvent } from "@/lib/club/types";

/*
 * L'affiche d'une soirée. Sans visuel téléversé par le club, une affiche
 * typographique : un astre en lumière (sa teinte suit le tag, une même série
 * garde la sienne), son anneau, l'étoile du club, la date en très grand et
 * le titre en grotesque grasse. La place de l'astre varie d'une date à
 * l'autre (tirée du slug).
 */

const VARIANTS = ["or", "lagon", "projecteurs", "corail"] as const;

function hash(text: string): number {
  let value = 5381;
  for (const char of text) value = (value * 33 + char.codePointAt(0)!) >>> 0;
  return value;
}

/* L'astre : centre (% de l'affiche) et diamètre (% de la largeur), bornes du tirage. */
const ORB = { x: [58, 86], y: [14, 34], size: [62, 84] } as const;

const pick = (seed: number, [min, max]: readonly [number, number]) => min + ((seed % 1000) / 1000) * (max - min);

const DAY = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric" });
const MONTH = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", month: "short" });
const WEEKDAY = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short" });

const STAR = "M50 0C51.6 30 56 44.4 100 50C56 55.6 51.6 70 50 100C48.4 70 44 55.6 0 50C44 44.4 48.4 30 50 0Z";

export function Poster({
  event,
  clubName,
  sizes,
  className = "",
}: {
  event: ClubEvent;
  clubName: string;
  /** Largeur rendue de l'affiche (attribut sizes), quand elle est téléversée. */
  sizes: string;
  className?: string;
}) {
  if (event.posterUrl) {
    return (
      <div className={`club-poster ${className}`} data-variant="image">
        <Image src={event.posterUrl} alt={`Affiche — ${event.title}`} fill sizes={sizes} className="club-poster-image" />
      </div>
    );
  }
  const variant = VARIANTS[hash((event.tag ?? event.title).toLowerCase()) % VARIANTS.length];
  const seed = hash(event.slug);
  const date = new Date(event.startsAt);
  const orb = {
    "--ox": `${pick(seed, ORB.x)}%`,
    "--oy": `${pick(seed >>> 10, ORB.y)}%`,
    "--os": `${pick(seed >>> 20, ORB.size)}%`,
  } as CSSProperties;
  return (
    <div className={`club-poster ${className}`} data-variant={variant} role="img" aria-label={`Affiche — ${event.title}`}>
      <div className="club-poster-art" style={orb} aria-hidden>
        <span className="club-poster-orb" />
        <span className="club-poster-ring" />
        <svg className="club-poster-star" viewBox="0 0 100 100">
          <path d={STAR} />
        </svg>
      </div>
      <div className="club-poster-text" aria-hidden>
        <p className="club-poster-top">
          <span className="club-poster-tag">{event.tag ?? clubName}</span>
          <span className="club-poster-club">{clubName}</span>
        </p>
        <p className="club-poster-date">
          <span className="club-poster-day">{DAY.format(date)}</span>
          <span className="club-poster-month">
            {WEEKDAY.format(date).replace(".", "")} · {MONTH.format(date).replace(".", "")}
          </span>
        </p>
        <p className="club-poster-title">{event.title}</p>
      </div>
    </div>
  );
}
