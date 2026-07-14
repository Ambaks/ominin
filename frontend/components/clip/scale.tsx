import { formatEuros, scaleSection } from "@/lib/clip-landing-data";
import { SectionHeading } from "@/components/landing/section-heading";

const BAR_WIDTHS = ["w-1/5", "w-2/5", "w-full"];

export function ClipScale() {
  return (
    <section
      id={scaleSection.id}
      className="scroll-mt-20 border-t border-hairline"
    >
      <div className="mx-auto w-full max-w-2xl px-5 py-16 lg:max-w-5xl lg:px-10 lg:py-24">
        <SectionHeading
          eyebrow={scaleSection.eyebrow}
          title={scaleSection.title}
          subtitle={scaleSection.subtitle}
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-3 lg:mt-16 lg:gap-5">
          {scaleSection.tiers.map((tier, i) => (
            <div
              key={tier.accounts}
              className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-6 lg:rounded-3xl lg:p-8"
            >
              <div className="flex items-baseline gap-2">
                <span className="ember-text font-display text-4xl font-medium lg:text-5xl">
                  {tier.accounts}
                </span>
                <span className="text-sm text-muted">
                  {scaleSection.tierAccountsLabel}
                </span>
              </div>
              <p className="text-sm text-foreground">
                {formatEuros(tier.price)}
                <span className="text-faint">{scaleSection.tierPerMonth}</span>
              </p>
              <div className="mt-auto h-1 w-full rounded-full bg-hairline">
                <div
                  className={`ember-gradient h-1 rounded-full ${BAR_WIDTHS[i]}`}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted lg:mt-10">
          {scaleSection.footline}
        </p>
      </div>
    </section>
  );
}
