import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { PHOTO_SIZES, type Photo } from "@/lib/sites/cyprien";
import { Grain } from "./stamp";

/** Variables CSS en ligne (délais d’animation, index de lettre). */
export function vars(values: Record<string, string | number>): CSSProperties {
  return values as CSSProperties;
}

export function Arrow() {
  return (
    <svg viewBox="0 0 20 12" className="cy-arrow" aria-hidden="true" focusable="false">
      <path d="M0 6h18M13 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

type EyebrowProps = { children: ReactNode; className?: string; as?: "p" | "h2"; id?: string };

/** Surtitre : le grain se pose, puis le mot le suit, quand il entre à l’écran. */
export function Eyebrow({ children, className, as: Tag = "p", id }: EyebrowProps) {
  return (
    <Tag id={id} className={`cy-eyebrow ${className ?? ""}`} data-reveal="eyebrow">
      <Grain className="cy-eyebrow-grain" />
      <span>{children}</span>
    </Tag>
  );
}

type LinesProps = {
  lines: ReactNode[];
  className?: string;
  id?: string;
};

/** Titre de section dont chaque ligne monte de derrière un cache quand il entre à l’écran. */
export function Lines({ lines, className, id }: LinesProps) {
  return (
    <h2 id={id} className={className} data-reveal="lines">
      {lines.map((line, index) => (
        <span key={index} className="cy-line">
          <span style={vars({ "--i": index })}>{line}</span>
        </span>
      ))}
    </h2>
  );
}

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "paper" | "ghost-night";
  className?: string;
};

export function ButtonLink({ href, children, variant = "primary", className }: ButtonLinkProps) {
  const classes = `cy-btn cy-btn-${variant} ${className ?? ""}`;
  const content = (
    <>
      <span>{children}</span>
      <Arrow />
    </>
  );
  return href.startsWith("/") ? (
    <Link href={href} className={classes}>
      {content}
    </Link>
  ) : (
    <a href={href} className={classes}>
      {content}
    </a>
  );
}

export function ExternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> (nouvel onglet)</span>
    </a>
  );
}

type MediaProps = {
  photo: Photo;
  className?: string;
  /** Recadrage : object-position de la photo. */
  focus?: string;
  parallax?: boolean;
  delay?: number;
};

/** Photo révélée par un rideau à l’entrée, avec une légère parallaxe au défilement. */
export function Media({ photo, className, focus, parallax = true, delay }: MediaProps) {
  return (
    <div className={`cy-media ${className ?? ""}`} data-reveal="clip" data-delay={delay}>
      <div className={parallax ? "cy-par" : "cy-par-off"}>
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={PHOTO_SIZES}
          className="object-cover"
          style={focus ? { objectPosition: focus } : undefined}
        />
      </div>
    </div>
  );
}

type PageHeroProps = {
  eyebrow: string;
  title: ReactNode[];
  intro: string;
  photo?: Photo;
  focus?: string;
  /** Photo en colonne à droite du titre plutôt qu’en bandeau (photos portrait). */
  side?: boolean;
};

/** En-tête des pages intérieures : titre en lignes, chapô, grande photo. */
export function PageHero({ eyebrow, title, intro, photo, focus, side = false }: PageHeroProps) {
  const lead = <p className="cy-lead">{intro}</p>;
  const media = photo && (
    <div className={`cy-page-hero-media ${side ? "cy-page-hero-media-side" : ""}`}>
      <div className="cy-par-hero">
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          preload
          sizes={PHOTO_SIZES}
          className="cy-kenburns object-cover"
          style={focus ? { objectPosition: focus } : undefined}
        />
      </div>
    </div>
  );
  return (
    <section className="cy-page-hero" aria-labelledby="titre-page">
      <div className="cy-wrap">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className={side ? "lg:col-span-6" : "lg:col-span-7"}>
            <Eyebrow className="cy-load">{eyebrow}</Eyebrow>
            <h1 id="titre-page" className="cy-h1 cy-load-lines">
              {title.map((line, index) => (
                <span key={index} className="cy-line">
                  <span style={vars({ "--i": index })}>{line}</span>
                </span>
              ))}
            </h1>
            {side && (
              <div className="cy-load mt-8" style={vars({ "--d": "0.45s" })}>
                {lead}
              </div>
            )}
          </div>
          {side ? (
            media && <div className="lg:col-span-5 lg:col-start-8">{media}</div>
          ) : (
            <div className="cy-load lg:col-span-4 lg:col-start-9" style={vars({ "--d": "0.45s" })}>
              {lead}
            </div>
          )}
        </div>
      </div>
      {!side && media && <div className="cy-wrap mt-10 lg:mt-16">{media}</div>}
    </section>
  );
}
