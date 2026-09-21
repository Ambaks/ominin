import { Reveal } from "@/components/portal/reveal";
import {
  installSection,
  planQuoteHref,
  pricingSection,
  trialPricing,
  type Plan,
} from "@/lib/landing-data";
import { formatPrice } from "@/lib/menu-data";
import { SquareMark } from "./install-scenes";
import { SectionHeading } from "./section-heading";

function Features({ plan, columns }: { plan: Plan; columns?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
        {plan.featuresLabel}
      </p>
      <ul className={`grid gap-2 ${columns ? "sm:grid-cols-2 sm:gap-x-6" : ""}`}>
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
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const { commission } = plan;
  const trial = trialPricing(plan);
  return (
    <div
      className={`relative flex h-full flex-col gap-6 rounded-2xl border p-6 lg:rounded-3xl lg:p-8 ${
        commission
          ? "border-ember-2/40 bg-surface shadow-lg shadow-ember-2/5"
          : "border-hairline bg-surface"
      }`}
    >
      {commission && (
        <div
          className="ember-glow pointer-events-none absolute inset-0 rounded-[inherit]"
          aria-hidden
        />
      )}
      {plan.badge && (
        <span className="ember-gradient absolute -top-3 left-6 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-background">
          {plan.badge}
        </span>
      )}

      <div className="relative">
        <h3 className="font-display text-xl font-medium lg:text-2xl">
          {plan.name}
        </h3>
        <p className="mt-1 text-sm text-muted">{plan.tagline}</p>
      </div>

      <div className="relative flex flex-wrap items-end gap-x-5 gap-y-3">
        <div className="flex items-baseline gap-1">
          <span
            className={`ember-text font-display font-medium ${
              commission ? "text-6xl lg:text-7xl" : "text-4xl"
            }`}
          >
            {trial ? trial.price : formatPrice(plan.price)}
          </span>
          <span className="text-sm text-faint">
            {trial ? trial.unit : pricingSection.perMonth}
          </span>
        </div>
        {commission && (
          <p className="flex max-w-[15rem] items-center gap-3 pb-1.5 text-sm leading-snug text-muted">
            <span className="whitespace-nowrap rounded-full border border-ember-2/40 px-3 py-1 font-display text-lg font-medium text-foreground">
              + {commission.percent} %
            </span>
            {commission.basis}
          </p>
        )}
      </div>

      {trial && (
        <p className="relative -mt-4 text-[13px] leading-relaxed text-muted">
          {trial.note}
        </p>
      )}

      <div className="relative">
        <Features plan={plan} columns={Boolean(commission)} />
      </div>

      {commission && (
        <div className="relative flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {pricingSection.installLabel}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {installSection.paths.map((path) => (
              <a
                key={path.id}
                href={`#${installSection.id}`}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-transform duration-300 hover:-translate-y-0.5 ${
                  path.id === "square"
                    ? "border-transparent bg-foreground text-background"
                    : "border-hairline bg-background/50"
                }`}
              >
                {path.id === "square" ? (
                  <SquareMark className="size-5 shrink-0" />
                ) : (
                  <span className="ember-gradient size-2 shrink-0 rounded-full shadow-[0_0_8px_var(--ember-1)]" />
                )}
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {path.label}
                  </span>
                  <span className="block text-xs opacity-65">
                    {path.cost.value}
                  </span>
                </span>
              </a>
            ))}
          </div>
          <a
            href={`#${installSection.id}`}
            className="text-xs text-muted underline decoration-hairline underline-offset-4 transition-colors hover:text-foreground"
          >
            {pricingSection.installLink} ↓
          </a>
        </div>
      )}

      <a
        href={planQuoteHref(plan.id)}
        className={`relative mt-auto rounded-full px-5 py-2.5 text-center text-sm font-semibold transition-colors ${
          commission
            ? "ember-gradient text-background"
            : "border border-hairline text-foreground hover:border-ember-2/40"
        }`}
      >
        {pricingSection.ctaLabel} {plan.name}
      </a>
    </div>
  );
}

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

        <div className="mt-12 grid gap-5 lg:mt-16 lg:grid-cols-5 lg:items-stretch">
          {pricingSection.plans.map((plan, index) => (
            <Reveal
              key={plan.id}
              delay={index * 120}
              className={plan.commission ? "lg:col-span-3" : "lg:col-span-2"}
            >
              <PlanCard plan={plan} />
            </Reveal>
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
