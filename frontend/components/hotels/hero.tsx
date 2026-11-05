import type { CSSProperties } from "react";
import { demoCta, hero, mock } from "@/lib/hotels-landing-data";
import { Check, LiveDot, Photo, Ring } from "./ui";

/*
 * Hero d'Ominin Hôtels : la piscine au coucher du soleil en plein cadre,
 * jusque sous la barre ; le titre à gauche, à droite l'écran d'accueil de la
 * chambre 214 en verre sur la photo, la note de chambre et l'appel serveur
 * posés dessus.
 */

function RoomScreen() {
  const { phone, folio, waiter } = hero;
  return (
    <div className="relative mx-auto w-full max-w-[20rem] lg:max-w-none" aria-hidden>
      <div className="g-glass kit-phone p-g-pad">
        <div className="g-plate flex flex-col px-4 pb-5 pt-3">
          <div className="mx-auto mb-4 h-5 w-20 rounded-full bg-black/30" />
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            <span>{mock.hotel}</span>
            <LiveDot />
          </div>
          <p className="kit-display mt-3 text-[1.75rem]">{phone.title}</p>
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {phone.tiles.map((tile, i) => (
              <li
                key={tile.label}
                className="hotels-tile rounded-2xl bg-white/[0.07] px-3 py-2.5 ring-1 ring-white/10"
                style={{ "--tile-i": i } as CSSProperties}
              >
                <p className="text-[11px] font-semibold text-muted">{tile.label}</p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <p className="text-base font-bold tabular-nums">{tile.value}</p>
                  {tile.share !== undefined && <Ring share={tile.share} className="size-5 [--ring-w:3px]" />}
                </div>
                <p className="truncate text-[11px] text-faint">{tile.hint}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        className="hotels-float absolute -bottom-10 -left-3 z-10 w-[62%] sm:-left-10 xl:-left-14"
        style={{ "--float-tilt": "-2deg" } as CSSProperties}
      >
        <div className="g-glass p-g-pad">
          <div className="g-plate px-3.5 py-3">
            <p className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.14em] text-muted sm:tracking-[0.2em]">{folio.label}</p>
            <p className="kit-display ember-text mt-1 text-3xl tabular-nums">{folio.value}</p>
            <p className="mt-0.5 text-[11px] text-muted">{folio.detail}</p>
          </div>
        </div>
      </div>

      <div
        className="hotels-float absolute -right-2 -top-5 z-10 sm:-right-10 lg:-right-4 xl:-right-10"
        style={{ "--float-tilt": "1.5deg", "--float-delay": "-3s" } as CSSProperties}
      >
        <p className="g-glass g-glass-pill flex items-center gap-2 py-2.5 pl-2.5 pr-4 text-sm font-semibold">
          <Check />
          {waiter}
        </p>
      </div>
    </div>
  );
}

export function HotelsHero() {
  return (
    <section className="hotels-night relative">
      {/* Remonte sous la barre de verre : la photo commence en haut de page. */}
      <div className="hotels-fade-b absolute inset-x-0 -top-40 bottom-0 -z-10 overflow-hidden" aria-hidden>
        <Photo name="hero" sizes="100vw" priority className="object-cover object-[62%_50%]" />
        <div className="hotels-scrim-hero absolute inset-0" />
      </div>
      <div className="mx-auto grid w-full max-w-6xl gap-16 px-4 pb-24 pt-16 sm:px-6 lg:min-h-[calc(100svh-6rem)] lg:grid-cols-[1fr_minmax(0,22rem)] lg:items-center lg:gap-20 lg:px-10 lg:pb-32 lg:pt-20">
        <div>
          <p className="kit-rise text-[11px] font-semibold uppercase tracking-[0.32em] text-ember-1">{hero.eyebrow}</p>
          <h1 className="kit-display mt-6 text-[3.25rem] sm:text-7xl lg:text-[4.75rem] xl:text-[6rem]">
            {hero.lines.map((line, i) => (
              <span key={line} className="kit-rise block" style={{ "--rise-delay": `${i * 90}ms` } as CSSProperties}>
                {line}
              </span>
            ))}
            <span className="kit-rise block" style={{ "--rise-delay": `${hero.lines.length * 90}ms` } as CSSProperties}>
              {hero.last.start}
              <span className="kit-mark">{hero.last.mark}</span>
            </span>
          </h1>
          <p className="kit-rise mt-8 max-w-xl text-pretty text-base leading-relaxed text-foreground/80 lg:text-lg" style={{ "--rise-delay": "320ms" } as CSSProperties}>
            {hero.subtitle}
          </p>
          <div className="kit-rise mt-10 flex flex-col gap-3 sm:flex-row" style={{ "--rise-delay": "400ms" } as CSSProperties}>
            <a href={demoCta.href} className="ember-gradient rounded-full px-7 py-3.5 text-center text-sm font-bold text-background transition-transform hover:scale-[1.03] lg:text-base">
              {demoCta.label}
            </a>
            <a href={hero.secondaryCta.href} className="g-glass g-glass-pill px-7 py-3.5 text-center text-sm font-semibold lg:text-base">
              {hero.secondaryCta.label}
            </a>
          </div>
          <ul className="kit-rise mt-9 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-foreground/70" style={{ "--rise-delay": "480ms" } as CSSProperties}>
            {hero.trustline.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span aria-hidden className="h-px w-4 bg-ember-1" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="kit-rise" style={{ "--rise-delay": "240ms" } as CSSProperties}>
          <RoomScreen />
        </div>
      </div>
    </section>
  );
}
