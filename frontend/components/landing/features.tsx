import { featuresSection } from "@/lib/landing-data";
import { SectionHeading } from "./section-heading";

export function Features() {
  return (
    <section
      id={featuresSection.id}
      className="scroll-mt-20 border-t border-hairline"
    >
      <div className="mx-auto w-full max-w-2xl px-5 py-16 lg:max-w-5xl lg:px-10 lg:py-24">
        <SectionHeading
          eyebrow={featuresSection.eyebrow}
          title={featuresSection.title}
          subtitle={featuresSection.subtitle}
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3 lg:gap-5">
          {featuresSection.features.map((feature) => (
            <div
              key={feature.stat}
              className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-6 lg:rounded-3xl lg:p-8"
            >
              <span className="ember-text font-display text-4xl font-medium lg:text-5xl">
                {feature.stat}
              </span>
              <h3 className="font-display text-base font-medium lg:text-lg">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
