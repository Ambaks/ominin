import type { ReactNode } from "react";
import { OmininMark, PartnerMarks, Rays, TicketCard } from "@/components/pitch/brand";
import { buttonPrimary, buttonSecondary } from "@/components/pitch/buttons";
import { BrowserFrame, PhoneFrame, TabletFrame } from "@/components/pitch/devices";
import { FilmPlayer } from "@/components/pitch/film-player";
import { MobileContactBar } from "@/components/pitch/mobile-contact-bar";
import { QrCode } from "@/components/pitch/qr-code";
import {
  closing,
  contact,
  cover,
  deckPdfHref,
  demoDisplayUrl,
  demos,
  deployment,
  etaNotice,
  filmSrc,
  forCustomers,
  forHeadOffice,
  forRevenue,
  forTeams,
  growth,
  pageCopy,
  pricing,
  promise,
  proposal,
  rush,
  screens,
  solution,
  sources,
  sourcesLabel,
  sourcesNote,
  walkAway,
  type SourceId,
} from "@/lib/pitch/o-crousti-poulet";

/*
 * La page privée : le récit de la présentation, resserré pour se lire au
 * téléphone (le fondateur l'ouvrira sans doute là) et respirer en bureau.
 * Mêmes données, mêmes marques que les diapositives.
 */

const deckHref = deckPdfHref ?? "/o-crousti-poulet/presentation";
const deckLabel = deckPdfHref ? pageCopy.ctaDeck : pageCopy.ctaDeckWeb;

const container = "mx-auto w-full max-w-6xl px-5 md:px-8";
const h2 = "text-balance text-[38px] font-extrabold leading-[1.06] tracking-[-0.04em] sm:text-[52px] lg:text-[68px]";
const lead = "text-pretty text-[17px] leading-relaxed text-(--ocp-muted) md:text-xl";

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow text-[11px] tracking-[0.18em]! text-(--ocp-muted) md:text-xs md:tracking-[0.28em]!">{children}</p>;
}

function SourceNote({ ids, className = "" }: { ids: SourceId[]; className?: string }) {
  return (
    <p className={`text-[13px] leading-relaxed text-(--ocp-faint) md:text-sm ${className}`}>
      {sourcesLabel(ids.length)}
      {ids.map((id) => sources[id].short).join(" · ")}
    </p>
  );
}

function Section({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`relative scroll-mt-4 border-t border-(--ocp-line) py-14 md:py-24 ${className}`}>
      {children}
    </section>
  );
}

function PointList({ points }: { points: readonly { title: string; text: string }[] }) {
  return (
    <ul className="mt-8 flex flex-col gap-6">
      {points.map((point) => (
        <li key={point.title} className="border-l-[3px] border-(--ocp-yellow) pl-5">
          <p className="text-lg font-bold leading-snug md:text-xl">{point.title}</p>
          <p className="mt-1 text-pretty leading-relaxed text-(--ocp-muted)">{point.text}</p>
        </li>
      ))}
    </ul>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <Rays cx={50} cy={4} className="opacity-70" />
      <header className={`${container} relative flex items-center justify-between py-5`}>
        <PartnerMarks className="text-[21px] md:text-[26px]" />
        <a href={contact.mailto} className="hidden text-sm font-semibold text-(--ocp-muted) hover:text-(--ocp-white) sm:block">
          {closing.mail}
        </a>
      </header>
      <div className={`${container} relative pb-16 pt-8 md:pb-24 md:pt-14`}>
        <Eyebrow>{pageCopy.heroEyebrow}</Eyebrow>
        <h1 className="mt-5 text-[46px] font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-[68px] lg:text-[104px]">
          <span className="block">{cover.title.first}</span>
          <span className="block">
            {cover.title.second.text} <span className="mark">{cover.title.second.accent}</span>
          </span>
        </h1>
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div>
            <p className={`${lead} mt-6 max-w-2xl`}>{pageCopy.heroLead}</p>
            <ul className="mt-8 flex max-w-4xl flex-col gap-3 sm:grid sm:grid-cols-[1fr_1.6fr_1fr] sm:gap-8">
              {pageCopy.heroFacts.map((fact) => (
                <li key={fact.label} className="flex items-center gap-4 sm:block">
                  <p className="w-[7.5rem] shrink-0 whitespace-nowrap font-anton text-4xl leading-none text-(--ocp-yellow) sm:w-auto md:text-5xl">{fact.value}</p>
                  <p className="text-sm font-medium leading-snug text-(--ocp-muted) sm:mt-2">{fact.label}</p>
                </li>
              ))}
            </ul>
            <div id="hero-actions" className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <a href="#demo" className={buttonPrimary}>
                {pageCopy.tryDemo}
              </a>
              <a href={deckHref} className={buttonSecondary}>
                {deckLabel}
              </a>
            </div>
          </div>
          <TicketCard number={42} className="mr-6 mt-16 hidden rotate-[5deg] text-[36px] lg:block" />
        </div>
        <div className="mt-10 md:mt-14">
          <FilmPlayer src={filmSrc} poster={screens.poster.src} alt={screens.poster.alt} />
        </div>
      </div>
    </section>
  );
}

