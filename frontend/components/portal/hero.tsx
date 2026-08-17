"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/portal/language";
import { hero } from "@/lib/portal-data";

/*
 * Étincelles du héro : quelques braises montent lentement de la lueur
 * inférieure et s'éteignent (trajet dans globals.css, .ember-particle).
 * Valeurs volontairement irrégulières — des délais et durées désynchronisés
 * pour que le cycle ne se voie jamais. Purement décoratif : aria-hidden, et
 * masqué en mouvement réduit.
 */
const PARTICLES = [
  { left: "12%", size: 3, color: "var(--ember-1)", duration: "13s", delay: "0s", peak: 0.45 },
  { left: "28%", size: 2, color: "var(--ember-2)", duration: "17s", delay: "4s", peak: 0.35 },
  { left: "47%", size: 4, color: "var(--ember-2)", duration: "11s", delay: "7s", peak: 0.5 },
  { left: "63%", size: 2, color: "var(--ember-3)", duration: "15s", delay: "2s", peak: 0.3 },
  { left: "81%", size: 3, color: "var(--ember-1)", duration: "19s", delay: "9s", peak: 0.4 },
];

/*
 * Hero du portail. La lueur braise est retournée (elle monte du bas au lieu
 * de tomber du haut) : la chaleur vient des produits posés juste en dessous,
 * le titre est éclairé par eux. Typo éditoriale — Fraunces en très grand
 * corps, interlignage serré — deux appels, puis une ligne d'état factuelle.
 */
export function PortalHero() {
  const { t } = useLanguage();

  return (
    <header className="relative overflow-hidden">
      <div
        className="ember-glow pointer-events-none absolute inset-x-0 bottom-0 h-3/4 rotate-180"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
        aria-hidden
      >
        {PARTICLES.map((p) => (
          <span
            key={p.left}
            className="ember-particle"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              background: p.color,
              animationDelay: p.delay,
              ["--particle-duration" as string]: p.duration,
              ["--particle-peak" as string]: p.peak,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto w-full max-w-2xl px-5 pt-20 pb-16 lg:max-w-6xl lg:px-10 lg:pt-32 lg:pb-24">
        <p className="rise text-[11px] font-semibold uppercase tracking-[0.28em] text-ember-2 lg:text-xs lg:tracking-[0.35em]">
          {t(hero.eyebrow)}
        </p>

        <h1 className="rise mt-7 max-w-4xl font-display text-[2.6rem] leading-[1.04] font-medium tracking-tight text-balance sm:text-6xl lg:text-7xl [animation-delay:60ms]">
          {t(hero.titleLead)}{" "}
          <span className="ember-text">{t(hero.titleAccent)}</span>
        </h1>

        <p className="rise mt-8 max-w-xl text-base leading-relaxed text-muted lg:text-lg [animation-delay:120ms]">
          {t(hero.body)}
        </p>

        <div className="rise mt-10 flex flex-wrap items-center gap-3 sm:gap-4 [animation-delay:180ms]">
          <a
            href={hero.primaryCta.href}
            className="ember-gradient rounded-full px-6 py-3 text-sm font-semibold text-background lg:px-7 lg:py-3.5"
          >
            {t(hero.primaryCta.label)}
          </a>
          <Link
            href={hero.secondaryCta.href}
            className="rounded-full border border-hairline px-6 py-3 text-sm font-medium text-muted transition-colors hover:border-ember-2/40 hover:text-foreground lg:px-7 lg:py-3.5"
          >
            {t(hero.secondaryCta.label)}
          </Link>
        </div>

        <p className="rise mt-9 flex items-center gap-2.5 text-xs text-faint [animation-delay:240ms]">
          <span
            className="size-1.5 rounded-full bg-ember-2 animate-pulse motion-reduce:animate-none"
            aria-hidden
          />
          {t(hero.meta)}
        </p>
      </div>
    </header>
  );
}
