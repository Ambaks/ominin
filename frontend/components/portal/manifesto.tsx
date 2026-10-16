"use client";

import { Reveal } from "@/components/landing-kit/reveal";
import { useActiveIndex } from "@/components/landing-kit/use-active-index";
import { useLanguage } from "@/lib/portal/language";
import { manifesto } from "@/lib/portal-data";

/*
 * Le manifeste, lu au défilement : une bande sombre dans les deux thèmes —
 * la paroi —, chaque phrase s'allume quand elle passe la ligne de lecture et
 * reste allumée, comme un texte qu'on vient de lire. Le basculement « Ça,
 * c'est à nous. » passe en braise ; la signature referme le texte.
 */
export function PortalManifesto() {
  const { t } = useLanguage();
  const { active, itemRef } = useActiveIndex<HTMLLIElement>();

  return (
    <section id="histoire" className="relative scroll-mt-20 overflow-hidden bg-[#0c0907] text-[#f3ebe0]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_100%,color-mix(in_oklab,var(--ember-2)_22%,transparent),transparent_70%)]"
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-5xl px-4 pb-[22vh] pt-20 sm:px-6 sm:pt-28 lg:px-10 lg:pt-36">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-ember-1">
          <span aria-hidden className="ember-gradient size-1.5 rounded-full" />
          {t(manifesto.eyebrow)}
        </p>
        <ol className="mt-12 flex flex-col gap-12 sm:gap-16 lg:mt-16 lg:gap-20">
          {manifesto.lines.map((line, i) => (
            <li
              key={line.text.fr}
              ref={itemRef(i)}
              className={`kit-display text-balance transition-[opacity,filter] duration-700 motion-reduce:transition-none ${
                "turn" in line ? "ember-text text-5xl sm:text-7xl lg:text-8xl" : "text-[1.9rem] leading-[1.05] sm:text-5xl lg:text-6xl"
              } ${i <= active ? "opacity-100" : "opacity-20 blur-[1px]"}`}
            >
              {t(line.text)}
            </li>
          ))}
        </ol>
        <Reveal className="mt-24 sm:mt-32">
          <p className="kit-display whitespace-nowrap text-[clamp(2.6rem,12vw,8rem)] lg:text-9xl">
            {manifesto.signature.name}
            <br />
            <span className="kit-mark mt-2">{t(manifesto.signature.motto)}</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
