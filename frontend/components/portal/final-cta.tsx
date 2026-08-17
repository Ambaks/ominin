"use client";

import Link from "next/link";
import { Reveal } from "@/components/portal/reveal";
import { useLanguage } from "@/lib/portal/language";
import { finalCta } from "@/lib/portal-data";

/*
 * Bande finale : une carte pleine largeur qui reprend le langage des cubes
 * (bordure, surface, trame calque en filigrane, lueur montante) et referme le
 * portail sur l'appel au sur-mesure.
 */
export function PortalFinalCta() {
  const { t } = useLanguage();

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-24 lg:max-w-6xl lg:px-10 lg:pb-32">
      <Reveal className="relative overflow-hidden rounded-2xl border border-hairline bg-surface px-6 py-14 text-center lg:py-20">
        <div
          className="grid-motif pointer-events-none absolute inset-0 opacity-35 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
          aria-hidden
        />
        <div
          className="ember-glow pointer-events-none absolute inset-x-0 bottom-0 h-2/3 rotate-180"
          aria-hidden
        />

        <div className="relative mx-auto max-w-2xl">
          <h2 className="font-display text-3xl leading-tight font-medium text-balance sm:text-4xl">
            {t(finalCta.titleLead)}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted lg:text-base">
            {t(finalCta.body)}
          </p>
          <Link
            href={finalCta.cta.href}
            className="ember-gradient mt-8 inline-block rounded-full px-7 py-3.5 text-sm font-semibold text-background"
          >
            {t(finalCta.cta.label)}
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
