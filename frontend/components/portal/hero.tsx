"use client";

import { useLanguage } from "@/lib/portal/language";
import { hero } from "@/lib/portal-data";

/*
 * Hero du portail. La lueur braise est retournée (elle monte du bas au lieu de
 * tomber du haut) : la chaleur vient des produits posés juste en dessous, le
 * titre est éclairé par eux.
 */
export function PortalHero() {
  const { t } = useLanguage();

  return (
    <header className="relative overflow-hidden">
      <div
        className="ember-glow pointer-events-none absolute inset-x-0 bottom-0 h-3/4 rotate-180"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-2xl px-5 pt-20 pb-16 lg:max-w-5xl lg:px-10 lg:pt-32 lg:pb-24">
        <p className="rise text-xs font-semibold uppercase tracking-[0.2em] text-ember-2">
          {t(hero.eyebrow)}
        </p>

        <h1 className="rise mt-6 max-w-3xl font-display text-4xl leading-[1.08] font-semibold text-balance sm:text-5xl lg:text-6xl [animation-delay:60ms]">
          {t(hero.titleLead)}{" "}
          <span className="ember-text">{t(hero.titleAccent)}</span>
        </h1>

        <p className="rise mt-7 max-w-xl text-base leading-relaxed text-muted lg:text-lg [animation-delay:120ms]">
          {t(hero.body)}
        </p>
      </div>
    </header>
  );
}
