import Image from "next/image";
import Link from "next/link";
import { LeadForm } from "@/components/landing/lead-form";
import { KitFaq } from "@/components/landing-kit/faq";
import { KitFinalCta } from "@/components/landing-kit/final-cta";
import { KitHeading } from "@/components/landing-kit/heading";
import { Reveal } from "@/components/landing-kit/reveal";
import { contactEmail } from "@/lib/landing-data";
import { editor, LEGAL_LINKS } from "@/lib/legal/constants";
import {
  audiencesSection,
  contactSection,
  faqSection,
  featuresSection,
  finalCta,
  footer,
  nav,
  pricingSection,
  setupSection,
  shiftSection,
  showcase,
} from "@/lib/shop-landing-data";
import { ShopWordmark } from "./wordmark";

/* Sections de la landing Ominin Shop, sur le kit commun aux landings produit (landing-kit). */

/** Pictogrammes des trois profils (trait, couleur du texte). */
const ICONS = {
  chat: "M4 5h16v10H9l-5 4V5zm4 4h8m-8 3h5",
  gift: "M4 10h16v10H4V10zm-1-4h18v4H3V6zm9 0v14M12 6c-1-3-5-3-5-.5S12 6 12 6zm0 0c1-3 5-3 5-.5S12 6 12 6z",
  parcel: "M3 7l9-4 9 4v10l-9 4-9-4V7zm0 0l9 4 9-4M12 11v10M7.5 5l9 4",
} as const;

