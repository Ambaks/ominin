import { Fragment } from "react";
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
    <header className="relative flex min-h-[62svh] w-full flex-col items-center justify-center overflow-hidden pb-24 pt-12 lg:min-h-[72svh] lg:pb-28 lg:pt-16">
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

      <a
        href={`#${restaurant.categories[0]?.id ?? ""}`}
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
      </a>
    </header>
  );
}

/**
 * L'affiche remplit l'écran, moins la bande de contact : rognée sur les côtés
 * en portrait, entière en paysage, où sa copie floutée comble les marges.
 */
function PosterHero({
  restaurant,
  poster,
  banner,
}: {
  restaurant: Restaurant;
  poster: string;
  banner?: React.ReactNode;
}) {
  return (
    <header className="flex h-svh w-full flex-col bg-background">
      <div className="relative flex min-h-0 flex-1 justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- actif local de marque, dimensions libres */}
        <img
          src={poster}
          alt=""
          className="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-2xl"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- actif local de marque, dimensions libres */}
        <img
          src={poster}
          alt=""
          fetchPriority="high"
          className="hero-entrance relative h-full w-auto max-w-none shrink-0 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
        />
        <h1 className="sr-only">{restaurant.name}</h1>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-background to-transparent" />
      </div>

      {banner ?? (
        <ContactPills
          restaurant={restaurant}
          className="hero-entrance flex flex-wrap justify-center gap-2 px-5 py-4 text-xs text-muted lg:gap-3 lg:text-sm"
          style={{ animationDelay: "350ms" }}
        />
      )}
    </header>
  );
}

/**
 * `banner` (les formules en visuel) prend, sous l'affiche, la place de
 * l'adresse et du téléphone : le pied de page les porte déjà.
 */
export function Hero({
  restaurant,
  banner,
}: {
  restaurant: Restaurant;
  banner?: React.ReactNode;
}) {
  if (restaurant.poster) {
    return (
      <PosterHero restaurant={restaurant} poster={restaurant.poster} banner={banner} />
    );
  }

  if (!restaurant.coverImage) {
    return <LogoHero restaurant={restaurant} />;
  }

  return (
    <header className="relative h-[46svh] min-h-80 w-full overflow-hidden lg:h-[52svh] lg:min-h-96">
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
