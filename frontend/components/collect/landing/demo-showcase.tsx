"use client";

import { CollectDemoStage } from "@/components/collect/demo/stage";
import { collectDemoHref } from "@/lib/collect/shared";
import { useHostAwareHref } from "@/lib/collect/use-host-href";
import { demoSection } from "@/lib/collect-landing-data";
import { CollectHeading } from "./heading";

/*
 * Vitrine de la démo sur la landing, jouable en place. Desktop : la scène
 * double (téléphone + dashboard). Mobile : un volet à la fois — la scène
 * double ne tient pas sous lg.
 */
export function CollectDemoShowcase() {
  const demoHref = useHostAwareHref(collectDemoHref, "/collect/demo");

  return (
    <section id={demoSection.id} className="scroll-mt-20 border-y border-hairline bg-surface/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
        <CollectHeading
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

        {/* Mobile : la même démo, un volet à la fois, jouable en place. */}
        <div className="mt-10 lg:hidden">
          <p className="mb-4 text-center">
            <span className="rounded-full border border-hairline bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
              {demoSection.badge}
            </span>
          </p>
          <CollectDemoStage variant="switch" />
          <p className="mt-6 text-center">
            <a
              href={demoHref}
              className="ember-gradient inline-block rounded-full px-5 py-2.5 text-sm font-semibold text-background"
            >
              {demoSection.fullscreenLabel}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
