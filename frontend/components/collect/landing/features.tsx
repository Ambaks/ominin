import { comparisonSection, featuresSection } from "@/lib/collect-landing-data";
import { CollectHeading } from "./heading";
import { Reveal } from "./reveal";

/** Les deux commissions côte à côte, à l'échelle : ce que dit « jusqu'à 6× ». */
function RateBars() {
  const { platform, ominin } = comparisonSection;
  const rows = [
    { label: platform.label, rate: platform.rate, ember: false },
    { label: ominin.label, rate: ominin.rate, ember: true },
  ];
  return (
    <Reveal className="mt-7 flex flex-col gap-3 lg:mt-0">
      {rows.map((row) => (
        <div key={row.label}>
          <p className="flex justify-between text-xs font-semibold text-muted">
            <span>{row.label}</span>
            <span className="tabular-nums">{Math.round(row.rate * 100)}&nbsp;%</span>
          </p>
          <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-hairline">
            <div
              className={`collect-bar h-full rounded-full ${row.ember ? "ember-gradient" : "bg-faint"}`}
              style={{ width: `${(row.rate / platform.rate) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </Reveal>
  );
}

export function CollectFeatures() {
  return (
    <section id={featuresSection.id} className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-24 sm:px-6 lg:px-10 lg:pb-12 lg:pt-32">
        <CollectHeading eyebrow={featuresSection.eyebrow} title={featuresSection.title} />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuresSection.features.map((feature, i) => (
            <Reveal
              key={feature.title}
              as="article"
              delay={(i % 3) * 100}
              className={`collect-card relative overflow-hidden rounded-3xl border border-hairline bg-surface p-7 ${
                feature.wide ? "sm:col-span-2" : ""
              } ${
                // Dernière carte seule sur sa rangée à deux colonnes : pleine largeur.
                i === featuresSection.features.length - 1 ? "sm:max-lg:col-span-2" : ""
              }`}
            >
              <div
                aria-hidden
                className="absolute -right-16 -top-16 size-48 rounded-full bg-ember-2/15 blur-3xl"
              />
              <div className={i === 0 ? "relative grid items-end gap-x-10 lg:grid-cols-2" : "relative"}>
                <div>
                  <p className="collect-display ember-text whitespace-nowrap text-5xl lg:text-6xl">
                    {"statPrefix" in feature && (
                      <span className="mr-2 align-middle text-xl tracking-tight lg:text-2xl">{feature.statPrefix}</span>
                    )}
                    {feature.stat}
                  </p>
                  <h3 className="mt-6 text-lg font-bold">{feature.title}</h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{feature.description}</p>
                </div>
                {i === 0 && <RateBars />}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
