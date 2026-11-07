import Image from "next/image";
import type { ReactNode } from "react";
import { PartnerCycle, PartnerLockup, PartnerZone } from "@/components/landing/integration-showcase";
import { KitHeading } from "@/components/landing-kit/heading";
import { Reveal } from "@/components/landing-kit/reveal";
import { PaymentScene, TerminalScene, TillScene } from "@/components/menu-landing/scenes";
import { brand } from "@/lib/landing-data";
import { connectSection } from "@/lib/menu-landing-data";

/*
 * Paiement et caisse : « Ominin × Stripe » pour encaisser, frais détaillés
 * ligne par ligne, et « Ominin × HubRise » pour rejoindre la caisse du
 * restaurant. Chaque carte s'ouvre sur sa scène animée (scenes.tsx) ; celle
 * de la caisse, en panneau inversé comme le matériel, fait défiler les caisses.
 * Dessous, sur toute la largeur, le terminal Stripe : ses frais, et ce qu'il
 * apporte aux données (tout le chiffre par carte, comptoir compris).
 */

const { stripe, hubrise, terminal } = connectSection;
const { cycle } = hubrise;

type FeeLine = { label: string; value: string; ours: boolean; note?: string };

function Pair({ label, logo }: { label: string; logo: { src: string; bleed: boolean } }) {
  return (
    <p className="flex items-center gap-3 text-sm font-bold">
      <span className="flex items-center gap-1.5" aria-hidden>
        <span className="flex size-9 items-center justify-center rounded-lg border border-hairline bg-surface-raised">
          <Image src="/logo.png" alt="" width={22} height={22} />
        </span>
        <span className="text-xs text-muted">×</span>
        <span className="relative size-9 overflow-hidden rounded-lg bg-white ring-1 ring-black/10">
          <Image src={logo.src} alt="" fill sizes="36px" className={logo.bleed ? "object-cover" : "object-contain p-1"} />
        </span>
      </span>
      {label}
    </p>
  );
}

