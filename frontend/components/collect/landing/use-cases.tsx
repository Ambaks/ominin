import { SectionHeading } from "@/components/landing/section-heading";
import { useCasesSection } from "@/lib/collect-landing-data";

/*
 * Trois métiers, chacun en deux temps : le problème tel qu'il se vit au
 * comptoir, puis ce que la commande en ligne y change. Le second temps est
 * mis en avant (fond braise léger) — c'est la promesse ; le premier n'est là
 * que pour qu'on s'y reconnaisse.
 */
export function CollectUseCases() {
  return (
    <section
      id={useCasesSection.id}
      className="scroll-mt-20 border-t border-hairline"
    >
      <div className="mx-auto w-full max-w-2xl px-5 py-16 lg:max-w-5xl lg:px-10 lg:py-24">
        <SectionHeading
          eyebrow={useCasesSection.eyebrow}
          title={useCasesSection.title}
          subtitle={useCasesSection.subtitle}
          center
        />

        <div className="mt-12 grid gap-5 lg:mt-16 lg:grid-cols-3">
          {useCasesSection.items.map((item) => (
            <article
              key={item.title}
              className="flex flex-col overflow-hidden rounded-2xl border border-hairline bg-surface lg:rounded-3xl"
            >
              <div className="flex flex-col gap-2 p-6 pb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ember-2">
                  {item.kicker}
                </p>
                <h3 className="font-display text-xl font-medium">
                  {item.title}
                </h3>
              </div>
              <div className="flex flex-1 flex-col">
                <div className="border-t border-hairline px-6 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                    {useCasesSection.problemLabel}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {item.problem}
                  </p>
                </div>
                <div className="flex-1 border-t border-ember-2/30 bg-ember-2/5 px-6 py-4">
                  <p className="ember-text text-[11px] font-semibold uppercase tracking-wider">
                    {useCasesSection.solutionLabel}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed">
                    {item.solution}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
