"use client";

import { useState } from "react";
import { comparisonSection } from "@/lib/collect-landing-data";
import { KitHeading } from "@/components/landing-kit/heading";
import { Reveal } from "@/components/landing-kit/reveal";

/*
 * Comparatif interactif : un curseur (ventes à emporter mensuelles) pilote
 * deux barres de coût — plateforme de livraison vs Ominin Collect — et le
 * montant d'économies annuelles. Barres : braise = nous, gris neutre = eux
 * (choix délibéré, l'identité est toujours portée par le libellé + la
 * valeur en texte, jamais par la couleur seule).
 */

const euros = (amount: number) =>
  `${Math.round(amount).toLocaleString("fr-FR")} €`;

function CostBar({
  label,
  rateLabel,
  value,
  share,
  ember,
}: {
  label: string;
  rateLabel: string;
  value: number;
  share: number;
  ember?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="text-sm font-semibold">
          {label}{" "}
          <span className="text-xs font-normal text-faint">· {rateLabel}</span>
        </p>
        <p className="kit-display text-xl tabular-nums">
          {euros(value)}
          <span className="text-xs text-faint">/mois</span>
        </p>
      </div>
      <div className="h-3 overflow-hidden rounded-full border border-hairline bg-background/60">
        <div
          className={`h-full origin-left rounded-full transition-transform duration-500 ease-out motion-reduce:transition-none ${
            ember ? "ember-gradient" : "bg-faint"
          }`}
          style={{ transform: `scaleX(${share})` }}
        />
      </div>
    </div>
  );
}

export function CollectComparison() {
  const { slider, platform, ominin } = comparisonSection;
  const [revenue, setRevenue] = useState(slider.initial);

  const platformCost = revenue * platform.rate;
  const omininCost = ominin.monthlyFee + revenue * ominin.rate;
  const savingsPerYear = Math.max(0, (platformCost - omininCost) * 12);

  return (
    <section
      id={comparisonSection.id}
      className="scroll-mt-20"
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:px-10 lg:py-32">
        <KitHeading
          eyebrow={comparisonSection.eyebrow}
          title={comparisonSection.title}
          subtitle={comparisonSection.subtitle}
        />

        <Reveal className="relative overflow-hidden rounded-[2rem] border border-hairline bg-surface">
          <div
            className="collect-dash-motif absolute inset-0 [mask-image:radial-gradient(ellipse_90%_100%_at_50%_0%,black,transparent)]"
            aria-hidden
          />
          <div className="ember-glow absolute inset-0" aria-hidden />

          <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-8 p-6 lg:p-10">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <label
                  htmlFor="collect-comparison-revenue"
                  className="text-sm font-medium"
                >
                  {comparisonSection.sliderLabel}
                </label>
                <span className="kit-display text-3xl tabular-nums text-ember-1">
                  {euros(revenue)}
                  <span className="text-sm text-faint">/mois</span>
                </span>
              </div>
              <input
                id="collect-comparison-revenue"
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={revenue}
                onChange={(event) => setRevenue(Number(event.target.value))}
                className="w-full accent-ember-1"
              />
              <div className="flex justify-between text-xs tabular-nums text-muted">
                <span>{euros(slider.min)}</span>
                <span>{euros(slider.max)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <CostBar
                label={platform.label}
                rateLabel={platform.rateLabel}
                value={platformCost}
                share={1}
              />
              <CostBar
                label={ominin.label}
                rateLabel={ominin.rateLabel}
                value={omininCost}
                share={Math.min(1, omininCost / platformCost)}
                ember
              />
            </div>

            <div className="flex flex-col items-center gap-1 border-t border-hairline pt-6 text-center">
              <p className="kit-display ember-text text-6xl tabular-nums lg:text-7xl">
                {euros(savingsPerYear)}
              </p>
              <p className="text-sm font-semibold">
                {comparisonSection.savingsLabel}
              </p>
              <p className="text-xs text-muted">{comparisonSection.savingsHint}</p>
            </div>

            <p className="text-center text-xs leading-relaxed text-muted">
              {comparisonSection.disclaimer}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
