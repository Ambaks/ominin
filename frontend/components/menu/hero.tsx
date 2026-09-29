import { Fragment } from "react";
import { preload } from "react-dom";
import { ArrowDown, CarteLink } from "@/components/menu/carte-link";
import {
  displayAddress,
  displayPhone,
  mapsUrl,
  type Restaurant,
} from "@/lib/menu-data";

const PARTICLES = [
  { left: "10%", w: 3, h: 3, bg: "var(--ember-1)", delay: "0s", dur: "13s", peak: 0.45 },
  { left: "25%", w: 2, h: 2, bg: "var(--ember-2)", delay: "3s", dur: "15s", peak: 0.35 },
  { left: "42%", w: 4, h: 4, bg: "var(--ember-1)", delay: "6s", dur: "11s", peak: 0.55 },
  { left: "58%", w: 2, h: 2, bg: "var(--ember-3)", delay: "1.5s", dur: "14s", peak: 0.3 },
  { left: "73%", w: 3, h: 3, bg: "var(--ember-2)", delay: "8s", dur: "12s", peak: 0.4 },
  { left: "88%", w: 2, h: 2, bg: "var(--ember-1)", delay: "4.5s", dur: "16s", peak: 0.35 },
  { left: "33%", w: 2, h: 2, bg: "var(--ember-3)", delay: "10s", dur: "13s", peak: 0.3 },
  { left: "65%", w: 3, h: 3, bg: "var(--ember-1)", delay: "7s", dur: "11s", peak: 0.5 },
  { left: "18%", w: 2, h: 2, bg: "var(--ember-2)", delay: "5s", dur: "14s", peak: 0.25 },
  { left: "80%", w: 3, h: 3, bg: "var(--ember-3)", delay: "2s", dur: "12s", peak: 0.4 },
];

const PILL_CLASS =
  "inline-flex min-h-11 items-center rounded-full border border-hairline bg-surface/70 px-4 py-2.5 backdrop-blur";

