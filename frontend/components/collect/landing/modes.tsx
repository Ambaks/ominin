import { SectionHeading } from "@/components/landing/section-heading";
import { modesSection } from "@/lib/collect-landing-data";

/*
 * Ce que comprend l'offre : les deux entrées de commande côte à côte, puis
 * le site web sur toute la largeur, dans le langage du hero (trame collect
 * en filigrane, lueur braise) — c'est la pièce de l'offre qu'aucune
 * plateforme ne propose.
 */
export function CollectModes() {
  return (
    <section
      id={modesSection.id}
      className="scroll-mt-20 border-t border-hairline"
    >
      <div className="mx-auto w-full max-w-2xl px-5 py-16 lg:max-w-5xl lg:px-10 lg:py-24">
        <SectionHeading
          eyebrow={modesSection.eyebrow}
          title={modesSection.title}
          subtitle={modesSection.subtitle}
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:mt-16 lg:gap-5">
          {modesSection.modes.map((mode) => (
            <div
              key={mode.label}
              className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-6 lg:rounded-3xl lg:p-8"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ember-2">
                {mode.label}
              </p>
              <h3 className="font-display text-lg font-medium lg:text-xl">
                {mode.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted">{mode.body}</p>
            </div>
          ))}
        </div>

        <div className="relative mt-4 overflow-hidden rounded-2xl border border-ember-2/40 lg:mt-5 lg:rounded-3xl">
          <div
            className="collect-dash-motif absolute inset-0 [mask-image:radial-gradient(ellipse_90%_100%_at_50%_0%,black,transparent)]"
            aria-hidden
          />
          <div className="ember-glow absolute inset-0" aria-hidden />
          <div className="relative flex flex-col gap-3 p-6 lg:p-8">
            <p className="ember-text text-[11px] font-semibold uppercase tracking-[0.2em]">
              {modesSection.website.label}
            </p>
            <h3 className="font-display text-xl font-medium lg:text-2xl">
              {modesSection.website.title}
            </h3>
            <p className="max-w-2xl text-sm leading-relaxed text-muted">
              {modesSection.website.body}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
