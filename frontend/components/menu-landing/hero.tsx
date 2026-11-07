import Image from "next/image";
import { PillarIcon } from "@/components/menu-landing/icons";
import { hero, heroFeed, heroScene } from "@/lib/menu-landing-data";

/*
 * Hero de la landing Menu, sur la scène du portail (portal.css) : le message
 * centré, puis un éventail des écrans du Caffè Panis qui dépassent d'un cadre
 * de verre, et sur ses bords des notifications qui se relaient — un exemple
 * par pilier. Les trois chiffres s'amarrent au bas de la scène.
 */

const DESKTOP_SLOTS = 2;
const CENTER = Math.floor(heroScene.length / 2);

type FeedItem = (typeof heroFeed.items)[number];

function Toast({ item }: { item: FeedItem }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface-raised p-3 shadow-[0_18px_40px_-20px_var(--g-drop)]">
      <span className="ember-gradient flex size-9 shrink-0 items-center justify-center rounded-xl text-background">
        <PillarIcon id={item.pillar} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold uppercase tracking-[0.15em] text-ember-1">{item.label}</span>
        <span className="block text-sm font-semibold leading-snug">{item.text}</span>
      </span>
    </div>
  );
}

function Toasts({ slots, className }: { slots: number; className: string }) {
  const groups = Array.from({ length: slots }, (_, slot) => heroFeed.items.filter((_, i) => i % slots === slot));
  const rhythm = slots === 1 ? "portal-toast portal-toast-sixths" : "portal-toast";
  return (
    <ul className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden>
      {groups.map((items, slot) => (
        <li key={slot} className="portal-toast-slot" style={{ "--slot": slot, "--slots": slots } as React.CSSProperties}>
          {items.map((item, k) => (
            <div key={item.text} className={rhythm} style={{ "--k": k, "--n": items.length } as React.CSSProperties}>
              <Toast item={item} />
            </div>
          ))}
        </li>
      ))}
    </ul>
  );
}

function Scene() {
  return (
    <figure
      className="kit-rise portal-scene g-glass g-glass-hero mt-8 p-g-pad lg:mt-10"
      style={{ "--rise-delay": "740ms", "--portal-phones": heroScene.length } as React.CSSProperties}
    >
      <div className="g-plate portal-scene-plate relative">
        <div className="portal-scene-glow" aria-hidden />
        <div className="portal-scene-strip" aria-hidden>
          {heroScene.map((shot, i) => (
            <div
              key={shot.src}
              className={i === CENTER ? "portal-scene-phone portal-scene-center" : "portal-scene-phone"}
              style={{ "--i": i, "--s": i - CENTER, "--d": Math.abs(i - CENTER) } as React.CSSProperties}
            >
              <Image
                src={shot.src}
                alt=""
                fill
                sizes="(max-width: 640px) 44vw, 22vw"
                className="object-cover object-top"
                priority={i === CENTER}
              />
            </div>
          ))}
        </div>
        <Toasts slots={1} className="sm:hidden" />
        <Toasts slots={DESKTOP_SLOTS} className="hidden sm:block" />
      </div>
      <figcaption className="sr-only">
        {heroScene.map((shot) => shot.alt).join(", ")}. {heroFeed.caption}
      </figcaption>
    </figure>
  );
}

export function MenuHero() {
  return (
    <header className="relative overflow-hidden">
      <div className="kit-grid absolute inset-0" aria-hidden />
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pt-14 lg:px-10 lg:pb-16 lg:pt-14">
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
          <h1 className="kit-display text-balance text-[clamp(2.4rem,10vw,4.6rem)] lg:text-[clamp(3.2rem,5vw,5.2rem)]">
            <span className="kit-rise mb-5 flex items-center justify-center gap-2 text-[11px] font-semibold uppercase leading-snug tracking-[0.2em] text-ember-1 sm:tracking-[0.3em]">
              <span aria-hidden className="ember-gradient size-1.5 rounded-full" />
              {hero.kicker}
            </span>
            {hero.lines.map((line, i) => (
              <span
                key={line.text}
                className="kit-rise block sm:whitespace-nowrap"
                style={{ "--rise-delay": `${80 + i * 120}ms` } as React.CSSProperties}
              >
                {"mark" in line ? <span className="kit-mark">{line.text}</span> : line.text}
              </span>
            ))}
          </h1>
          <p
            className="kit-rise mt-6 max-w-2xl text-pretty text-base leading-relaxed text-foreground/80 lg:text-lg"
            style={{ "--rise-delay": "460ms" } as React.CSSProperties}
          >
            {hero.body}
          </p>

          <div className="kit-rise mt-7 flex flex-wrap justify-center gap-3" style={{ "--rise-delay": "580ms" } as React.CSSProperties}>
            <a
              href={hero.primaryCta.href}
              className="ember-gradient rounded-full px-7 py-3.5 text-sm font-bold text-background shadow-[0_12px_40px_-12px_var(--ember-2)] transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1 lg:text-base"
            >
              {hero.primaryCta.label}
            </a>
            <a
              href={hero.secondaryCta.href}
              className="g-glass g-glass-pill g-press group flex items-center gap-2 px-6 py-3.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1 lg:text-base"
            >
              {hero.secondaryCta.label}
              <span aria-hidden className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </a>
          </div>
        </div>

        <Scene />

        <dl
          className="kit-rise g-glass g-glass-pill relative z-10 mx-auto -mt-6 grid w-fit max-w-full grid-cols-3 divide-x divide-hairline px-1 py-2 sm:px-4"
          style={{ "--rise-delay": "900ms" } as React.CSSProperties}
        >
          {hero.stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col-reverse items-center gap-1 px-2.5 text-center sm:flex-row-reverse sm:items-baseline sm:gap-2.5 sm:px-6 sm:text-left"
            >
              <dt className="text-xs leading-snug text-muted sm:text-sm">{stat.label}</dt>
              <dd className="kit-display ember-text whitespace-nowrap text-xl sm:text-2xl">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}
