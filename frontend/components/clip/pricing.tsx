import Link from "next/link";
import {
  formatEuros,
  pricingSection,
  signupCta,
} from "@/lib/clip-landing-data";
import { SectionHeading } from "@/components/landing/section-heading";

function PriceCard({
  plan,
  highlighted,
}: {
  plan: typeof pricingSection.base | typeof pricingSection.subscription;
  highlighted?: boolean;
}) {
  const badge = "badge" in plan ? plan.badge : undefined;
  return (
    <div
      className={`relative flex flex-col gap-5 rounded-2xl border p-6 lg:rounded-3xl lg:p-8 ${
        highlighted
          ? "border-ember-2/40 bg-surface shadow-lg shadow-ember-2/5"
          : "border-hairline bg-surface"
      }`}
    >
      {badge && (
        <span className="ember-gradient absolute -top-3 left-6 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-background">
          {badge}
        </span>
      )}

      <div>
        <h3 className="font-display text-xl font-medium lg:text-2xl">
          {plan.name}
        </h3>
        <p className="mt-1 text-sm text-muted">{plan.tagline}</p>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="ember-text font-display text-4xl font-medium">
          {formatEuros(plan.price)}
        </span>
        <span className="text-sm text-faint">{plan.priceNote}</span>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          {plan.featuresLabel}
        </p>
        <ul className="flex flex-col gap-2">
          {plan.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-sm text-foreground"
            >
              <span className="mt-0.5 text-ember-1">✓</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ClipPricing() {
  return (
    <section
      id={pricingSection.id}
      className="scroll-mt-20 border-t border-hairline"
    >
      <div className="mx-auto w-full max-w-2xl px-5 py-16 lg:max-w-5xl lg:px-10 lg:py-24">
        <SectionHeading
          eyebrow={pricingSection.eyebrow}
          title={pricingSection.title}
          subtitle={pricingSection.subtitle}
          center
        />

        <div className="mt-12 grid items-stretch gap-4 lg:mt-16 lg:grid-cols-[1fr_auto_1fr] lg:gap-5">
          <PriceCard plan={pricingSection.base} />
          <div
            className="flex items-center justify-center font-display text-2xl text-faint"
            aria-hidden
          >
            +
          </div>
          <PriceCard plan={pricingSection.subscription} highlighted />
        </div>

        <div className="mt-10 text-center">
          <Link
            href={signupCta.href}
            className="ember-gradient inline-block rounded-full px-8 py-3.5 text-sm font-semibold text-background lg:text-base"
          >
            {pricingSection.ctaLabel}
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted">
          {pricingSection.guarantees.map((g) => (
            <span key={g} className="flex items-center gap-1.5">
              <span className="text-ember-1">✓</span>
              {g}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
