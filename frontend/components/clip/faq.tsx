import { faqSection } from "@/lib/clip-landing-data";
import { SectionHeading } from "@/components/landing/section-heading";

export function ClipFaq() {
  return (
    <section
      id={faqSection.id}
      className="scroll-mt-20 border-t border-hairline"
    >
      <div className="mx-auto w-full max-w-2xl px-5 py-16 lg:max-w-5xl lg:px-10 lg:py-24">
        <SectionHeading eyebrow={faqSection.eyebrow} title={faqSection.title} />

        <div className="mt-12 flex flex-col divide-y divide-hairline lg:mt-16">
          {faqSection.items.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-medium text-foreground lg:text-base [&::-webkit-details-marker]:hidden">
                {item.question}
                <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 pr-10 text-sm leading-relaxed text-muted">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
