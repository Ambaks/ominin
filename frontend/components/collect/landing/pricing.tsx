import { pricingSection, signupCta } from "@/lib/collect-landing-data";
import { CollectHeading } from "./heading";

function PriceCard({
  name,
  prices,
  tagline,
  features,
  badge,
  note,
  highlighted,
}: {
  name: string;
  /** Un taux par assiette : « par commande », ou à table et à emporter. */
  prices: { value: string; unit: string }[];
  tagline: string;
  features: string[];
  badge?: string;
  note?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`collect-card relative flex flex-col gap-5 rounded-[2rem] border p-7 lg:p-9 ${
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
        <h3 className="collect-display text-2xl lg:text-3xl">{name}</h3>
        <p className="mt-1 text-sm text-muted">{tagline}</p>
      </div>

      <div>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {prices.map((price) => (
            <div key={price.unit}>
              <span className="collect-display ember-text block whitespace-nowrap text-6xl lg:text-7xl">
                {price.value}
              </span>
              <span className="mt-1 block text-sm text-muted">{price.unit}</span>
            </div>
          ))}
        </div>
        {note && <p className="mt-1 text-xs font-semibold text-muted">{note}</p>}
      </div>

      <a
        href={signupCta.href}
        className={`rounded-full px-6 py-3 text-center text-sm font-bold transition-transform hover:scale-[1.02] ${
          highlighted ? "ember-gradient text-background" : "border border-hairline hover:border-ember-2/50"
        }`}
      >
        {signupCta.label}
      </a>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          {pricingSection.featuresLabel}
        </p>
        <ul className="flex flex-col gap-2">
          {features.map((feature) => (
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

export function CollectPricing() {
  const { offer } = pricingSection;
  return (
    <section
      id={pricingSection.id}
      className="scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
        <CollectHeading
          eyebrow={pricingSection.eyebrow}
          title={pricingSection.title}
          subtitle={pricingSection.subtitle}
          center
        />

        <div className="mt-12 grid items-stretch gap-4 lg:mt-16 lg:grid-cols-[1fr_auto_1fr] lg:gap-5">
          <PriceCard
            name={offer.name}
            prices={[{ value: `${offer.commission.percent}\u00a0%`, unit: pricingSection.perOrder }]}
            tagline={offer.tagline}
            features={offer.features}
            note={pricingSection.commissionLabel}
          />
          <div
            className="collect-display flex items-center justify-center text-2xl text-faint"
            aria-hidden
          >
            {pricingSection.orLabel}
          </div>
          <PriceCard
            name={offer.bundle.name}
            prices={[
              { value: `${offer.bundle.menuCommission.percent}\u00a0%`, unit: pricingSection.bundleUnits.table },
              { value: `${offer.commission.percent}\u00a0%`, unit: pricingSection.bundleUnits.takeaway },
            ]}
            tagline={offer.bundle.tagline}
            features={pricingSection.bundleFeatures}
            badge={pricingSection.bundleBadge}
            note={pricingSection.bundleCommissionLabel}
            highlighted
          />
        </div>
      </div>
    </section>
  );
}