/** Adresse, téléphone : seuls les champs renseignés ont leur pastille. */
function ContactPills({
  restaurant,
  className,
  style,
}: {
  restaurant: Restaurant;
  className: string;
  style?: React.CSSProperties;
}) {
  const texts = [restaurant.address]
    .map((text) => text.trim())
    .filter(Boolean);
  const phone = restaurant.phone.trim();
  if (texts.length === 0 && !phone) return null;

  return (
    <div className={className} style={style}>
      {texts.map((text) => (
        <a
          key={text}
          href={mapsUrl(text)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${PILL_CLASS} transition-colors hover:text-foreground`}
        >
          {displayAddress(text)}
        </a>
      ))}
      {phone && (
        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          className={`${PILL_CLASS} transition-colors hover:text-foreground`}
        >
          {displayPhone(phone)}
        </a>
      )}
    </div>
  );
}

/**
 * Le nom, un mot par <span> : un thème peut le colorer mot à mot, comme une
 * enseigne bicolore (.theme-o-crousti-poulet). Sans thème, rien ne change.
 */
function NameWords({ name }: { name: string }) {
  return name.split(" ").map((word, i) => (
    <Fragment key={i}>
      {i > 0 && " "}
      <span>{word}</span>
    </Fragment>
  ));
}

function LogoHero({ restaurant }: { restaurant: Restaurant }) {
  return (
    // pt : quand le contenu dépasse la hauteur minimale (téléphone, logo
    // haut), le centrage ne laisse plus d'air et le logo touche le bord.
    <header className="logo-hero relative flex min-h-[62svh] w-full flex-col items-center justify-center overflow-hidden pb-24 pt-12 lg:min-h-[72svh] lg:pb-28 lg:pt-16">
      <div className="absolute inset-0 bg-background" />

      {/* Lueurs et halo : aux couleurs de la marque par défaut, qu'un thème
          peut remplacer (--hero-glow-*, --hero-halo-*). */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(ellipse 80% 50% at 50% 42%, color-mix(in srgb, var(--hero-glow-1, var(--ember-1)) 14%, transparent), transparent 70%)",
            "radial-gradient(ellipse 55% 40% at 25% 58%, color-mix(in srgb, var(--hero-glow-3, var(--ember-3)) 9%, transparent), transparent 65%)",
            "radial-gradient(ellipse 50% 35% at 78% 35%, color-mix(in srgb, var(--hero-glow-2, var(--ember-2)) 7%, transparent), transparent 60%)",
          ].join(", "),
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, var(--background) 100%)",
        }}
      />

      <div className="hero-gradient-drift absolute inset-0" />

      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="ember-particle"
          style={
            {
              left: p.left,
              width: p.w,
              height: p.h,
              backgroundColor: p.bg,
              animationDelay: p.delay,
              "--particle-duration": p.dur,
              "--particle-peak": p.peak,
            } as React.CSSProperties
          }
        />
      ))}

      {restaurant.logo && (
        <div className="hero-logo hero-entrance relative z-10 mb-8 lg:mb-12">
          <div
            className="logo-breathe absolute -inset-10 rounded-full blur-3xl lg:-inset-16"
            style={{
              background:
                "radial-gradient(circle, var(--hero-halo-1, var(--ember-1)), var(--hero-halo-2, var(--ember-2)) 60%, transparent 80%)",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- actif local de marque, dimensions libres */}
          <img
            src={restaurant.logo}
            alt=""
            className={`relative h-28 w-auto sm:h-32 lg:h-40 xl:h-44 ${restaurant.whiteLogo ? "logo-white" : ""}`}
          />
        </div>
      )}

      {/* Accroche, nom et filet : sans effet par défaut (display: contents),
          une enveloppe pour qu'un thème les compose comme une enseigne —
          le nom sur une ligne, l'accroche au bout du filet. */}
      <div className="hero-lockup contents">
        <p
          className="hero-tagline hero-entrance ember-text relative z-10 text-[11px] font-semibold uppercase tracking-[0.35em] lg:text-xs lg:tracking-[0.4em]"
          style={{ animationDelay: "200ms" }}
        >
          {restaurant.tagline}
        </p>

        <h1
          className="hero-name hero-entrance relative z-10 mt-3 px-5 text-center font-display text-6xl font-medium leading-none tracking-tight max-[359px]:text-5xl sm:text-7xl lg:mt-5 lg:text-8xl xl:text-9xl"
          style={{ animationDelay: "350ms" }}
        >
          <NameWords name={restaurant.name} />
        </h1>

        <div
          className="hero-rule hero-entrance ember-gradient relative z-10 mt-6 h-px w-20 opacity-50 lg:mt-8 lg:w-28"
          aria-hidden
          style={{ animationDelay: "500ms" }}
        />
      </div>

      <ContactPills
        restaurant={restaurant}
        className="hero-contact hero-entrance relative z-10 mt-6 flex flex-wrap justify-center gap-2 px-5 text-xs text-muted lg:mt-8 lg:gap-3 lg:text-sm"
        style={{ animationDelay: "650ms" }}
      />

      <CarteLink
        className="hero-cue hero-entrance absolute bottom-8 z-10 flex min-h-11 flex-col items-center justify-center gap-2 px-4 text-muted transition-colors hover:text-foreground lg:bottom-12"
        style={{ animationDelay: "1100ms" }}
      >
        <span className="text-[10px] uppercase tracking-[0.3em]">
          Découvrir la carte
        </span>
        <svg
          className="scroll-bounce size-4 opacity-60"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </CarteLink>
    </header>
  );
}

/*
 * Où l'affiche panoramique remplace celle en hauteur : le bureau, et toute
 * fenêtre ou tablette en paysage d'au moins 640 px (variante poster-wide de
 * globals.css) ; ailleurs — téléphone, fenêtre ou tablette en portrait —
 * l'affiche en hauteur, bord à bord elle aussi.
 */
const WIDE_MEDIA = "(min-width: 64rem), (min-width: 40rem) and (orientation: landscape)";
const NARROW_MEDIA = "(max-width: 39.99rem), (max-width: 63.99rem) and (orientation: portrait)";

/*
 * Largeur affichée du panorama : dans un cadre haut d'au plus la moitié de
 * l'écran (voir l'<img> de PosterHero), il déborde de ses bords de ratio × 50vw.
 */
const wideSizes = (wide: { width: number; height: number }) =>
  `${Math.ceil((50 * wide.width) / wide.height)}vw`;

/**
 * Ce que le premier écran d'un établissement réclame, demandé dès l'en-tête
 * du document : ses polices (au lieu d'attendre que le texte les réclame) et
 * son affiche — chaque écran la sienne. Appelé aussi par le layout de la
 * carte, qui n'attend pas la base : les préchargements partent avec les
 * premiers octets (React ne les envoie qu'une fois).
 */
export function preloadBrandAssets(restaurant: Pick<Restaurant, "fontFiles" | "poster">) {
  for (const href of restaurant.fontFiles ?? []) {
    preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }
  const poster = restaurant.poster;
  if (!poster) return;
  const wide = poster.wide;
  preload(poster.src, {
    as: "image",
    fetchPriority: "high",
    media: wide ? NARROW_MEDIA : undefined,
  });
  if (wide) {
    preload(wide.src, {
      as: "image",
      fetchPriority: "high",
      media: WIDE_MEDIA,
      imageSrcSet: wide.srcSet,
      imageSizes: wideSizes(wide),
    });
  }
}


/**
 * L'affiche tient lieu de hero, toujours d'un bord à l'autre de l'écran. En
 * portrait (téléphone, fenêtre étroite, tablette), l'affiche en hauteur,
 * fondue dans la page, jamais plus haute que l'écran ; en paysage et en
 * bureau, sa version panoramique (poster.wide) — en hauteur, elle n'y
 * occupait qu'une colonne. Ce qui l'accompagne — les offres, sinon l'adresse
 * et le téléphone — vient dessous, à toute largeur. Sans panorama, l'affiche
 * se centre dès la tablette.
 */
function PosterHero({
  restaurant,
  poster,
  banner,
}: {
  restaurant: Restaurant;
  poster: NonNullable<Restaurant["poster"]>;
  banner?: React.ReactNode;
}) {
  const wide = poster.wide;
  return (
    <header className="poster-hero relative w-full overflow-hidden bg-background">
      <div className="relative mx-auto flex flex-col items-center">
        {/* Sous l'image, sa miniature floue (poster.placeholder) : le cadre
            n'est pas vide pendant qu'elle arrive. Cadrée comme l'image (par
            le bas), celle du panorama là où il s'affiche. */}
        <div
          className={`poster-frame hero-entrance relative w-full bg-cover bg-bottom bg-[image:var(--poster-lqip)] ${
            wide
              ? "poster-wide:bg-[image:var(--poster-lqip-wide)]"
              : "md:mt-10 md:w-auto"
          }`}
          style={
            {
              "--poster-lqip": poster.placeholder ? `url(${poster.placeholder})` : "none",
              "--poster-lqip-wide": wide?.placeholder ? `url(${wide.placeholder})` : "none",
            } as React.CSSProperties
          }
        >
          <picture>
            {wide && (
              <source
                media={WIDE_MEDIA}
                srcSet={wide.srcSet}
                sizes={wideSizes(wide)}
                width={wide.width}
                height={wide.height}
              />
            )}
            <img
              src={poster.src}
              alt={poster.alt}
              width={poster.width}
              height={poster.height}
              fetchPriority="high"
              // En portrait, jamais plus haute que l'écran (une tablette la
              // montrait sur 1 100 px) : rognée alors par le haut. Le panorama :
              // la hauteur de l'écran, sans dépasser la moitié de sa largeur —
              // la suite de la page reste en vue ; rogné sur ses bords, et par
              // le haut sur un écran très large, jamais par le bas où sont les
              // textes et le petit logo.
              className={`block h-auto w-full object-cover object-bottom ${
                wide
                  ? "max-h-svh poster-wide:h-[min(86svh,50vw)] poster-wide:max-h-none"
                  : "md:h-[76svh] md:w-auto"
              }`}
            />
          </picture>
          <h1 className="sr-only font-display">{restaurant.name}</h1>
          {/* Le bas de l'image se fond dans la page : bord à bord, un trait
              net la coupait. En bureau, un fondu court, sous les textes. */}
          <div
            className={`absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-background via-background/60 to-transparent ${
              wide ? "poster-wide:h-[9%] poster-wide:via-background/25" : "md:hidden"
            }`}
          />
          {/* Au téléphone, l'affiche remplit le premier écran — et le
              week-end, les offres suivent : plus d'un écran et demi avant la
              carte. De quoi y aller droit, sans deviner qu'elle est dessous.
              Dans le coin, sur le fondu : le motif kilim du bas de l'affiche
              reste dégagé au centre. */}
          <CarteLink
            className={`poster-cue absolute bottom-1 right-2 flex min-h-11 items-center gap-2 px-3 text-xs font-semibold uppercase tracking-[0.24em] text-foreground ${
              wide ? "poster-wide:hidden" : "md:hidden"
            }`}
          >
            La carte <ArrowDown />
          </CarteLink>
        </div>

        <div className="poster-aside w-full min-w-0">
          {banner}
          {/* Les offres prennent la place de l'adresse et du téléphone : le
              pied de page les porte déjà. */}
          <ContactPills
            restaurant={restaurant}
            className={`hero-entrance flex flex-wrap justify-center gap-2 px-5 py-6 text-xs text-muted lg:gap-3 lg:text-sm ${
              banner ? "hidden" : ""
            }`}
            style={{ animationDelay: "350ms" }}
          />
        </div>
      </div>
    </header>
  );
}

/**
 * `banner` (les formules en visuel) suit l'affiche, à la place de l'adresse
 * et du téléphone (le pied de page les porte déjà).
 */
export function Hero({
  restaurant,
  banner,
}: {
  restaurant: Restaurant;
  banner?: React.ReactNode;
}) {
  preloadBrandAssets(restaurant);
  if (restaurant.poster) {
    return (
      <PosterHero restaurant={restaurant} poster={restaurant.poster} banner={banner} />
    );
  }

  if (!restaurant.coverImage) {
    return <LogoHero restaurant={restaurant} />;
  }

  return (
    <header className="cover-hero relative h-[46svh] min-h-80 w-full overflow-hidden lg:h-[52svh] lg:min-h-96">
      {/* eslint-disable-next-line @next/next/no-img-element -- URL saisie par l'utilisateur, hors remotePatterns de next/image */}
      <img
        src={restaurant.coverImage}
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-linear-to-b from-background/40 via-background/55 to-background" />

      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-2xl px-5 pb-6 lg:max-w-5xl lg:px-10 lg:pb-10">
        {restaurant.logo && (
          // eslint-disable-next-line @next/next/no-img-element -- actif local de marque, dimensions libres
          <img
            src={restaurant.logo}
            alt=""
            className="mb-3 size-14 lg:mb-4 lg:size-16"
          />
        )}
        <p className="ember-text text-[11px] font-semibold uppercase tracking-[0.28em] lg:text-xs lg:tracking-[0.35em]">
          {restaurant.tagline}
        </p>
        <h1 className="mt-2 font-display text-5xl font-medium leading-none tracking-tight sm:text-6xl lg:text-7xl">
          {restaurant.name}
        </h1>

        <ContactPills
          restaurant={restaurant}
          className="mt-4 flex flex-wrap gap-2 text-xs text-muted lg:mt-6 lg:gap-3 lg:text-sm"
        />
      </div>
    </header>
  );
}
