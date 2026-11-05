import { KitHeading } from "./heading";

/** FAQ en cartes : titre collé à gauche, réponses dépliables à droite. */
export function KitFaq({
  id,
  eyebrow,
  title,
  items,
  glass,
}: {
  id: string;
  eyebrow: string;
  title: string;
  items: readonly { question: string; answer: string }[];
  /** Cartes de verre ; l'ouverte prend l'anneau de braise. */
  glass?: boolean;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_1.5fr] lg:px-10 lg:py-24">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <KitHeading eyebrow={eyebrow} title={title} />
        </div>
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <details
              key={item.question}
              className={`kit-faq group px-5 ${
                glass
                  ? "g-glass"
                  : "rounded-2xl border border-hairline bg-surface transition-colors open:border-ember-2/40"
              }`}
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
              <p className="pb-5 pr-10 text-sm leading-relaxed text-muted">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
