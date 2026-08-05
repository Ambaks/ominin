"use client";

import { CollectDemoStage } from "@/components/collect/demo/stage";
import { SectionHeading } from "@/components/landing/section-heading";
import { collectDemoHref } from "@/lib/collect/shared";
import { useHostAwareHref } from "@/lib/collect/use-host-href";
import { demoSection } from "@/lib/collect-landing-data";

/*
 * Vitrine de la démo sur la landing. Desktop : la scène double (téléphone +
 * dashboard) jouable en place. Mobile : une carte d'appel vers la démo plein
 * écran — la scène double ne tient pas sous lg.
 */
export function CollectDemoShowcase() {
  const demoHref = useHostAwareHref(collectDemoHref, "/collect/demo");

  return (
    <section id={demoSection.id} className="scroll-mt-20 border-t border-hairline">
      <div className="mx-auto w-full max-w-2xl px-5 py-16 lg:max-w-5xl lg:px-10 lg:py-24">
        <SectionHeading
          eyebrow={demoSection.eyebrow}
          title={demoSection.title}
          subtitle={demoSection.subtitle}
          center
        />

        {/* Desktop : scène double jouable */}
        <div className="relative mt-12 hidden overflow-hidden rounded-3xl border border-hairline lg:mt-16 lg:block">
          <div
            className="collect-dash-motif absolute inset-0 [mask-image:radial-gradient(ellipse_90%_100%_at_50%_0%,black,transparent)]"
            aria-hidden
          />
          <div className="ember-glow absolute inset-0" aria-hidden />
          <div className="relative p-8 lg:p-10">
            <div className="mb-6 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.28em] text-faint">
              <span>{demoSection.customerLabel}</span>
              <span className="rounded-full border border-hairline bg-surface px-3 py-1 tracking-wider text-muted">
                {demoSection.badge}
              </span>
              <span>{demoSection.restaurantLabel}</span>
            </div>
            <CollectDemoStage variant="dual" />
          </div>
        </div>
        <div className="mt-6 hidden text-center lg:block">
          <a
            href={demoHref}
            className="text-sm font-semibold text-ember-1 transition-opacity hover:opacity-80"
          >
            {demoSection.fullscreenLabel} →
          </a>
        </div>

        {/* Mobile : carte d'appel vers la démo plein écran */}
        <a
          href={demoHref}
          className="relative mt-10 block overflow-hidden rounded-3xl border border-hairline transition-colors hover:border-ember-2/40 lg:hidden"
        >
          <div
            className="collect-dash-motif absolute inset-0 [mask-image:radial-gradient(ellipse_80%_90%_at_50%_0%,black,transparent)]"
            aria-hidden
          />
          <div className="ember-glow absolute inset-0" aria-hidden />
          <div className="relative flex flex-col items-center gap-3 px-6 py-10 text-center">
            <span className="rounded-full border border-hairline bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
              {demoSection.badge}
            </span>
            <p className="font-display text-xl font-medium">
              {demoSection.mobileTitle}
            </p>
            <p className="max-w-xs text-sm leading-relaxed text-muted">
              {demoSection.mobileHint}
            </p>
            <span className="ember-gradient mt-2 rounded-full px-5 py-2.5 text-xs font-semibold text-background">
              {demoSection.fullscreenLabel}
            </span>
          </div>
        </a>
      </div>
    </section>
  );
}
