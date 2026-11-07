import Image from "next/image";
import { KitHeading } from "@/components/landing-kit/heading";
import { Reveal } from "@/components/landing-kit/reveal";
import { accompanySection } from "@/lib/menu-landing-data";

/*
 * L'accompagnement : ce qui distingue Ominin d'un logiciel qu'on installe
 * seul. À gauche (collé sur ordinateur) le titre et les cartes de table d'un
 * vrai client ; à droite le fil, du démarrage à chaque fin de mois.
 */
const { phases } = accompanySection;
const firstNumber = phases.map((_, p) => phases.slice(0, p).reduce((sum, phase) => sum + phase.steps.length, 1));

export function MenuAccompany() {
  return (
    <section id={accompanySection.id} className="scroll-mt-20">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:px-10">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <KitHeading eyebrow={accompanySection.eyebrow} title={accompanySection.title} subtitle={accompanySection.subtitle} />
          <Reveal className="g-glass g-glass-hero mt-10 p-g-pad">
            <figure className="g-plate overflow-hidden">
              <Image
                src={accompanySection.photo.src}
                alt={accompanySection.photo.alt}
                width={1600}
                height={1100}
                sizes="(max-width: 1024px) 92vw, 34rem"
                className="aspect-[16/11] w-full object-cover"
              />
              <figcaption className="px-4 py-3 text-xs text-muted">{accompanySection.photo.caption}</figcaption>
            </figure>
          </Reveal>
        </div>

        <div className="flex flex-col gap-10 lg:pt-2">
          {phases.map((phase, p) => (
            <div key={phase.label}>
              <Reveal>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-ember-1">{phase.label}</p>
              </Reveal>
              <ol className="menu-timeline mt-4 flex flex-col gap-3">
                {phase.steps.map((step, i) => (
                    <Reveal key={step.title} as="li" className="relative grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4">
                      <span className="kit-display ember-gradient relative z-1 flex size-11 items-center justify-center rounded-full text-lg text-background">
                        {firstNumber[p] + i}
                      </span>
                      <div className="g-plate px-5 py-4">
                        <h3 className="text-base font-bold leading-snug lg:text-lg">{step.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
                      </div>
                    </Reveal>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
