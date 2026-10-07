import { proofSection } from "@/lib/landing-data";

export function Proof() {
  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10 lg:py-24">
        <h2 className="max-w-3xl kit-display text-2xl font-medium tracking-tight sm:text-3xl lg:text-4xl">
          {proofSection.titleStart}{" "}
          <span className="ember-text">{proofSection.titleAccent}</span>
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted lg:text-[15px]">
          {proofSection.subtitle}
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3 lg:gap-5">
          {proofSection.stats.map((item) => (
            <div
              key={item.stat}
              className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-6 lg:rounded-3xl lg:p-8"
            >
              <span className="ember-text kit-display text-5xl font-medium lg:text-6xl">
                {item.stat}
              </span>
              <h3 className="text-base font-semibold leading-snug lg:text-lg">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                {item.description}
              </p>
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto text-xs font-semibold text-muted underline decoration-ember-2/50 underline-offset-4 transition-colors hover:text-foreground"
              >
                {item.source} ↗
              </a>
            </div>
          ))}
        </div>

        <p className="mt-10 max-w-3xl text-xs leading-relaxed text-muted lg:mt-14">
          {proofSection.disclaimer}
        </p>
      </div>
    </section>
  );
}
