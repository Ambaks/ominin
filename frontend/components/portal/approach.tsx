"use client";

import { Reveal } from "@/components/portal/reveal";
import { useLanguage } from "@/lib/portal/language";
import { approach } from "@/lib/portal-data";

/*
 * Trois engagements numérotés, en colonnes éditoriales : filet supérieur,
 * numéro Fraunces en braise, titre, corps. La seule section du portail qui
 * parle de la maison — sobre à dessein.
 */
export function PortalApproach() {
  const { t } = useLanguage();

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-20 lg:max-w-6xl lg:px-10 lg:pb-28">
      <div className="mb-8 flex items-center gap-4 lg:mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-faint">
          {t(approach.eyebrow)}
        </h2>
        <span className="h-px flex-1 bg-hairline" aria-hidden />
      </div>

      <p className="max-w-2xl font-display text-2xl leading-snug font-medium text-balance sm:text-3xl">
        {t(approach.title)}
      </p>

      <ol className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-3 lg:mt-12">
        {approach.points.map((point, index) => (
          <li key={point.title.fr}>
            <Reveal
              delay={index * 110}
              className="h-full border-t border-hairline pt-6 lg:pt-7"
            >
              <span
                className="ember-text font-display text-lg font-semibold"
                aria-hidden
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 font-display text-lg font-semibold lg:text-xl">
                {t(point.title)}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">
                {t(point.body)}
              </p>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}
