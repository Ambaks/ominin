"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/portal/language";
import { hero, heroFeed } from "@/lib/portal-data";

/*
 * Hero du portail, sur le kit des landings produit : titre en lignes qui
 * montent, pavé braise sur « par l'IA. », la rangée des chiffres, et à
 * droite le fil de ce qui se passe chez nos clients — un événement par
 * produit, qui tombe carte après carte (relais du kit, boucle de 10 s).
 */

function Feed() {
  const { t } = useLanguage();
  return (
    <div className="kit-relay relative mx-auto w-full min-w-0 max-w-md lg:max-w-none" aria-hidden>
      <div
        className="relay-float rounded-[2rem] border border-hairline bg-surface/80 p-4 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-5"
        style={{ "--float-tilt": "-1deg" } as React.CSSProperties}
      >
        <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">
          {t(heroFeed.label)}
          <span className="size-1.5 animate-pulse rounded-full bg-ember-1 motion-reduce:animate-none" />
        </p>
        <ul className="mt-4 flex flex-col gap-2.5">
          {heroFeed.items.map((item, i) => (
            <li
              key={item.product}
              className="relay-line flex items-center gap-3 rounded-2xl border border-hairline bg-background/70 p-3"
              style={{ "--line-delay": `${i * 0.45}s` } as React.CSSProperties}
            >
              <span className="ember-gradient kit-display flex size-10 shrink-0 items-center justify-center rounded-xl text-base text-background">
                {item.product[0]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold uppercase tracking-[0.15em] text-ember-1">Ominin {item.product}</span>
                <span className="block text-sm font-semibold leading-snug">{t(item.text)}</span>
              </span>
              <span className="shrink-0 self-start text-[11px] text-faint">{t(item.time)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function PortalHero() {
  const { t } = useLanguage();

  return (
    <header className="relative overflow-hidden">
      <div className="kit-grid absolute inset-0" aria-hidden />
      <div className="kit-aura absolute inset-0 opacity-50 lg:opacity-100" aria-hidden />
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-12 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:px-10 lg:pb-24 lg:pt-20">
        <div className="min-w-0">
          <p className="kit-rise flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-ember-1">
            <span aria-hidden className="ember-gradient size-1.5 rounded-full" />
            {t(hero.eyebrow)}
          </p>
          <h1 className="kit-display mt-6 text-[clamp(2.6rem,11.5vw,5rem)] lg:text-[clamp(3.4rem,5.6vw,5.6rem)]">
            {hero.lines.map((line, i) => (
              <span
                key={line.text.fr}
                className="kit-rise block sm:whitespace-nowrap"
                style={{ "--rise-delay": `${120 + i * 120}ms` } as React.CSSProperties}
              >
                {"mark" in line ? <span className="kit-mark">{t(line.text)}</span> : t(line.text)}
              </span>
            ))}
          </h1>
          <p
            className="kit-rise mt-7 max-w-xl text-pretty text-base leading-relaxed text-muted lg:text-lg"
            style={{ "--rise-delay": "620ms" } as React.CSSProperties}
          >
            {t(hero.body)}
          </p>

          <dl
            className="kit-rise mt-7 grid grid-cols-3 gap-4 border-t border-hairline pt-6"
            style={{ "--rise-delay": "740ms" } as React.CSSProperties}
          >
            {hero.stats.map((stat) => (
              <div key={stat.label.fr}>
                <dt className="sr-only">{t(stat.label)}</dt>
                <dd className="kit-display ember-text whitespace-nowrap text-3xl sm:text-4xl">{stat.value}</dd>
                <dd className="mt-1.5 text-xs leading-snug text-muted sm:text-sm">{t(stat.label)}</dd>
              </div>
            ))}
          </dl>

          <div
            className="kit-rise mt-7 flex flex-wrap gap-3"
            style={{ "--rise-delay": "860ms" } as React.CSSProperties}
          >
            <a
              href={hero.primaryCta.href}
              className="ember-gradient rounded-full px-7 py-3.5 text-sm font-bold text-background shadow-[0_12px_40px_-12px_var(--ember-2)] transition-transform hover:scale-[1.03] lg:text-base"
            >
              {t(hero.primaryCta.label)}
            </a>
            <Link
              href={hero.secondaryCta.href}
              className="group flex items-center gap-2 rounded-full border border-hairline px-6 py-3.5 text-sm font-semibold transition-colors hover:border-ember-2/50 lg:text-base"
            >
              {t(hero.secondaryCta.label)}
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>

        <Feed />
      </div>
    </header>
  );
}
