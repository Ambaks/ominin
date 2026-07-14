import { howItWorks } from "@/lib/clip-landing-data";
import { SectionHeading } from "@/components/landing/section-heading";

export function ClipHowItWorks() {
  return (
    <section className="border-t border-hairline">
      <div className="mx-auto w-full max-w-2xl px-5 py-16 lg:max-w-5xl lg:px-10 lg:py-24">
        <SectionHeading eyebrow={howItWorks.eyebrow} title={howItWorks.title} />

        <div className="mt-12 grid gap-0 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          {howItWorks.steps.map((step, i) => (
            <div
              key={i}
              className="relative flex flex-col gap-3 pb-8 pl-12 lg:pb-0 lg:pl-0"
            >
              {i < howItWorks.steps.length - 1 && (
                <div className="ember-gradient absolute left-[18px] top-10 h-[calc(100%-2.5rem)] w-px opacity-30 lg:left-0 lg:right-0 lg:top-auto lg:bottom-0 lg:h-px lg:w-full" />
              )}
              <span className="ember-text absolute left-0 top-0 font-display text-3xl font-medium lg:static lg:text-4xl">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display text-base font-medium lg:mt-4 lg:text-lg">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