export function ShopAudiences() {
  return (
    <section id={audiencesSection.id} className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10 lg:py-32">
        <KitHeading eyebrow={audiencesSection.eyebrow} title={audiencesSection.title} subtitle={audiencesSection.subtitle} />
        <div className="mt-14 grid gap-4 lg:grid-cols-3 lg:grid-rows-[auto_auto_auto_auto]">
          {audiencesSection.items.map((item, i) => (
            <Reveal
              key={item.title}
              as="article"
              delay={i * 120}
              className="kit-card flex flex-col gap-5 rounded-3xl border border-hairline bg-surface p-6 lg:row-span-4 lg:grid lg:grid-rows-subgrid lg:p-7"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-ember-1">{item.kicker}</p>
                <span className="ember-gradient flex size-11 shrink-0 items-center justify-center rounded-2xl text-background">
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={ICONS[item.icon]} />
                  </svg>
                </span>
              </div>
              <h3 className="kit-display text-balance text-2xl lg:text-[1.7rem]">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">{audiencesSection.todayLabel}</span>
                <span className="mt-1 block text-foreground/75">{item.today}</span>
              </p>
              <p className="mt-auto rounded-2xl border border-ember-2/25 bg-ember-2/10 p-4 pt-3.5 text-sm leading-relaxed">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-ember-1">{audiencesSection.tomorrowLabel}</span>
                <span className="mt-1 block">{item.tomorrow}</span>
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/*
 * Avant / après ligne à ligne : à gauche la bulle de message telle qu'on la
 * reçoit, à droite ce que la boutique en fait. En mobile, chaque ligne
 * empile ses deux temps.
 */
export function ShopShift() {
  return (
    <section id={shiftSection.id} className="scroll-mt-20 border-y border-hairline bg-surface/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10 lg:py-28">
        <KitHeading eyebrow={shiftSection.eyebrow} title={shiftSection.title} />
        <div className="mt-12 hidden grid-cols-2 gap-6 text-[11px] font-semibold uppercase tracking-[0.2em] sm:grid">
          <p className="text-faint">{shiftSection.beforeLabel}</p>
          <p className="text-ember-1">{shiftSection.afterLabel}</p>
        </div>
        <ul className="mt-6 flex flex-col gap-4 sm:mt-4">
          {shiftSection.rows.map((row, i) => (
            <Reveal key={row.after} as="li" delay={i * 80} className="grid items-center gap-2 sm:grid-cols-2 sm:gap-6">
              <p className="w-fit max-w-full rounded-2xl rounded-bl-md bg-hairline/70 px-4 py-3 text-sm leading-relaxed text-muted">
                <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-faint sm:hidden">{shiftSection.beforeLabel}</span>
                {row.before}
              </p>
              <p className="flex items-start gap-3 rounded-2xl border border-ember-2/25 bg-background/70 px-4 py-3 text-sm leading-relaxed">
                <span className="ember-gradient mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-background" aria-hidden>
                  ✓
                </span>
                <span>
                  <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-ember-1 sm:hidden">{shiftSection.afterLabel}</span>
                  {row.after}
                </span>
              </p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ShopShowcase() {
  const [main, ...side] = showcase.photos;
  return (
    <section id={showcase.id} className="scroll-mt-20">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:px-10 lg:py-32">
        <div>
          <KitHeading eyebrow={showcase.eyebrow} title={showcase.title} subtitle={showcase.subtitle} />
          <Reveal as="div" delay={120} className="mt-8 grid grid-cols-3 gap-4 border-t border-hairline pt-6">
            {showcase.points.map((point) => (
              <div key={point.label}>
                <p className="kit-display ember-text whitespace-nowrap text-3xl sm:text-4xl">{point.value}</p>
                <p className="mt-1.5 text-xs leading-snug text-muted sm:text-sm">{point.label}</p>
              </div>
            ))}
          </Reveal>
          <Reveal delay={200} className="mt-8">
            <a
              href={showcase.href}
              className="ember-gradient group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-background shadow-[0_12px_40px_-12px_var(--ember-2)] transition-transform hover:scale-[1.03] lg:text-base"
            >
              {showcase.ctaLabel}
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </a>
          </Reveal>
        </div>
        <Reveal delay={120} className="grid grid-cols-[1.3fr_1fr] gap-3 sm:gap-4">
          <a href={showcase.href} className="group relative row-span-2 overflow-hidden rounded-[2rem] border border-hairline">
            <Image
              src={main.src}
              alt={main.alt}
              width={720}
              height={900}
              sizes="(max-width: 1024px) 60vw, 30vw"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none"
            />
            <span className="absolute inset-x-3 bottom-3 rounded-2xl bg-background/85 px-3 py-2 text-xs font-semibold backdrop-blur-sm">
              {showcase.host}
            </span>
          </a>
          {side.map((photo) => (
            <div key={photo.src} className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] border border-hairline">
              <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 1024px) 40vw, 20vw" className="object-cover" />
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* Mise en route : quatre étapes reliées par un filet braise. */
export function ShopSetup() {
  return (
    <section id={setupSection.id} className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10 lg:py-28">
        <KitHeading eyebrow={setupSection.eyebrow} title={setupSection.title} subtitle={setupSection.subtitle} />
        <ol className="relative mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <span aria-hidden className="ember-gradient absolute inset-x-8 top-[2.1rem] hidden h-px opacity-50 lg:block" />
          {setupSection.steps.map((step, i) => (
            <Reveal key={step.title} as="li" delay={i * 100} className="kit-card relative flex flex-col gap-3 rounded-3xl border border-hairline bg-surface p-6">
              <span className="ember-gradient kit-display flex size-11 items-center justify-center rounded-2xl text-lg text-background">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-lg font-bold leading-snug">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{step.description}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function ShopFeatures() {
  return (
    <section id={featuresSection.id} className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10 lg:py-28">
        <KitHeading eyebrow={featuresSection.eyebrow} title={featuresSection.title} subtitle={featuresSection.subtitle} />
        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          {featuresSection.groups.map((group, i) => (
            <Reveal key={group.title} as="article" delay={i * 120} className="kit-card relative overflow-hidden rounded-3xl border border-hairline bg-surface p-7 lg:p-9">
              <div aria-hidden className="absolute -right-16 -top-16 size-48 rounded-full bg-ember-2/15 blur-3xl" />
              <h3 className="kit-display relative text-3xl">{group.title}</h3>
              <ul className="relative mt-6 flex flex-col gap-3">
                {group.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed">
                    <span className="mt-0.5 text-ember-1" aria-hidden>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ShopPricing() {
  const { offer } = pricingSection;
  return (
    <section id={pricingSection.id} className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10 lg:py-32">
        <KitHeading eyebrow={pricingSection.eyebrow} title={pricingSection.title} subtitle={pricingSection.subtitle} center />
        <Reveal className="relative mx-auto mt-12 grid max-w-4xl gap-8 overflow-hidden rounded-[2rem] border border-ember-2/40 bg-surface p-7 shadow-lg shadow-ember-2/5 lg:mt-16 lg:grid-cols-2 lg:p-10">
          <div className="shop-ribbon-motif absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_70%_80%_at_0%_0%,black,transparent)]" aria-hidden />
          <div className="relative flex flex-col gap-6">
            <div>
              <h3 className="kit-display text-3xl">{offer.name}</h3>
              <p className="mt-1 text-sm text-muted">{offer.tagline}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: pricingSection.setupLabel, price: offer.setupPrice, unit: pricingSection.onceLabel },
                { label: pricingSection.monthlyLabel, price: offer.monthlyPrice, unit: pricingSection.perMonth },
              ].map((line) => (
                <div key={line.label} className="rounded-2xl border border-hairline bg-background/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">{line.label}</p>
                  {offer.published && line.price > 0 ? (
                    <p className="mt-2 flex items-baseline gap-1.5">
                      <span className="kit-display ember-text text-4xl">{line.price} €</span>
                      <span className="text-sm text-faint">{line.unit}</span>
                    </p>
                  ) : (
                    <p className="kit-display ember-text mt-2 text-3xl">{pricingSection.quoteLabel}</p>
                  )}
                </div>
              ))}
            </div>
            {!offer.published && <p className="text-sm leading-relaxed text-muted">{pricingSection.quoteHint}</p>}
            <a
              href={pricingSection.cta.href}
              className="ember-gradient w-fit rounded-full px-7 py-3.5 text-sm font-bold text-background transition-transform hover:scale-[1.03]"
            >
              {pricingSection.cta.label}
            </a>
          </div>
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{pricingSection.featuresLabel}</p>
            <ul className="mt-3 flex flex-col gap-3">
              {offer.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm leading-relaxed">
                  <span className="mt-0.5 text-ember-1" aria-hidden>✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted">
          {pricingSection.guarantees.map((g) => (
            <span key={g} className="flex items-center gap-1.5">
              <span className="text-ember-1" aria-hidden>✓</span>
              {g}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ShopFinalCta() {
  return (
    <KitFinalCta
      id={finalCta.id}
      title={finalCta.title}
      subtitle={finalCta.subtitle}
      primary={finalCta.primary}
      secondary={finalCta.secondary}
      microcopy={finalCta.microcopy}
    />
  );
}

export function ShopFaq() {
  return <KitFaq id={faqSection.id} eyebrow={faqSection.eyebrow} title={faqSection.title} items={faqSection.items} />;
}

/* La page se termine sur le formulaire : les questions se posent ici, sans changer de site. */
export function ShopContact() {
  return (
    <section id={contactSection.id} className="relative scroll-mt-20 overflow-hidden border-t border-hairline">
      <div className="kit-grid absolute inset-0" aria-hidden />
      <div className="kit-aura absolute inset-0 opacity-40" aria-hidden />
      <div className="relative mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10">
        <KitHeading eyebrow={contactSection.eyebrow} title={contactSection.title} subtitle={contactSection.subtitle} center />
        <Reveal className="mt-10">
          <LeadForm copy={contactSection.form} source="shop" locale="fr" />
        </Reveal>
        <p className="mt-6 text-center text-xs text-muted">
          {contactSection.emailLabel}{" "}
          <a href={`mailto:${contactEmail}`} className="font-semibold text-foreground transition-colors hover:text-ember-1">
            {contactEmail}
          </a>
        </p>
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
          {[...nav.links, nav.login].map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>
        <nav aria-label="Documents légaux" className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-muted">
          © 2026 Ominin{editor.siren && ` · SIREN ${editor.siren}`}
        </p>
      </div>
    </footer>
  );
}
