"use client";

import { KitHeading } from "@/components/landing-kit/heading";
import { Reveal } from "@/components/landing-kit/reveal";
import { useLanguage } from "@/lib/portal/language";
import { approach } from "@/lib/portal-data";

/*
 * Trois engagements numérotés, en cartes du kit : la seule section du
 * portail qui parle de la maison — sobre à dessein.
 */
export function PortalApproach() {
  const { t } = useLanguage();

  return (
    <section className="mb-16 border-y border-hairline bg-surface/40 sm:mb-24">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10 lg:py-28">
        <KitHeading eyebrow={t(approach.eyebrow)} title={t(approach.title)} />
        <ol className="mt-14 grid gap-4 sm:grid-cols-3">
          {approach.points.map((point, index) => (
            <Reveal
              key={point.title.fr}
              as="li"
              delay={index * 110}
              className="kit-card relative overflow-hidden rounded-3xl border border-hairline bg-surface p-7"
            >
              <div aria-hidden className="absolute -right-16 -top-16 size-48 rounded-full bg-ember-2/15 blur-3xl" />
              <span className="kit-display ember-text relative text-5xl" aria-hidden>
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="relative mt-6 text-lg font-bold">{t(point.title)}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-muted">{t(point.body)}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
