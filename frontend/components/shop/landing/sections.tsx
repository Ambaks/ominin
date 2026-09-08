import Image from "next/image";
import { SectionHeading } from "@/components/landing/section-heading";
import { faqSection, featuresSection, finalCta, footer, hero, howItWorks, nav, pricingSection, showcase } from "@/lib/shop-landing-data";
import { ShopWordmark } from "./wordmark";

/* Sections de la landing Ominin Shop, dans le style des autres landings produit. */

export function ShopHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="ember-glow absolute inset-0" aria-hidden />
      <div className="relative mx-auto grid w-full max-w-2xl gap-12 px-5 pb-16 pt-16 lg:max-w-5xl lg:grid-cols-[1fr_minmax(0,24rem)] lg:items-center lg:gap-16 lg:px-10 lg:pb-24 lg:pt-28">
        <div className="flex flex-col items-center gap-8 text-center lg:items-start lg:text-left">
          <p className="rise text-[11px] font-semibold uppercase tracking-[0.28em] text-muted lg:text-xs lg:tracking-[0.35em]">{hero.eyebrow}</p>
          <h1 className="rise font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl" style={{ animationDelay: "80ms" }}>
            {hero.titleStart} <span className="ember-text">{hero.titleAccent}</span>
          </h1>
          <p className="rise max-w-xl text-sm leading-relaxed text-muted lg:text-base" style={{ animationDelay: "160ms" }}>
            {hero.subtitle}
          </p>
          <div className="rise flex flex-col items-center gap-3 sm:flex-row sm:gap-4" style={{ animationDelay: "240ms" }}>
            <a href={hero.primaryCta.href} className="ember-gradient rounded-full px-6 py-3 text-sm font-semibold text-background lg:px-8 lg:py-3.5 lg:text-base">
              {hero.primaryCta.label}
            </a>
            <a href={hero.secondaryCta.href} className="rounded-full border border-hairline bg-background/50 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur-sm transition-colors hover:border-ember-2/40 lg:px-8 lg:py-3.5 lg:text-base">
              {hero.secondaryCta.label}
            </a>
          </div>
          <div className="rise flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-faint lg:justify-start" style={{ animationDelay: "320ms" }}>
            {hero.trustline.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
        <a href={showcase.href} className="rise group relative block overflow-hidden rounded-3xl border border-hairline bg-surface shadow-lg shadow-ember-2/5" style={{ animationDelay: "320ms" }}>
          <Image src="/shop/mybox/signature.webp" alt="La boutique MyBox, première boutique Ominin Shop" width={640} height={800} className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" priority />
          <span className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-2xl bg-background/85 px-4 py-3 backdrop-blur-sm">
            <span className="flex flex-col">
              <span className="text-sm font-semibold">MyBox</span>
              <span className="text-xs text-muted">shop.ominin.com/mybox</span>
            </span>
            <span className="ember-text text-xs font-semibold uppercase tracking-wider">Ouvrir</span>
          </span>
        </a>
      </div>
    </section>
  );
}

export function ShopShowcase() {
  return (
    <section id={showcase.id} className="scroll-mt-20 border-t border-hairline">
      <div className="mx-auto grid w-full max-w-2xl gap-10 px-5 py-16 lg:max-w-5xl lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-10 lg:py-24">
        <div className="flex flex-col gap-6">
          <SectionHeading eyebrow={showcase.eyebrow} title={showcase.title} subtitle={showcase.subtitle} />
          <dl className="grid grid-cols-2 gap-4">
            {showcase.points.map((point) => (
              <div key={point.label} className="rounded-2xl border border-hairline bg-surface p-4">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-faint">{point.label}</dt>
                <dd className="mt-1 text-sm">{point.value}</dd>
              </div>
            ))}
          </dl>
          <a href={showcase.href} className="ember-gradient inline-block w-fit rounded-full px-6 py-3 text-sm font-semibold text-background">
            {showcase.ctaLabel}
          </a>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Image src="/shop/mybox/l-ultime-30-ml.webp" alt="" width={480} height={600} className="mt-8 aspect-[4/5] w-full rounded-3xl object-cover" />
          <Image src="/shop/mybox/l-evasion.webp" alt="" width={480} height={600} className="mb-8 aspect-[4/5] w-full rounded-3xl object-cover" />
        </div>
      </div>
    </section>
  );
}

