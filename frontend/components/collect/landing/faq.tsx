import { faqSection } from "@/lib/collect-landing-data";
import { CollectHeading } from "./heading";

export function CollectFaq() {
  return (
    <section id={faqSection.id} className="scroll-mt-20">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.5fr] lg:px-10 lg:py-32">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <CollectHeading eyebrow={faqSection.eyebrow} title={faqSection.title} />
        </div>
        <div className="flex flex-col gap-3">
          {faqSection.items.map((item) => (
            <details
              key={item.question}
              className="collect-faq group rounded-2xl border border-hairline bg-surface px-5 transition-colors open:border-ember-2/40"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 py-5 text-base font-semibold">
                {item.question}
                <span
                  aria-hidden
                  className="faq-sign flex size-8 shrink-0 items-center justify-center rounded-full border border-hairline text-lg text-ember-1"
                >
                  +
                </span>
              </summary>
              <p className="pb-5 pr-10 text-sm leading-relaxed text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
