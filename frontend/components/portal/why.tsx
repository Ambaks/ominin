"use client";

import { KitHeading } from "@/components/landing-kit/heading";
import { Reveal } from "@/components/landing-kit/reveal";
import { useLanguage } from "@/lib/portal/language";
import { whySection } from "@/lib/portal-data";

/* L'argument du hero, prouvé : quatre cadres de verre, un chiffre sur plaque chacun. */
export function PortalWhy() {
  const { t } = useLanguage();
  return (
    <section id="pourquoi" className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10">
        <KitHeading eyebrow={t(whySection.eyebrow)} title={t(whySection.title)} subtitle={t(whySection.subtitle)} />
        <ul className="mt-12 grid gap-g-gap sm:grid-cols-2">
          {whySection.cards.map((card, i) => (
            <Reveal key={card.title.fr} as="li" delay={(i % 2) * 100} className="g-glass flex p-g-pad">
              <div className="g-plate flex flex-1 flex-col p-7">
                <p className="kit-display ember-text text-4xl lg:text-5xl">{t(card.stat)}</p>
                <h3 className="mt-6 text-lg font-bold">{t(card.title)}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{t(card.body)}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