export function ShopHowItWorks() {
  return (
    <section id={howItWorks.id} className="scroll-mt-20 border-t border-hairline">
      <div className="mx-auto w-full max-w-2xl px-5 py-16 lg:max-w-5xl lg:px-10 lg:py-24">
        <SectionHeading eyebrow={howItWorks.eyebrow} title={howItWorks.title} center />
        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {howItWorks.steps.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-6">
              <span className="ember-text font-display text-3xl font-medium">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-display text-lg font-medium">{step.title}</span>
              <p className="text-sm leading-relaxed text-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function ShopFeatures() {
  return (
    <section id={featuresSection.id} className="scroll-mt-20 border-t border-hairline">
      <div className="mx-auto w-full max-w-2xl px-5 py-16 lg:max-w-5xl lg:px-10 lg:py-24">
        <SectionHeading eyebrow={featuresSection.eyebrow} title={featuresSection.title} subtitle={featuresSection.subtitle} center />
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {featuresSection.groups.map((group) => (
            <div key={group.title} className="rounded-3xl border border-hairline bg-surface p-6 lg:p-8">
              <h3 className="font-display text-xl font-medium">{group.title}</h3>
              <ul className="mt-5 flex flex-col gap-3">
                {group.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 text-ember-1">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ShopPricing() {
  const { offer } = pricingSection;
  return (
    <section id={pricingSection.id} className="scroll-mt-20 border-t border-hairline">
      <div className="mx-auto w-full max-w-2xl px-5 py-16 lg:max-w-5xl lg:px-10 lg:py-24">
        <SectionHeading eyebrow={pricingSection.eyebrow} title={pricingSection.title} subtitle={pricingSection.subtitle} center />
        <div className="mx-auto mt-12 flex max-w-xl flex-col gap-6 rounded-3xl border border-ember-2/40 bg-surface p-6 shadow-lg shadow-ember-2/5 lg:p-8">
          <div>
            <h3 className="font-display text-2xl font-medium">{offer.name}</h3>
            <p className="mt-1 text-sm text-muted">{offer.tagline}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: pricingSection.setupLabel, price: offer.setupPrice, unit: pricingSection.onceLabel },
              { label: pricingSection.monthlyLabel, price: offer.monthlyPrice, unit: pricingSection.perMonth },
            ].map((line) => (
              <div key={line.label} className="rounded-2xl border border-hairline bg-background p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">{line.label}</p>
                {offer.published && line.price > 0 ? (
                  <p className="mt-1 flex items-baseline gap-1.5">
                    <span className="ember-text font-display text-3xl font-medium">{line.price} €</span>
                    <span className="text-sm text-faint">{line.unit}</span>
                  </p>
                ) : (
                  <p className="ember-text mt-1 font-display text-2xl font-medium">{pricingSection.quoteLabel}</p>
                )}
              </div>
            ))}
          </div>
          {!offer.published && <p className="text-xs leading-relaxed text-muted">{pricingSection.quoteHint}</p>}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{pricingSection.featuresLabel}</p>
            <ul className="mt-2 flex flex-col gap-2">
              {offer.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-ember-1">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <a href={finalCta.contactHref} className="ember-gradient inline-block w-fit rounded-full px-8 py-3.5 text-sm font-semibold text-background">
            {pricingSection.ctaLabel}
          </a>
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

export function ShopFaq() {
  return (
    <section id={faqSection.id} className="scroll-mt-20 border-t border-hairline">
      <div className="mx-auto w-full max-w-2xl px-5 py-16 lg:max-w-3xl lg:px-10 lg:py-24">
        <SectionHeading eyebrow={faqSection.eyebrow} title={faqSection.title} center />
        <div className="mt-10 flex flex-col divide-y divide-hairline rounded-3xl border border-hairline bg-surface px-6">
          {faqSection.items.map((item) => (
            <details key={item.question} className="group py-4">
              <summary className="cursor-pointer list-none text-sm font-medium [&::-webkit-details-marker]:hidden">{item.question}</summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ShopFinalCta() {
  return (
    <section id={finalCta.id} className="scroll-mt-20 border-t border-hairline">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-5 py-16 text-center lg:max-w-5xl lg:px-10 lg:py-24">
        <h2 className="font-display text-3xl font-medium tracking-tight lg:text-4xl">{finalCta.title}</h2>
        <p className="max-w-xl text-sm leading-relaxed text-muted lg:text-base">{finalCta.subtitle}</p>
        <a href={finalCta.contactHref} className="ember-gradient rounded-full px-8 py-3.5 text-sm font-semibold text-background lg:text-base">
          {finalCta.contactLabel}
        </a>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-faint">
          {finalCta.microcopy.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ShopFooter() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-5 py-10 text-center lg:max-w-5xl lg:px-10 lg:py-14">
        <p className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={28} height={28} />
          <ShopWordmark />
        </p>
        <p className="max-w-sm text-xs leading-relaxed text-faint">{footer.tagline}</p>
        <p className="max-w-sm text-xs leading-relaxed text-muted">{footer.customerNotice}</p>
        <nav className="flex flex-wrap justify-center gap-4 text-xs text-muted">
          {nav.links.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>
        <p className="text-xs text-faint">© 2026 Ominin</p>
      </div>
    </footer>
  );
}