function Fees({
  title,
  lines,
  total,
  example,
  device,
  className = "",
}: {
  title: string;
  lines: readonly FeeLine[];
  total?: { label: string; value: string };
  example: string;
  device?: { title: string; lines: readonly { label: string; value: string }[] };
  className?: string;
}) {
  return (
    <div className={`rounded-g-card border border-hairline p-4 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{title}</p>
      <dl className="mt-3 flex flex-col gap-2.5 text-sm">
        {lines.map((line) => (
          <div key={line.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
            <dt className={line.ours ? "font-semibold" : "text-muted"}>
              {line.label}
              {line.note && <span className={`block text-[13px] font-normal ${line.ours ? "text-ember-1" : "text-faint"}`}>{line.note}</span>}
            </dt>
            <dd className={`ml-auto whitespace-nowrap font-bold tabular-nums ${line.ours ? "text-ember-1" : ""}`}>{line.value}</dd>
          </div>
        ))}
        {total && (
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-t border-hairline pt-2.5">
            <dt className="font-semibold">{total.label}</dt>
            <dd className="ml-auto whitespace-nowrap font-bold tabular-nums">{total.value}</dd>
          </div>
        )}
      </dl>
      <p className="mt-3 border-t border-hairline pt-3 text-[13px] text-muted">{example}</p>
      {device && (
        <div className="mt-3 border-t border-hairline pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{device.title}</p>
          <dl className="mt-2.5 flex flex-col gap-2 text-sm">
            {device.lines.map((line) => (
              <div key={line.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <dt className="text-muted">{line.label}</dt>
                <dd className="ml-auto whitespace-nowrap font-semibold">{line.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function Points({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-6 flex flex-col gap-2.5 text-sm">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <span aria-hidden className="mt-0.5 text-ember-1">
            ✓
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function Card({
  pair,
  scene,
  title,
  body,
  children,
  delay,
}: {
  pair: ReactNode;
  scene: ReactNode;
  title: string;
  body: string;
  children: ReactNode;
  delay: number;
}) {
  return (
    <Reveal delay={delay} className="g-glass flex p-g-pad">
      <div className="g-plate flex min-w-0 flex-1 flex-col p-5 sm:p-7">
        {pair}
        {/* Les scènes tiennent dès 360 px ; en deçà, le texte suffit. */}
        <div className="mt-6 max-[359px]:hidden">{scene}</div>
        <h3 className="kit-display mt-6 text-3xl lg:text-4xl">{title}</h3>
        <p className="mt-3 text-pretty text-sm leading-relaxed text-muted lg:text-base">{body}</p>
        {children}
      </div>
    </Reveal>
  );
}

export function MenuConnect() {
  return (
    <section id={connectSection.id} className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10">
        <KitHeading eyebrow={connectSection.eyebrow} title={connectSection.title} subtitle={connectSection.subtitle} />
        <div className="mt-12 grid gap-g-gap lg:grid-cols-2">
          <Card
            delay={0}
            title={stripe.title}
            body={stripe.body}
            pair={<Pair label={stripe.pair} logo={stripe.logo} />}
            scene={<PaymentScene />}
          >
            <Fees title={stripe.fees.title} lines={stripe.fees.lines} example={stripe.fees.example} className="mt-6" />
            <Points items={stripe.points} />
          </Card>

          <Card
            delay={100}
            title={hubrise.title}
            body={hubrise.body}
            pair={<Pair label={hubrise.pair} logo={hubrise.logo} />}
            scene={
              <div className="rounded-2xl bg-foreground p-4 text-background">
                <PartnerCycle count={cycle.names.length} intervalMs={cycle.intervalMs}>
                  <PartnerZone className="flex flex-col gap-4">
                    <PartnerLockup
                      brand={brand}
                      lead={<span className="whitespace-nowrap text-background/60 max-sm:hidden">{cycle.lead}</span>}
                      names={cycle.names}
                      icons={cycle.icons}
                      spoken={cycle.spoken}
                      controls={cycle.controls}
                    />
                    <TillScene />
                  </PartnerZone>
                </PartnerCycle>
              </div>
            }
          >
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Quelques caisses compatibles">
              {hubrise.tills.map((till) => (
                <li key={till.name} className="flex items-center gap-2 rounded-full border border-hairline bg-surface-raised py-1 pl-1 pr-3 text-xs font-semibold">
                  <span className="relative size-6 overflow-hidden rounded-full bg-white ring-1 ring-black/10">
                    <Image src={till.icon.src} alt="" fill sizes="24px" className={till.icon.bleed ? "object-cover" : "object-contain p-0.5"} />
                  </span>
                  {till.name}
                </li>
              ))}
            </ul>
            <Points items={hubrise.points} />
          </Card>
        </div>

        <Reveal className="g-glass mt-g-gap p-g-pad">
          {/* Ordinateur : deux colonnes, intro et données à gauche, scène et
              frais à droite. Téléphone : les colonnes s'effacent (contents)
              et l'ordre devient intro, scène, données, frais. */}
          <div className="g-plate grid gap-8 p-5 sm:p-7 lg:grid-cols-2 lg:gap-12 lg:p-9">
            <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-8">
              <div className="order-1 min-w-0 lg:order-none">
                <div className="flex flex-wrap items-center gap-3">
                  <Pair label={terminal.pair} logo={stripe.logo} />
                  <span className="rounded-full border border-ember-1/40 px-2.5 py-0.5 text-[11px] font-semibold text-ember-1">{terminal.badge}</span>
                </div>
                <h3 className="kit-display mt-6 text-balance text-3xl lg:text-4xl">{terminal.title}</h3>
                <p className="mt-3 text-pretty text-sm leading-relaxed text-muted lg:text-base">{terminal.body}</p>
                <p className="mt-6 flex items-center gap-4 rounded-g-card border border-hairline px-5 py-4">
                  <span className="kit-display ember-text shrink-0 text-5xl">{terminal.highlight.value}</span>
                  <span className="text-pretty text-sm leading-snug">{terminal.highlight.label}</span>
                </p>
              </div>
              <div className="order-3 flex min-w-0 flex-col rounded-g-card border border-hairline p-4 sm:p-5 lg:order-none lg:flex-1 lg:justify-between">
                <div>
                  <h3 className="text-balance text-lg font-bold leading-snug">{terminal.data.title}</h3>
                  <p className="mt-2 text-pretty text-sm leading-relaxed text-muted">{terminal.data.body}</p>
                </div>
                <dl className="mt-5 grid gap-2 text-sm">
                  {terminal.data.contrast.map((row) => (
                    <div key={row.label} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <dt className="w-32 shrink-0 text-muted">{row.label}</dt>
                      <dd className="flex gap-1.5">
                        {row.sources.map((source) => (
                          <span
                            key={source}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              row.sources.length > 1 ? "ember-gradient text-background" : "border border-hairline text-muted"
                            }`}
                          >
                            {source}
                          </span>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
                <Points items={terminal.data.points} />
              </div>
            </div>
            <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-8">
              <p className="sr-only">{terminal.sceneCaption}</p>
              <div className="order-2 min-w-0 max-[359px]:hidden lg:order-none">
                <TerminalScene />
              </div>
              <Fees
                title={terminal.fees.title}
                lines={terminal.fees.lines}
                total={terminal.fees.total}
                example={terminal.fees.example}
                device={terminal.fees.device}
                className="order-4 min-w-0 lg:order-none"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
