import type { ReactNode } from "react";
import { KitHeading } from "@/components/landing-kit/heading";
import { Reveal } from "@/components/landing-kit/reveal";
import { proofSection } from "@/lib/menu-landing-data";

/*
 * Les chiffres de la plaquette (pages 5 et 6) : le relevé d'un vrai
 * bar-restaurant, trois enseignements en graphiques, puis les études.
 */

const { field, peak, wait, hour } = proofSection;
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
const longestWait = Math.max(...wait.bars.map((bar) => bar.seconds));
const bestHour = Math.max(...hour.rows.map((row) => row.euros));

function Insight({ eyebrow, title, body, children, delay }: { eyebrow: string; title: string; body: string; children: ReactNode; delay: number }) {
  return (
    <Reveal as="li" delay={delay} className="g-glass flex p-g-pad">
      <div className="g-plate flex flex-1 flex-col p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-ember-1">{eyebrow}</p>
        <h3 className="mt-3 text-lg font-bold leading-snug">{title}</h3>
        <div className="mt-6 flex flex-1 flex-col justify-end">{children}</div>
        <p className="mt-5 text-sm leading-relaxed text-muted">{body}</p>
      </div>
    </Reveal>
  );
}

export function MenuProof() {
  return (
    <section id={proofSection.id} className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10">
        <KitHeading eyebrow={proofSection.eyebrow} title={proofSection.title} />

        <Reveal className="g-glass mt-12 p-g-pad">
          <dl className="grid gap-g-pad sm:grid-cols-2 lg:grid-cols-4">
            {field.map((stat) => (
              <div key={stat.label} className="g-plate flex flex-col-reverse justify-end gap-3 p-6">
                <dt className="text-sm leading-relaxed text-muted">{stat.label}</dt>
                <dd className="kit-display ember-text text-5xl tabular-nums">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <ul className="mt-g-gap grid gap-g-gap lg:grid-cols-3">
          <Insight eyebrow={peak.eyebrow} title={peak.title} body={peak.body} delay={0}>
            <p className="kit-display ember-text text-[5.5rem] leading-none">{peak.value}</p>
          </Insight>

          <Insight eyebrow={wait.eyebrow} title={wait.title} body={wait.body} delay={100}>
            <figure>
              <div className="flex h-36 items-end gap-1.5" role="img" aria-label={wait.bars.map((bar) => `${bar.load} : ${clock(bar.seconds)}`).join(", ")}>
                {wait.bars.map((bar) => (
                  <div key={bar.load} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    <span className={`text-[11px] font-semibold tabular-nums ${bar.over ? "text-ember-3" : "text-muted"}`}>{clock(bar.seconds)}</span>
                    <span
                      className={`w-full rounded-t-md ${bar.over ? "bg-ember-3" : "menu-bar-calm"}`}
                      style={{ height: `${(bar.seconds / longestWait) * 78}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-1.5 border-t border-hairline pt-2" aria-hidden>
                {wait.bars.map((bar) => (
                  <span key={bar.load} className="flex-1 text-center text-[11px] tabular-nums text-faint">
                    {bar.load}
                  </span>
                ))}
              </div>
              <figcaption className="mt-1 text-center text-[11px] text-faint">{wait.axis}</figcaption>
            </figure>
          </Insight>

          <Insight eyebrow={hour.eyebrow} title={hour.title} body={hour.body} delay={200}>
            <figure className="flex flex-col gap-4">
              {hour.rows.map((row) => (
                <div key={row.label}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-muted">{row.label}</span>
                    <span className="kit-display text-2xl tabular-nums">{row.euros}&nbsp;€</span>
                  </div>
                  <span
                    className="mt-1.5 block h-2.5 rounded-full ember-gradient"
                    style={{ width: `${(row.euros / bestHour) * 100}%` }}
                    aria-hidden
                  />
                </div>
              ))}
              <figcaption className="text-[11px] text-faint">{hour.caption}</figcaption>
            </figure>
          </Insight>
        </ul>

        <Reveal className="mt-16">
          <h3 className="text-lg font-bold">{proofSection.studiesTitle}</h3>
        </Reveal>
        <ul className="mt-5 grid gap-g-gap lg:grid-cols-3">
          {proofSection.studies.map((study, i) => (
            <Reveal key={study.value} as="li" delay={i * 100} className="g-glass flex p-g-pad">
              <div className="g-plate flex flex-1 flex-col p-6">
                <p className="kit-display ember-text text-4xl">{study.value}</p>
                <p className="mt-4 flex-1 text-sm leading-relaxed">{study.body}</p>
                <p className="mt-4 text-xs leading-relaxed text-faint">{study.source}</p>
              </div>
            </Reveal>
          ))}
        </ul>
        <p className="mt-6 text-xs text-faint">{proofSection.disclaimer}</p>
      </div>
    </section>
  );
}