function Demo() {
  const client = demos[0];
  return (
    <Section id="demo">
      <div className={`${container} grid items-center gap-12 lg:grid-cols-[1fr_340px] lg:gap-20`}>
        <div>
          <Eyebrow>{pageCopy.demoEyebrow}</Eyebrow>
          <h2 className={`${h2} mt-4`}>{pageCopy.demoTitle}</h2>
          <p className={`${lead} mt-5 max-w-2xl`}>{pageCopy.demoLead}</p>
          <ul className="mt-8 flex flex-col gap-3">
            {demos.map((demo) => (
              <li key={demo.id}>
                <a
                  href={demo.href}
                  target="_blank"
                  rel="noopener"
                  className="group flex items-center gap-5 rounded-2xl border border-(--ocp-line) bg-(--ocp-surface) px-5 py-4 transition-colors hover:border-(--ocp-yellow)"
                >
                  <span className="flex min-w-0 flex-1 flex-col md:flex-row md:items-baseline md:gap-4">
                    <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.2em] text-(--ocp-yellow) md:w-32">{demo.label}</span>
                    <span className="min-w-0">
                      <span className="block text-lg font-bold leading-snug">{demo.title}</span>
                      <span className="block text-sm leading-relaxed text-(--ocp-muted)">{demo.description}</span>
                    </span>
                  </span>
                  <span aria-hidden className="text-xl text-(--ocp-yellow) transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="hidden flex-col items-center lg:flex">
          <div className="rounded-[28px] bg-(--ocp-yellow) p-7 text-(--ocp-black) shadow-[0_0_80px_rgba(247,238,33,0.15)]">
            <QrCode value={client.href} label={`QR code vers ${demoDisplayUrl}`} className="size-64" />
          </div>
          <p className="mt-5 text-sm font-semibold">{pageCopy.demoScan}</p>
          <p className="mt-1 text-xs text-(--ocp-faint)">{demoDisplayUrl}</p>
        </div>
      </div>
    </Section>
  );
}

function Story() {
  return (
    <>
      <Section>
        <div className={container}>
          <Eyebrow>{growth.eyebrow}</Eyebrow>
          <h2 className={`${h2} mt-4`}>«&nbsp;{growth.quote}&nbsp;»</h2>
          <p className="mt-3 text-sm text-(--ocp-faint)">— {growth.quoteSource}</p>
          <p className="mt-10 text-[11px] font-bold uppercase tracking-[0.24em] text-(--ocp-faint) md:mt-14 md:text-xs">{growth.unit}</p>
          <ol className="mt-3 grid grid-cols-3 gap-4 md:gap-10">
            {growth.steps.map((step, i) => (
              <li key={step.value}>
                <p
                  className={`font-anton text-[64px] leading-[0.85] sm:text-[110px] lg:text-[170px] ${
                    i === 2 ? "text-(--ocp-yellow)" : i === 0 ? "text-(--ocp-faint)" : ""
                  }`}
                >
                  {step.value}
                </p>
                <p className="mt-3 border-t border-(--ocp-line) pt-3 text-sm font-semibold leading-snug md:text-lg">{step.label}</p>
              </li>
            ))}
          </ol>
          <p className={`${lead} mt-10`}>{growth.scene}</p>
          <SourceNote ids={growth.sources} className="mt-5" />
        </div>
      </Section>

      <Section className="overflow-hidden">
        <Rays cx={20} cy={40} className="opacity-70" />
        <div className={`${container} relative`}>
          <Eyebrow>{promise.eyebrow}</Eyebrow>
        </div>
        <div className={`${container} relative mt-4 grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:items-center lg:gap-16`}>
          <div>
            <p className="text-[56px] font-extrabold leading-[1.02] tracking-[-0.05em] sm:text-[84px] lg:whitespace-nowrap lg:text-[88px]">
              <span className="block">«&nbsp;{promise.slogan[0]}</span>
              <span className="block text-(--ocp-yellow)">{promise.slogan[1]}&nbsp;»</span>
            </p>
            <p className="mt-4 text-sm text-(--ocp-faint)">— {promise.sloganSource}</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <p className="flex items-start gap-2">
                <span className="font-anton text-[88px] leading-[0.85] md:text-[120px]">{promise.rating.value}</span>
                <span aria-hidden className="text-4xl text-(--ocp-yellow)">★</span>
              </p>
              <p className="mt-3 text-(--ocp-muted)">{promise.rating.label}</p>
            </div>
            <div className="border-t border-(--ocp-line) pt-8 sm:border-t-0 sm:pt-0 lg:border-t lg:pt-8">
              <p className="font-anton text-[72px] leading-[0.85] text-(--ocp-yellow) md:text-[96px]">{promise.speed.value}</p>
              <p className="mt-3 text-(--ocp-muted)">{promise.speed.label}</p>
              <p className="mt-1 text-sm text-(--ocp-faint)">{promise.speed.detail}</p>
            </div>
          </div>
        </div>
        <div className={`${container} relative`}>
          <p className={`${lead} mt-12`}>{promise.closing}</p>
          <SourceNote ids={promise.sources} className="mt-5" />
        </div>
      </Section>

      <Section>
        <div className={container}>
          <Eyebrow>{rush.eyebrow}</Eyebrow>
          <h2 className={`${h2} mt-4`}>{pageCopy.rushTitle}</h2>
          <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.2em] text-(--ocp-faint)">{rush.evidence}</p>
          <ul className="mt-4 grid gap-4 md:grid-cols-3 md:gap-6">
            {rush.items.map((item) => (
              <li key={item.key} className="rounded-3xl bg-(--ocp-surface) p-6">
                <p className="text-lg font-bold md:min-h-14">{item.key}</p>
                <p className="mt-3 leading-relaxed text-(--ocp-muted)">
                  <span className="mr-2 font-anton text-4xl leading-none text-(--ocp-white)">{item.figure}</span>
                  {item.detail}
                </p>
              </li>
            ))}
          </ul>
          <SourceNote ids={rush.sources} className="mt-4" />
        </div>
      </Section>

      <Section>
        <div className={container}>
          <Eyebrow>{walkAway.eyebrow}</Eyebrow>
          <blockquote className="mt-6 max-w-4xl">
            <p className="text-balance text-[28px] font-bold leading-[1.18] tracking-[-0.03em] sm:text-[40px] lg:text-[52px]">
              «&nbsp;{walkAway.quote[0]} <span className="text-(--ocp-yellow)">{walkAway.quote[1]}</span>&nbsp;»
            </p>
            <footer className="mt-4 text-sm text-(--ocp-muted)">— {closing.signature}</footer>
          </blockquote>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {walkAway.facts.map((fact) => (
              <div key={fact.value} className="rounded-3xl bg-(--ocp-surface) p-6 md:p-8">
                <p className="font-anton text-[64px] leading-[0.85] md:text-[88px]">{fact.value}</p>
                <p className="mt-4 leading-relaxed text-(--ocp-muted)">{fact.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-2xl font-extrabold tracking-[-0.01em] text-(--ocp-yellow) md:text-3xl">{walkAway.followUp}</p>
          <SourceNote ids={walkAway.facts.map((fact) => fact.source)} className="mt-4" />
        </div>
      </Section>
    </>
  );
}

function Solution() {
  return (
    <Section className="overflow-hidden">
      <div className={container}>
        <Eyebrow>{solution.eyebrow}</Eyebrow>
        <h2 className={`${h2} mt-4`}>
          {solution.title.text} <span className="mark">{solution.title.accent}</span>
        </h2>
        <p className="mt-6 max-w-2xl border-l-[3px] border-(--ocp-yellow) pl-5 font-semibold leading-snug md:text-lg">{solution.note}</p>
      </div>
      {/* En bureau, un écran par étape. Au téléphone, ces écrans seraient illisibles : les étapes en
          texte, et le seul écran qui compte pour le client, « C'est prêt ! », à sa taille. */}
      <div className={`${container} mt-10 grid items-center gap-10 sm:grid-cols-[1fr_220px] lg:mt-12 lg:block`}>
        <ol className="flex flex-col gap-6 lg:grid lg:grid-cols-4 lg:gap-10">
          {solution.steps.map((step, i) => (
            <li key={step.title}>
              <PhoneFrame
                src={screens[step.screen].src}
                alt={screens[step.screen].alt}
                sizes="500px"
                className="hidden w-full max-w-[240px] lg:block"
              />
              <p className="flex items-baseline gap-3 lg:mt-5">
                <span className="font-anton text-3xl leading-none text-(--ocp-yellow)">{i + 1}</span>
                <span className="text-xl font-bold">{step.title}</span>
              </p>
              <p className="mt-2 text-pretty leading-relaxed text-(--ocp-muted)">{step.text}</p>
            </li>
          ))}
        </ol>
        <PhoneFrame
          src={screens.prete.src}
          alt={screens.prete.alt}
          sizes="(min-width: 640px) 220px, 240px"
          className="mx-auto w-full max-w-[240px] lg:hidden"
        />
      </div>
    </Section>
  );
}

function Benefits() {
  return (
    <>
      <Section>
        <div className={`${container} grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-x-16 lg:gap-y-0`}>
          <div>
            <Eyebrow>{forCustomers.eyebrow}</Eyebrow>
            <h2 className={`${h2} mt-4`}>
              <span className="lg:block">{forCustomers.title[0]}</span> <span className="lg:block">{forCustomers.title[1]}</span>
            </h2>
          </div>
          <div className="mx-auto w-full max-w-[200px] lg:row-span-2 lg:max-w-[340px] lg:self-center">
            <PhoneFrame src={screens.composer.src} alt={screens.composer.alt} sizes="(min-width: 1024px) 340px, 240px" className="w-full" />
          </div>
          <div>
            <ul className="flex flex-col gap-6 lg:mt-8 lg:gap-7">
              {forCustomers.points.map((point) => (
                <li key={point.title} className="grid grid-cols-[14px_1fr] gap-3 md:grid-cols-[24px_1fr]">
                  <span aria-hidden className="mt-2 size-2.5 rounded-full bg-(--ocp-yellow)" />
                  <div>
                    <p className="text-lg font-bold leading-snug md:text-xl">{point.title}</p>
                    {"text" in point && <p className="mt-1 text-pretty leading-relaxed text-(--ocp-muted)">{point.text}</p>}
                    <p className="mt-2 text-sm leading-relaxed text-(--ocp-faint)">{point.fact}</p>
                    {point.eta && (
                      <div className="mt-3 rounded-2xl border border-(--ocp-yellow)/45 bg-(--ocp-yellow)/[0.06] px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-(--ocp-lemon)">{etaNotice.tag}</p>
                        <p className="mt-1 text-sm leading-relaxed text-(--ocp-muted)">{etaNotice.text}</p>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-7 border-t border-(--ocp-line) pt-4 leading-relaxed text-(--ocp-muted)">
              <span className="font-bold text-(--ocp-white)">{forCustomers.scan.question}</span> {forCustomers.scan.answer}{" "}
              {forCustomers.scan.pilot}
            </p>
            <SourceNote ids={forCustomers.sources} className="mt-4" />
          </div>
        </div>
      </Section>

      <Section>
        <div className={container}>
          <div className="grid gap-x-16 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div>
              <Eyebrow>{forTeams.eyebrow}</Eyebrow>
              <h2 className={`${h2} mt-4`}>
                {forTeams.title.text} <span className="text-(--ocp-yellow)">{forTeams.title.accent}</span>
              </h2>
            </div>
            <PointList points={forTeams.points} />
          </div>
          <div className="mt-10 lg:mt-14">
            {/* L'écran du comptoir recadré pour rester lisible : la première rangée de commandes en
                bureau, une commande prête au téléphone (« Remettre N° 37 »). */}
            {(
              [
                ["hidden lg:block", { x: 28, y: 64, width: 1124, height: 350 }],
                ["lg:hidden", { x: 404, y: 64, width: 372, height: 350 }],
              ] as const
            ).map(([visibility, crop]) => (
              <TabletFrame
                key={visibility}
                src={screens.comptoir.src}
                alt={screens.comptoir.alt}
                sizes="(min-width: 1024px) 2400px, 320vw"
                crop={crop}
                className={`w-full ${visibility}`}
              />
            ))}
            <p className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-xs text-(--ocp-faint)">
              {forTeams.caption}
              <a href={demos[1].href} target="_blank" rel="noopener" className="text-sm font-semibold text-(--ocp-yellow)">
                {pageCopy.openDemo}
              </a>
            </p>
            <p className="mt-8 max-w-3xl border-t border-(--ocp-line) pt-5 text-sm leading-relaxed text-(--ocp-muted)">{forTeams.simple}</p>
            <SourceNote ids={forTeams.sources} className="mt-3" />
          </div>
        </div>
      </Section>

      <Section>
        <div className={container}>
          <Eyebrow>{forHeadOffice.eyebrow}</Eyebrow>
          <h2 className={`${h2} mt-4`}>{forHeadOffice.title}</h2>
          <p className="mt-5 max-w-3xl text-lg font-semibold leading-relaxed text-(--ocp-lemon) md:text-xl">{forHeadOffice.lead}</p>
          <div className="mt-10">
            {/* En bureau, la carte, les restaurants en rush et le fil des commandes, lisibles ; au téléphone, le classement du jour. */}
            {(
              [
                ["hidden lg:block", { x: 0, y: 344, width: 1192, height: 368 }],
                ["lg:hidden", { x: 1192, y: 344, width: 392, height: 436 }],
              ] as const
            ).map(([visibility, crop]) => (
              <BrowserFrame
                key={visibility}
                src={screens.reseau.src}
                alt={screens.reseau.alt}
                sizes="(min-width: 1024px) 1800px, 410vw"
                url={demos[2].href.replace(/^https?:\/\//, "").replace(/\?.*$/, "")}
                crop={crop}
                badge={forHeadOffice.badge}
                className={`w-full text-[11px] md:text-[13px] ${visibility}`}
              />
            ))}
            <p className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-xs text-(--ocp-faint)">
              <span className="lg:hidden">{forHeadOffice.rushKey}</span>
              <a href={demos[2].href} target="_blank" rel="noopener" className="text-sm font-semibold text-(--ocp-yellow)">
                {pageCopy.openDemo}
              </a>
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}

function Calculation() {
  return (
    <Section>
      <div className={container}>
        <Eyebrow>{forRevenue.eyebrow}</Eyebrow>
        <h2 className={`${h2} mt-4`}>{forRevenue.title}</h2>
        <p className={`${lead} mt-5 max-w-3xl`}>{forRevenue.mechanism}</p>
        <div className="mt-10 rounded-3xl border-2 border-dashed border-(--ocp-yellow)/45 p-6 md:p-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-(--ocp-lemon)">{forRevenue.illustrationLabel}</p>
          <p className="mt-2 text-sm text-(--ocp-muted)">{forRevenue.rateNote}</p>
          <ol className="mt-6 grid gap-8 md:grid-cols-3 md:gap-10">
            {forRevenue.sum.map((term) => (
              <li key={term.value}>
                <p className="font-anton text-[56px] leading-none text-(--ocp-yellow) md:text-[64px]">{term.value}</p>
                <p className="mt-2 text-lg font-bold">{term.unit}</p>
                <p className="mt-1 leading-relaxed text-(--ocp-muted)">{term.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 border-t border-(--ocp-line) pt-4 text-sm leading-relaxed text-(--ocp-muted)">{forRevenue.beyond}</p>
        </div>
        <SourceNote ids={forRevenue.sources} className="mt-5" />
      </div>
    </Section>
  );
}

function Deployment() {
  return (
    <Section>
      <div className={container}>
        <Eyebrow>{deployment.eyebrow}</Eyebrow>
        <h2 className={`${h2} mt-4`}>
          {deployment.title.text} <span className="text-(--ocp-yellow)">{deployment.title.accent}</span>
        </h2>
        <p className={`${lead} mt-5 max-w-3xl`}>{deployment.lead}</p>
        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {deployment.points.map((point) => (
            <li key={point.title} className="rounded-3xl bg-(--ocp-surface) p-6">
              <p className="eyebrow text-[11px] text-(--ocp-yellow)">{point.label}</p>
              <p className="mt-3 text-lg font-bold leading-snug">{point.title}</p>
              <p className="mt-2 text-pretty leading-relaxed text-(--ocp-muted)">{point.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

function Pricing() {
  const { example } = pricing;
  return (
    <Section className="overflow-hidden">
      <Rays cx={15} cy={20} className="opacity-70" />
      <div className={`${container} relative`}>
        <Eyebrow>{pricing.eyebrow}</Eyebrow>
        <h2 className="mt-4 text-[31px] font-extrabold leading-[1.08] tracking-[-0.04em] sm:text-[48px] lg:text-[50px]">
          <span className="block">{pricing.headline.subscription}</span>
          <span className="block lg:whitespace-nowrap">
            <span className="mark mark-start [word-spacing:0.12em]">{pricing.headline.commission}</span> {pricing.headline.basis}
          </span>
        </h2>
        <p className={`${lead} mt-5 max-w-3xl`}>{pricing.lead}</p>
        <div className="mt-10 grid gap-4 lg:grid-cols-[0.9fr_1.3fr] lg:gap-8">
          <div className="self-start rounded-3xl bg-(--ocp-surface) p-6 md:p-8">
            <p className="font-semibold">{example.label}</p>
            <p className="mt-0.5 text-sm text-(--ocp-lemon)">{example.rateNote}</p>
            <dl className="mt-4 flex flex-col gap-2">
              {example.lines.map((line) => (
                <div key={line.label} className="flex justify-between gap-4 text-(--ocp-muted)">
                  <dt>{line.label}</dt>
                  <dd className="tabular-nums">{line.value}</dd>
                </div>
              ))}
              <div className="mt-2 flex items-baseline justify-between border-t border-dashed border-(--ocp-line) pt-3">
                <dt className="font-bold">{example.totalLabel}</dt>
                <dd className="text-right">
                  <span className="block font-anton text-5xl leading-none text-(--ocp-yellow)">{example.total}</span>
                  <span className="mt-1 block text-xs text-(--ocp-faint)">{example.share}</span>
                </dd>
              </div>
              <div className="mt-1 flex justify-between gap-4 text-(--ocp-muted)">
                <dt>{example.counter.label}</dt>
                <dd className="shrink-0 tabular-nums">{example.counter.value}</dd>
              </div>
              <div className="flex justify-between gap-4 font-bold">
                <dt>{example.extra.label}</dt>
                <dd className="tabular-nums">{example.extra.value}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm leading-relaxed text-(--ocp-faint)">{example.compare}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-(--ocp-faint)">{pricing.comparisonTitle}</p>
            <dl className="mt-2">
              {pricing.comparison.map((row) => (
                <div key={row.name} className="flex flex-col gap-1 border-b border-(--ocp-line) py-4 sm:flex-row sm:gap-6">
                  <dt className="font-bold sm:w-52 sm:shrink-0">{row.name}</dt>
                  <dd className="text-(--ocp-muted)">{row.model}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-lg font-bold">{pricing.noOnline}</p>
            <p className="mt-3 text-sm leading-relaxed text-(--ocp-faint)">
              {pricing.cardFees} {pricing.vat}
            </p>
          </div>
        </div>
        <SourceNote ids={pricing.sources} className="mt-5" />
      </div>
    </Section>
  );
}

function Proposal() {
  const columns = [
    { ...proposal.pilot, tone: "bg-(--ocp-yellow) text-(--ocp-black)" },
    { ...proposal.network, tone: "bg-(--ocp-surface)" },
  ];
  return (
    <Section>
      <div className={container}>
        <Eyebrow>{proposal.eyebrow}</Eyebrow>
        <h2 className={`${h2} mt-4`}>{proposal.title}</h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_1fr_0.85fr]">
          {columns.map((column) => (
            <div key={column.title} className={`rounded-3xl p-6 md:p-8 ${column.tone}`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] opacity-70">{column.title}</p>
              <p className="mt-3 text-2xl font-extrabold leading-tight tracking-[-0.02em]">{column.lead}</p>
              <ul className="mt-5 flex flex-col gap-3">
                {column.points.map((point) => (
                  <li key={point} className="flex gap-3 font-medium leading-relaxed">
                    <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-current opacity-60" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="rounded-3xl border border-(--ocp-line) p-6 md:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-(--ocp-muted)">{proposal.measures.title}</p>
            <p className="mt-3 text-2xl font-extrabold leading-tight tracking-[-0.02em]">{proposal.measures.lead}</p>
            <ul className="mt-5 flex flex-col gap-3">
              {proposal.measures.points.map((point) => (
                <li key={point} className="flex gap-3 font-medium leading-relaxed">
                  <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-(--ocp-yellow)" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Section>
  );
}

function FinalCta() {
  return (
    <Section className="overflow-hidden">
      <Rays cx={50} cy={100} className="opacity-70" />
      <div className={`${container} relative grid items-center gap-12 lg:grid-cols-[1fr_300px] lg:gap-20`}>
        <div className="flex flex-col items-start">
          <Eyebrow>{closing.eyebrow}</Eyebrow>
          <h2 className={`${h2} mt-4`}>{closing.title.join(" ")}</h2>
          <ol className="mt-8 flex flex-col gap-3">
            {closing.steps.map((step, i) => (
              <li key={step} className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-(--ocp-yellow) font-anton text-(--ocp-yellow)">
                  {i + 1}
                </span>
                <span className="font-semibold">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-8 max-w-2xl font-medium leading-relaxed md:text-lg">{closing.reference}</p>
          <p className="mt-5 max-w-2xl font-semibold">{closing.interlocutor}</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-(--ocp-faint)">{closing.company}</p>
          <div className="mt-6 grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap">
            <a href={contact.mailto} className={buttonPrimary}>
              {closing.mail}
            </a>
            <a href={deckHref} className={buttonSecondary}>
              {deckLabel}
            </a>
          </div>
          <a href={contact.mailto} className="mt-3 text-sm text-(--ocp-muted) underline decoration-(--ocp-line) underline-offset-4">
            {contact.email}
          </a>
        </div>
        <div className="hidden flex-col items-center text-center lg:flex">
          <p className="text-sm font-semibold">{closing.scanPage}</p>
          <p className="font-neon mt-1 text-5xl leading-tight">{closing.neon}</p>
          <div className="mt-4 rounded-[28px] bg-(--ocp-yellow) p-6 text-(--ocp-black)">
            <QrCode value={demos[0].href} label={`QR code vers ${demoDisplayUrl}`} className="size-52" />
          </div>
        </div>
      </div>
    </Section>
  );
}

function Sources() {
  return (
    <section id="sources" className="scroll-mt-4 border-t border-(--ocp-line) py-12">
      <div className={container}>
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-(--ocp-muted)">
            {pageCopy.sourcesToggle}
            <span aria-hidden className="text-lg text-(--ocp-yellow) transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <ul className="mt-6 grid gap-4 text-sm leading-relaxed md:grid-cols-2 md:gap-x-10">
            {Object.values(sources).map((source) => (
              <li key={source.full}>
                <p>{source.full}</p>
                {"url" in source && source.url && (
                  <a href={source.url} target="_blank" rel="noopener" className="break-all text-xs text-(--ocp-faint) underline underline-offset-4">
                    {source.url}
                  </a>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-(--ocp-faint)">{sourcesNote}</p>
        </details>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-(--ocp-line) pb-28 pt-10 lg:pb-10">
      <div className={`${container} flex flex-col gap-4 text-sm text-(--ocp-faint) sm:flex-row sm:items-center sm:justify-between`}>
        <OmininMark className="text-[22px]" />
        <p>{pageCopy.footer}</p>
      </div>
    </footer>
  );
}

export function PitchPage() {
  return (
    <>
      <MobileContactBar watch="hero-actions" demoHref="#demo" demoLabel={pageCopy.demoShort} mailHref={contact.mailto} mailLabel={closing.mail} />
      <main className="flex-1">
        <Hero />
        <Demo />
        <Story />
        <Solution />
        <Benefits />
        <Deployment />
        <Pricing />
        <Calculation />
        <Proposal />
        <FinalCta />
        <Sources />
      </main>
      <Footer />
    </>
  );
}
