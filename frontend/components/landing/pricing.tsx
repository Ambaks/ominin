import { planSignupHref, pricingSection } from "@/lib/landing-data";
import { formatPrice } from "@/lib/menu-data";
import { SectionHeading } from "./section-heading";

export function Pricing() {
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

        <div className="mt-12 grid gap-5 lg:mt-16 lg:grid-cols-3 lg:items-stretch">
          {pricingSection.plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col gap-5 rounded-2xl border p-6 lg:rounded-3xl lg:p-8 ${
                plan.badge
                  ? "border-ember-2/40 bg-surface shadow-lg shadow-ember-2/5 lg:-translate-y-2"
                  : "border-hairline bg-surface"
              }`}
            >
              {plan.badge && (
                <span className="ember-gradient absolute -top-3 left-6 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-background">
                  {plan.badge}
                </span>
              )}

              <div>
                <h3 className="font-display text-xl font-medium lg:text-2xl">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-muted">{plan.tagline}</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="ember-text font-display text-4xl font-medium">
                  {formatPrice(plan.price)}
                </span>
                <span className="text-sm text-faint">
                  {pricingSection.perMonth}
                </span>
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

              <a
                href={planSignupHref(plan.id)}
                className={`mt-auto rounded-full px-5 py-2.5 text-center text-sm font-semibold transition-colors ${
                  plan.badge
                    ? "ember-gradient text-background"
                    : "border border-hairline text-foreground hover:border-ember-2/40"
                }`}
              >
                {pricingSection.ctaLabel} {plan.name}
              </a>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted lg:mt-14">
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
