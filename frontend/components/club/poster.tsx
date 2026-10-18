import Image from "next/image";
import type { ClubEvent } from "@/lib/club/types";

/*
 * L'affiche d'une soirée. Sans visuel téléversé par le club, une affiche
 * typographique : la date en grand, le titre en Didot, une constellation
 * propre à la soirée (tirée de son slug) sur une nébuleuse dont la teinte
 * suit le tag — une même série (Five Stars) garde la sienne d'une date à
 * l'autre.
 */

const VARIANTS = ["or", "lagon", "projecteurs", "corail"] as const;

function hash(text: string): number {
  let value = 5381;
  for (const char of text) value = (value * 33 + char.codePointAt(0)!) >>> 0;
  return value;
}

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric" });
const MONTH = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", month: "short" });
const WEEKDAY = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long" });

/*
 * La constellation, dans un repère 100 × 100 (la moitié haute de
 * l'affiche) : nombre d'étoiles, étendue, taille ; la première, la plus vive.
 */
const CONSTELLATION = { count: [5, 8], x: [12, 88], y: [8, 60], size: [1.2, 3.4], leadSize: 5 } as const;

const between = (rand: () => number, [min, max]: readonly [number, number]) =>
  min + rand() * (max - min);

function constellation(slug: string) {
  const rand = mulberry32(hash(slug));
  const count = Math.round(between(rand, CONSTELLATION.count));
  const stars = Array.from({ length: count }, (_, index) => ({
    x: between(rand, CONSTELLATION.x),
    y: between(rand, CONSTELLATION.y),
    size: index === 0 ? CONSTELLATION.leadSize : between(rand, CONSTELLATION.size),
    delay: rand(),
  }));
  // Le tracé relie les étoiles de proche en proche, de gauche à droite.
  const path = [...stars].sort((a, b) => a.x - b.x);
  return { stars, path: path.map((star) => `${star.x.toFixed(1)},${star.y.toFixed(1)}`).join(" ") };
}

const STAR_PATH = "M0-1C.08-.3.3-.08 1 0 .3.08.08.3 0 1-.08.3-.3.08-1 0-.3-.08-.08-.3 0-1Z";

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
  const { stars, path } = constellation(event.slug);
  const date = new Date(event.startsAt);
  return (
    <div
      className={`club-poster ${className}`}
      data-variant={variant}
      role="img"
      aria-label={`Affiche — ${event.title}`}
    >
      <div className="club-poster-nebula" aria-hidden />
      <svg className="club-poster-sky" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <polyline className="club-poster-line" points={path} pathLength={1} />
        {stars.map((star, index) => (
          <g
            key={index}
            className="club-poster-star"
            transform={`translate(${star.x.toFixed(2)} ${star.y.toFixed(2)}) scale(${star.size.toFixed(2)})`}
            style={{ "--twinkle-delay": star.delay.toFixed(2) } as React.CSSProperties}
          >
            <path d={STAR_PATH} />
          </g>
        ))}
      </svg>
      <div className="club-poster-text" aria-hidden>
        <p className="club-poster-tag">{event.tag ?? clubName}</p>
        <p className="club-poster-date">
          <span className="club-poster-day">{DAY.format(date)}</span>
          <span className="club-poster-month">
            <span>{MONTH.format(date).replace(".", "")}</span>
            <span>{WEEKDAY.format(date)}</span>
          </span>
        </p>
        <p className="club-poster-title">{event.title}</p>
        <p className="club-poster-club">{clubName}</p>
      </div>
    </div>
  );
}
