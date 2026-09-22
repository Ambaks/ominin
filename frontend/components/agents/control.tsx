import { SectionHeading } from "@/components/landing/section-heading";
import { controlSection } from "@/lib/agents-landing-data";

export function AgentsControl() {
  return (
    <section id={controlSection.id} className="scroll-mt-20 border-t border-hairline">
      <div className="mx-auto w-full max-w-2xl px-5 py-16 lg:max-w-5xl lg:px-10 lg:py-24">
        <SectionHeading
          eyebrow={controlSection.eyebrow}
          title={controlSection.title}
          subtitle={controlSection.subtitle}
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:mt-16 lg:gap-5">
          {controlSection.features.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-6 lg:rounded-3xl lg:p-8"
            >
              <span className="ember-text font-display text-4xl font-medium lg:text-5xl">
                {feature.stat}
              </span>
              <h3 className="font-display text-base font-medium lg:text-lg">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
