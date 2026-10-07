import { useCasesSection } from "@/lib/collect-landing-data";
import { KitHeading } from "@/components/landing-kit/heading";
import { Reveal } from "@/components/landing-kit/reveal";

/** Pictogrammes des trois métiers (trait, couleur du texte). */
const ICONS = {
  phone: "M8 3h8a1 1 0 011 1v16a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1zm3 15h2M19 7c1.5 1.5 1.5 4.5 0 6",
  cake: "M4 20h16M5 20v-7h14v7M5 13c2 1.5 4.5 1.5 7 0 2.5 1.5 5 1.5 7 0M8 13V9m4 4V8m4 5V9M8 6.5v-.5m4-.5v-.5m4 .5v-.5",
  bag: "M5 8h14l-1 12H6L5 8zm4 0V6a3 3 0 016 0v2M9 12h6",
} as const;

export function CollectUseCases() {
  return (
    <section id={useCasesSection.id} className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
        <KitHeading
          eyebrow={useCasesSection.eyebrow}
          title={useCasesSection.title}
          subtitle={useCasesSection.subtitle}
        />
        <div className="mt-14 grid gap-4 lg:grid-cols-3 lg:grid-rows-[auto_auto_auto_auto]">
          {useCasesSection.items.map((item, i) => (
            <Reveal
              key={item.title}
              as="article"
              delay={i * 120}
              className="kit-card flex flex-col gap-5 rounded-3xl border border-hairline bg-surface p-6 lg:row-span-4 lg:grid lg:grid-rows-subgrid lg:p-7"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-ember-1">
                  {item.kicker}
                </p>
                <span className="ember-gradient flex size-11 shrink-0 items-center justify-center rounded-2xl text-background">
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={ICONS[item.icon]} />
                  </svg>
                </span>
              </div>
              <h3 className="kit-display text-balance text-2xl lg:text-[1.7rem]">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">
                  {useCasesSection.problemLabel}
                </span>
                <span className="mt-1 block text-foreground/75">{item.problem}</span>
              </p>
              <p className="mt-auto rounded-2xl border border-ember-2/25 bg-ember-2/10 p-4 pt-3.5 text-sm leading-relaxed">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-ember-1">
                  {useCasesSection.solutionLabel}
                </span>
                <span className="mt-1 block">{item.solution}</span>
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
