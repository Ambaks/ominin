import { Fragment } from "react";
import { PhoneIcon, PinIcon } from "@/components/menu/contact-icons";
import { heroDelay } from "@/components/menu/hero-delay";
import { keepHyphenated } from "@/components/menu/keep-hyphenated";
import { NameWords } from "@/components/menu/name-words";
import { SaisonFrame, SaisonPoster, SaisonSky } from "@/components/menu/saison/saison";
import { SectionLink } from "@/components/menu/section-link";
import type { Saison } from "@/lib/menu/saison";
import {
  brandName,
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
  "inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline bg-surface/70 px-4 py-2.5 backdrop-blur";

/* L'icône d'une pastille, cachée sauf là où un thème la montre
   (.hero-contact-icon, globals.css) : sans elle, la pastille se lisait comme
   une étiquette, pas comme un lien. */
const PILL_ICON_CLASS = "hero-contact-icon hidden size-4 shrink-0";

/**
 * L'adresse en deux blocs, la rue puis le code postal et la ville : la ligne
 * se coupe entre eux, pas après « des » ni dans « Portet-sur-Garonne ». Une
 * seule enveloppe — dans la pastille (flex), chaque bloc devenait sinon sa
 * propre colonne.
 */
function AddressLines({ address }: { address: string }) {
  const text = displayAddress(address);
  const cut = text.lastIndexOf(", ");
  if (cut < 0) return <span>{keepHyphenated(text)}</span>;
  return (
    <span>
      <span className="address-line inline-block max-w-full">{keepHyphenated(text.slice(0, cut + 1))}</span>{" "}
      <span className="address-line inline-block max-w-full">{keepHyphenated(text.slice(cut + 2))}</span>
    </span>
  );
}

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
          href={mapsUrl(text, restaurant.placeId)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${PILL_CLASS} transition-colors hover:text-foreground`}
        >
          <PinIcon className={PILL_ICON_CLASS} />
          <AddressLines address={text} />
        </a>
      ))}
      {phone && (
        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          className={`${PILL_CLASS} transition-colors hover:text-foreground`}
        >
          <PhoneIcon className={PILL_ICON_CLASS} />
          {displayPhone(phone)}
        </a>
      )}
    </div>
  );
}

/**
 * L'accroche en segments (« Bar Restaurant · Tapas Cocktail ») : chacun d'un
 * tenant, son séparateur collé au segment qui le précède — une ligne ne
 * commence jamais par « · ». Le séparateur a son <span> (.tagline-sep) : un
 * thème peut le cacher et habiller les segments.
 */
function Tagline({ text }: { text: string }) {
  const segments = text.split(/(?<= [·—–]) /);
  if (segments.length === 1) return text;
  return segments.map((segment, i) => {
    const sep = /^(.*) ([·—–])$/.exec(segment);
    return (
      <Fragment key={i}>
        {i > 0 && " "}
        <span className="whitespace-nowrap">
          {sep ? (
            <>
              {`${sep[1]} `}
              <span className="tagline-sep" aria-hidden>
                {sep[2]}
              </span>
            </>
          ) : (
            segment
          )}
        </span>
      </Fragment>
    );
  });
}

function LogoHero({
  restaurant,
  firstSectionId,
}: {
  restaurant: Restaurant;
  firstSectionId: string | undefined;
}) {
  // Un mot-symbole est le titre : lu en premier, avant l'accroche.
  const nameInLogo = Boolean(restaurant.logo && restaurant.logoIsName);
  const logo = restaurant.logo && (
    // eslint-disable-next-line @next/next/no-img-element -- actif local de marque, dimensions libres
    <img
      src={restaurant.logo}
      alt={nameInLogo ? brandName(restaurant) : ""}
      className={`relative h-28 w-auto sm:h-32 lg:h-40 xl:h-44 ${restaurant.whiteLogo ? "logo-white" : ""}`}
    />
  );
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
          {nameInLogo ? <h1 className="relative">{logo}</h1> : logo}
        </div>
      )}

      {/* Accroche, nom et filet : sans effet par défaut (display: contents),
          une enveloppe pour qu'un thème les compose comme une enseigne —
          le nom sur une ligne, l'accroche au bout du filet. */}
      <div className="hero-lockup contents">
        <p
          className="hero-tagline hero-entrance ember-text relative z-10 text-[11px] font-semibold uppercase tracking-[0.35em] lg:text-xs lg:tracking-[0.4em]"
          style={heroDelay("200ms")}
        >
          <Tagline text={restaurant.tagline} />
        </p>

        {!nameInLogo && (
          <h1
            className="hero-name hero-entrance relative z-10 mt-3 px-5 text-center font-display text-6xl font-medium leading-none tracking-tight max-[359px]:text-5xl sm:text-7xl lg:mt-5 lg:text-8xl xl:text-9xl"
            style={heroDelay("350ms")}
          >
            <NameWords name={brandName(restaurant)} />
          </h1>
        )}

        <div
          className="hero-rule hero-entrance ember-gradient relative z-10 mt-6 h-px w-20 opacity-50 lg:mt-8 lg:w-28"
          aria-hidden
          style={heroDelay("500ms")}
        />
      </div>

      <ContactPills
        restaurant={restaurant}
        className="hero-contact hero-entrance relative z-10 mt-6 flex flex-wrap justify-center gap-2 px-5 text-xs text-muted lg:mt-8 lg:gap-3 lg:text-sm"
        style={heroDelay("650ms")}
      />

      <SectionLink
        sectionId={firstSectionId ?? ""}
        className="hero-cue hero-entrance absolute bottom-8 z-10 flex min-h-11 flex-col items-center justify-center gap-2 px-4 text-muted transition-colors hover:text-foreground lg:bottom-12"
        style={heroDelay("1100ms")}
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
      </SectionLink>
    </header>
  );
}

/* La variante poster-wide de globals.css. */
const POSTER_WIDE_MEDIA = "(min-width: 64rem), (min-width: 40rem) and (orientation: landscape)";

/**
 * L'affiche remplit l'écran (moins les formules, s'il y en a). En portrait,
 * elle couvre toute la largeur et reste entière en hauteur : sur un écran
 * trop court pour elle, l'en-tête s'allonge et les formules passent sous la
 * ligne de flottaison plutôt que de rogner son texte. En paysage, entière,
 * sa copie floutée comblant les marges — sauf si l'établissement a son
 * panorama (posterWide), qui couvre alors tout le cadre.
 */
function PosterHero({
  restaurant,
  poster,
  banner,
  saison,
}: {
  restaurant: Restaurant;
  poster: NonNullable<Restaurant["poster"]>;
  banner?: React.ReactNode;
  saison?: Saison;
}) {
  const wide = restaurant.posterWide;
  const spots = restaurant.saisonSpots;
  // Les repères sont mesurés sur l'affiche portrait : le panorama n'a que le
  // décor du cadre.
  const portraitOnly = wide ? "contents poster-wide:hidden" : "contents";
  return (
    <header
      className="grid min-h-svh w-full grid-cols-1 grid-rows-[1fr_auto] bg-background poster-wide:h-svh"
      style={{ "--poster-w": poster.width, "--poster-h": poster.height } as React.CSSProperties}
    >
      {/* contain:size : la taille du cadre vient de la grille et de sa hauteur
          minimale, jamais de l'affiche qu'il contient. isolate : les calques
          de saison restent dans le cadre, sous les pastilles flottantes. */}
      <div className="relative isolate flex min-h-[calc(100vw*var(--poster-h)/var(--poster-w))] justify-center overflow-hidden [contain:size] poster-wide:min-h-0">
        {!wide && (
          // eslint-disable-next-line @next/next/no-img-element -- actif local de marque, dimensions libres
          <img
            src={poster.src}
            alt=""
            className="absolute inset-0 hidden size-full scale-110 object-cover opacity-60 blur-2xl poster-wide:block"
          />
        )}
        {/* La nuit et les lumières de la saison suivent les repères de l'affiche :
            sans eux, seul le décor du cadre. */}
        {saison && spots && (
          <div className={portraitOnly}>
            <SaisonSky saison={saison} />
          </div>
        )}
        {/* L'habillage de saison se pose en % de l'affiche : il la suit à sa taille. */}
        <div className={`relative h-full shrink-0 ${wide ? "poster-wide:w-full" : ""}`}>
          <picture className="contents">
            {wide && <source media={POSTER_WIDE_MEDIA} srcSet={wide} sizes="100vw" />}
            <img
              src={poster.src}
              alt=""
              width={poster.width}
              height={poster.height}
              fetchPriority="high"
              className={`hero-entrance relative h-full w-auto max-w-none ${
                wide
                  ? "poster-wide:w-full poster-wide:object-cover"
                  : "poster-wide:[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
              }`}
            />
          </picture>
          {saison && spots && (
            <div className={portraitOnly}>
              <SaisonPoster saison={saison} spots={spots} />
            </div>
          )}
        </div>
        <h1 className="sr-only">{brandName(restaurant)}</h1>
        {saison && <SaisonFrame saison={saison} />}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-background to-transparent" />
      </div>

      {banner}
    </header>
  );
}

/**
 * `banner` : les formules en visuel, sous l'affiche. L'adresse et le
 * téléphone n'y figurent pas : le pied de page les porte déjà.
 * `firstSectionId` : la première section de la page, que vise « Découvrir la
 * carte » — les formules quand elles ouvrent la carte, sinon la première
 * catégorie.
 */
export function Hero({
  restaurant,
  banner,
  firstSectionId,
  saison,
}: {
  restaurant: Restaurant;
  banner?: React.ReactNode;
  firstSectionId: string | undefined;
  saison?: Saison;
}) {
  if (restaurant.poster) {
    return (
      <PosterHero restaurant={restaurant} poster={restaurant.poster} banner={banner} saison={saison} />
    );
  }

  if (!restaurant.coverImage) {
    return <LogoHero restaurant={restaurant} firstSectionId={firstSectionId} />;
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
          <Tagline text={restaurant.tagline} />
        </p>
        <h1 className="mt-2 font-display text-5xl font-medium leading-none tracking-tight sm:text-6xl lg:text-7xl">
          {brandName(restaurant)}
        </h1>

        <ContactPills
          restaurant={restaurant}
          className="mt-4 flex flex-wrap gap-2 text-xs text-muted lg:mt-6 lg:gap-3 lg:text-sm"
        />
      </div>
    </header>
  );
}
