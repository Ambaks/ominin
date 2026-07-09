import { proofSection } from "@/lib/landing-data";

export function Proof() {
  // TODO: replace vendor citations with links to primary sources
  return (
    <section className="border-t border-hairline">
      <div className="mx-auto w-full max-w-2xl px-5 py-16 lg:max-w-5xl lg:px-10 lg:py-24">
        <h2 className="max-w-3xl font-display text-2xl font-medium tracking-tight sm:text-3xl lg:text-4xl">
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
              <span className="ember-text font-display text-5xl font-medium lg:text-6xl">
                {item.stat}
              </span>
              <h3 className="font-display text-base font-medium lg:text-lg">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                {item.description}
              </p>
              <p className="text-xs text-muted">{item.source}</p>
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
