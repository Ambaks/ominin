"use client";

import Image from "next/image";
import { Reveal } from "@/components/landing-kit/reveal";
import { useActiveIndex } from "@/components/landing-kit/use-active-index";
import { useLanguage } from "@/lib/portal/language";
import { manifesto } from "@/lib/portal-data";

/*
 * Le manifeste, lu au défilement : une bande sombre dans les deux thèmes —
 * la paroi —, chaque phrase s'allume quand elle passe la ligne de lecture et
 * reste allumée, comme un texte qu'on vient de lire. Le basculement « Ça,
 * c'est à nous. » passe en braise ; la signature referme le texte.
 *
 * Chaque phrase a sa photo : collée à droite sur ordinateur, où celle de la
 * phrase lue apparaît en fondu par-dessus les autres ; sous la phrase sur
 * téléphone, où elle s'allume avec elle. Même voile que les offres — un peu
 * désaturée, fondue dans la paroi, réchauffée de braise.
 */

const veil = (
  <>
    <div className="absolute inset-0 bg-linear-to-t from-[#0c0907] via-[#0c0907]/25 to-[#0c0907]/10" aria-hidden />
    <div className="ember-gradient absolute inset-0 opacity-[0.14] mix-blend-overlay" aria-hidden />
  </>
);

export function PortalManifesto() {
  const { t } = useLanguage();
  const { active, itemRef } = useActiveIndex<HTMLLIElement>();

  return (
    <section id="histoire" className="relative scroll-mt-20 overflow-clip bg-[#0c0907] text-[#f3ebe0]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_100%,color-mix(in_oklab,var(--ember-2)_22%,transparent),transparent_70%)]"
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-[22vh] pt-20 sm:px-6 sm:pt-28 lg:px-10 lg:pt-36">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-ember-1">
          <span aria-hidden className="ember-gradient size-1.5 rounded-full" />
          {t(manifesto.eyebrow)}
        </p>
        <div className="lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-16">
          <ol className="mt-12 flex flex-col gap-12 sm:gap-16 lg:mt-16 lg:gap-[22vh] lg:pb-[20vh]">
            {manifesto.lines.map((line, i) => (
              <li
                key={line.text.fr}
                ref={itemRef(i)}
                className={`transition-[opacity,filter] duration-700 motion-reduce:transition-none ${
                  i <= active ? "opacity-100" : "opacity-20 blur-[1px]"
                }`}
              >
                <p
                  className={`kit-display text-balance ${
                    "turn" in line ? "ember-text text-5xl sm:text-7xl lg:text-8xl" : "text-[1.9rem] leading-[1.05] sm:text-5xl lg:text-6xl"
                  }`}
                >
                  {t(line.text)}
                </p>
                <div className="relative mt-6 aspect-[16/10] overflow-hidden rounded-3xl lg:hidden">
                  <Image src={line.photo.src} alt={t(line.photo.alt)} fill sizes="100vw" className="object-cover saturate-[0.72]" />
                  {veil}
                </div>
              </li>
            ))}
          </ol>
          <div className="hidden lg:block">
            <div className="sticky top-[calc(50vh-17rem)] mt-16 aspect-[4/5] overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_30px_80px_-40px_var(--ember-2)]">
              {manifesto.lines.map((line, i) => (
                <div
                  key={line.text.fr}
                  className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${i === active ? "opacity-100" : "opacity-0"}`}
                >
                  <Image src={line.photo.src} alt={i === active ? t(line.photo.alt) : ""} fill sizes="40vw" className="object-cover saturate-[0.72]" />
                  {veil}
                </div>
              ))}
            </div>
          </div>
        </div>
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
