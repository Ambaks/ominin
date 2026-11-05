import type { CSSProperties } from "react";
import { demoCta, hero, marquee, mock } from "@/lib/hotels-landing-data";
import { Marquee } from "@/components/landing-kit/marquee";

/*
 * Hero d'Ominin Hôtels : le titre monte ligne à ligne, le pavé laiton se
 * pose sur « chambre. » ; à droite, l'écran d'accueil de la chambre 214 —
 * room service, fréquentation en direct, spa, serviettes, taxi — avec la
 * note de chambre et l'appel serveur posés dessus.
 */

function RoomScreen() {
  const { phone, folio, waiter } = hero;
  return (
    <div className="relative mx-auto w-full max-w-[20rem] lg:max-w-none" aria-hidden>
      <div className="g-glass kit-phone p-g-pad">
        <div className="g-plate flex flex-col px-4 pb-5 pt-3">
          <div className="mx-auto mb-4 h-5 w-20 rounded-full bg-surface" />
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">
            <span>{mock.hotel}</span>
            <span className="size-1.5 rounded-full bg-ember-1" />
          </div>
          <p className="kit-display mt-3 text-2xl">{phone.title}</p>
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {phone.tiles.map((tile, i) => (
              <li
                key={tile.label}
                className="hotels-tile rounded-2xl border border-hairline bg-background/60 px-3 py-2.5"
                style={{ "--tile-i": i } as CSSProperties}
              >
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
                  {tile.live && (
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-ember-1 opacity-60 motion-reduce:animate-none" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-ember-1" />
                    </span>
                  )}
                  {tile.label}
                </p>
                <p className="kit-display mt-1.5 text-lg tabular-nums">{tile.value}</p>
                <p className="text-[11px] text-faint">{tile.hint}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        className="hotels-float absolute -left-6 bottom-[3%] z-10 w-[62%] sm:-left-10"
        style={{ "--float-tilt": "-2deg" } as CSSProperties}
      >
        <div className="g-glass p-g-pad">
          <div className="g-plate px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">{folio.label}</p>
            <p className="kit-display ember-text mt-1 text-2xl tabular-nums">{folio.value}</p>
            <p className="mt-0.5 text-[11px] text-muted">{folio.detail}</p>
          </div>
        </div>
      </div>

      <div
        className="hotels-float absolute -right-2 top-[2.5%] z-10 flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-bold text-background shadow-xl sm:-right-6"
        style={{ "--float-tilt": "1.5deg", "--float-delay": "-3s" } as CSSProperties}
      >
        <span className="ember-gradient flex size-5 items-center justify-center rounded-full text-[11px] text-background">✓</span>
        {waiter}
      </div>
    </div>
  );
}

export function HotelsHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="kit-aura absolute inset-0" aria-hidden />
      <div className="relative mx-auto grid w-full max-w-6xl gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1fr_minmax(0,24rem)] lg:items-center lg:gap-16 lg:px-10 lg:pb-28 lg:pt-20">
        <div>
          <p className="kit-rise text-[11px] font-semibold uppercase tracking-[0.3em] text-ember-1">{hero.eyebrow}</p>
          <h1 className="kit-display mt-6 text-5xl sm:text-6xl lg:text-7xl xl:text-[5.25rem]">
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
          <p className="kit-rise mt-7 max-w-xl text-pretty text-base leading-relaxed text-muted lg:text-lg" style={{ "--rise-delay": "320ms" } as CSSProperties}>
            {hero.subtitle}
          </p>
          <div className="kit-rise mt-9 flex flex-col gap-3 sm:flex-row" style={{ "--rise-delay": "400ms" } as CSSProperties}>
            <a href={demoCta.href} className="ember-gradient rounded-full px-7 py-3.5 text-center text-sm font-bold text-background transition-transform hover:scale-[1.03] lg:text-base">
              {demoCta.label}
            </a>
            <a href={hero.secondaryCta.href} className="g-glass g-glass-pill px-7 py-3.5 text-center text-sm font-semibold lg:text-base">
              {hero.secondaryCta.label}
            </a>
          </div>
          <ul className="kit-rise mt-8 flex flex-wrap gap-x-5 gap-y-1.5 text-xs font-semibold text-faint" style={{ "--rise-delay": "480ms" } as CSSProperties}>
            {hero.trustline.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span aria-hidden className="size-1.5 rounded-full bg-ember-2" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="kit-rise pb-6" style={{ "--rise-delay": "240ms" } as CSSProperties}>
          <RoomScreen />
        </div>
      </div>
      <Marquee words={marquee} />
    </section>
  );
}
