import type { CSSProperties } from "react";
import { OmininMark } from "@/components/pitch/brand";
import { buttonPrimary, buttonSecondary } from "@/components/pitch/buttons";
import { PhoneFrame } from "@/components/pitch/devices";
import { FilmOpener } from "@/components/pitch/film-opener";
import { FilmPlayer } from "@/components/pitch/film-player";
import { MobileContactBar } from "@/components/pitch/mobile-contact-bar";
import { container, Eyebrow, h2, lead, NewTab, PitchFooter, RaceBars, Section, SourceNote, SourcesList } from "@/components/pitch/page-sections";
import { QrCode } from "@/components/pitch/qr-code";
import { club, clubSources } from "@/lib/pitch/club";
import { pitchUi } from "@/lib/pitch/kit";

/*
 * La page du pitch aux clubs : le récit du film, à lire au téléphone. Elle
 * reprend la mise en page du kit (Section, Eyebrow, les cadres, le film, la
 * course, les sources) et n'ajoute que ce qu'un club demande : les
 * faisceaux, les six gestes du client, les bénéfices et les questions d'un
 * gérant de club.
 */

const c = club;

/** Des lyres au plafond : chaque faisceau, sa couleur, son balayage et sa vitesse. */
const BEAMS = [
  { left: "2%", beam: "var(--club-violet)", from: "18deg", to: "-6deg", speed: "11s" },
  { left: "24%", beam: "var(--pitch-accent-text)", from: "-14deg", to: "12deg", speed: "14s" },
  { left: "46%", beam: "var(--club-cyan)", from: "8deg", to: "-18deg", speed: "9s" },
  { left: "70%", beam: "var(--pitch-accent-text)", from: "-10deg", to: "16deg", speed: "13s" },
];

/** Les faisceaux ; ils ne balaient qu'en tête de page (moving), ailleurs ils restent posés. */
function Lights({ moving = false, className = "" }: { moving?: boolean; className?: string }) {
  return (
    <div aria-hidden className={`club-lights ${moving ? "club-lights-moving" : ""} ${className}`}>
      <div className="club-haze" />
      {BEAMS.map((b) => (
        <span
          key={b.left}
          className="club-beam"
          style={{ left: b.left, "--beam": b.beam, "--from": b.from, "--to": b.to, "--speed": b.speed } as CSSProperties}
        />
      ))}
    </div>
  );
}

function Title({ text, accent }: { text: string; accent: string }) {
  return (
    <h2 className={`${h2} mt-4`}>
      {text} <span className="mark">{accent}</span>
    </h2>
  );
}

function Hero() {
  const { hero } = c;
  return (
    <section className="relative overflow-hidden">
      <Lights moving />
      <header className={`${container} relative flex items-center justify-between py-5`}>
        <OmininMark className="text-[24px] md:text-[28px]" />
        <a href={c.contact.mailto} className="hidden min-h-10 items-center rounded-full border border-(--pitch-line) px-5 text-sm font-semibold transition-colors hover:border-(--pitch-accent) sm:inline-flex">
          {c.contact.label}
        </a>
      </header>
      <div className={`${container} relative pb-16 pt-8 md:pb-24 md:pt-14`}>
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_240px]">
          <div>
            <Eyebrow>{hero.eyebrow}</Eyebrow>
            <h1 className="mt-5 text-[46px] font-bold leading-[1.04] tracking-[-0.045em] sm:text-[72px] lg:text-[74px] xl:text-[80px]">
              <span className="block">{hero.title.first}</span>
              <span className="block">
                {hero.title.second} <span className="mark">{hero.title.accent}</span>
              </span>
            </h1>
            <p className={`${lead} mt-6 max-w-2xl`}>{hero.lead}</p>
            <ul className="mt-8 grid max-w-4xl grid-cols-[auto_1fr] gap-x-4 gap-y-3 sm:grid-cols-3 sm:gap-8">
              {hero.facts.map((fact) => (
                <li key={fact.label} className="col-span-2 grid grid-cols-subgrid items-center sm:col-span-1 sm:block">
                  <p className="whitespace-nowrap font-numeral text-4xl leading-none md:text-5xl">{fact.value}</p>
                  <p className="text-sm font-medium leading-snug text-(--pitch-muted) sm:mt-2">{fact.label}</p>
                </li>
              ))}
            </ul>
            <div id="hero-actions" className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <a href="#demo" className={buttonPrimary}>
                {pitchUi.tryDemo}
              </a>
              <a href={c.contact.mailto} className={buttonSecondary}>
                {c.contact.label}
              </a>
            </div>
          </div>
          <PhoneFrame src={hero.screen.src} alt={hero.screen.alt} sizes="240px" className="hidden w-full rotate-[4deg] shadow-[0_0_90px_color-mix(in_srgb,var(--club-cyan)_18%,transparent)] lg:block" />
        </div>
        <div id="film" className="mt-12 scroll-mt-4 md:mt-16">
          <FilmPlayer src={c.film.wide} poster={c.film.poster.src} alt={c.film.poster.alt} />
        </div>
      </div>
    </section>
  );
}

function Problem() {
  const { problem } = c;
  return (
    <Section>
      <div className={`${container} club-reveal`}>
        <Eyebrow>{problem.eyebrow}</Eyebrow>
        <Title {...problem.title} />
        <p className={`${lead} mt-6 max-w-3xl`}>{problem.lead}</p>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {problem.points.map((point, i) => (
            <li key={point.title} className="rounded-3xl bg-(--pitch-surface) p-6 md:p-8">
              <p className="font-numeral text-5xl leading-none text-(--pitch-faint)">0{i + 1}</p>
              <p className="mt-5 text-xl font-bold leading-snug">{point.title}</p>
              <p className="mt-2 leading-relaxed text-(--pitch-muted)">{point.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-(--pitch-muted)">{problem.study}</p>
        <SourceNote sources={clubSources} ids={problem.sources} className="mt-1" />
      </div>
    </Section>
  );
}

function Steps() {
  const { steps } = c;
  return (
    <Section id="parcours" className="overflow-hidden">
      <div className={`${container} club-reveal`}>
        <Eyebrow>{steps.eyebrow}</Eyebrow>
        <Title {...steps.title} />
        <p className={`${lead} mt-6 max-w-2xl`}>{steps.lead}</p>
      </div>
      {/* Au téléphone, une rangée qui défile (au clavier aussi), la carte suivante visible au bord ; en bureau, deux rangées de trois. */}
      <ol
        tabIndex={0}
        aria-label={`${steps.title.text} ${steps.title.accent}`}
        className="mx-auto mt-10 flex w-full max-w-6xl snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto px-5 pb-2 md:scroll-px-8 md:px-8 lg:mt-14 lg:grid lg:grid-cols-3 lg:gap-x-10 lg:gap-y-14 lg:overflow-visible"
      >
        {steps.items.map((step, i) => (
          <li key={step.title} className="w-[72%] shrink-0 snap-start sm:w-[42%] lg:w-auto">
            <PhoneFrame src={step.screen.src} alt={step.screen.alt} sizes="(min-width: 1024px) 300px, 72vw" className="mx-auto w-full max-w-[300px]" />
            <p className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-2">
              <span aria-hidden className="font-numeral text-3xl leading-none text-(--pitch-faint)">{i + 1}</span>
              <span className="text-xl font-bold">{step.title}</span>
              {step.soon && <span className="club-soon self-center">{c.soonTag}</span>}
              <span aria-hidden className="ml-auto text-sm tabular-nums text-(--pitch-faint) lg:hidden">
                {i + 1}/{steps.items.length}
              </span>
            </p>
            <p className="mt-2 text-pretty leading-relaxed text-(--pitch-muted)">{step.text}</p>
          </li>
        ))}
      </ol>
      {steps.items.some((step) => step.soon) && (
        <div className={container}>
          <p className="mt-10 flex max-w-3xl items-start gap-3 text-sm leading-relaxed text-(--pitch-muted)">
            <span className="club-soon mt-0.5 shrink-0">{c.soonTag}</span>
            {steps.soonNote}
          </p>
        </div>
      )}
    </Section>
  );
}

function Benefits() {
  const { benefits } = c;
  return (
    <Section className="overflow-hidden">
      <Lights className="opacity-60" />
      <div className={`${container} club-reveal relative`}>
        <Eyebrow>{benefits.eyebrow}</Eyebrow>
        <Title {...benefits.title} />
        <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {benefits.items.map((item, i) => (
            <li
              key={item.title}
              className={`rounded-3xl border border-(--pitch-line) bg-(--pitch-surface)/80 p-6 backdrop-blur-sm md:p-8 ${i === 0 ? "lg:row-span-2 lg:flex lg:flex-col lg:justify-end lg:bg-(--pitch-accent) lg:text-(--pitch-on-accent)" : ""}`}
            >
              <p className={`text-xl font-bold leading-snug ${i === 0 ? "lg:text-4xl lg:tracking-[-0.03em]" : ""}`}>{item.title}</p>
              <p className={`mt-2 leading-relaxed text-(--pitch-muted) ${i === 0 ? "lg:mt-4 lg:text-lg lg:text-(--pitch-on-accent)/75" : ""}`}>{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function Proof() {
  const { proof } = c;
  return (
    <Section>
      <div className={`${container} club-reveal`}>
        <Eyebrow>{proof.eyebrow}</Eyebrow>
        <Title {...proof.title} />
        <p className={`${lead} mt-6 max-w-3xl`}>{proof.context}</p>
        <p className="mt-10 text-[11px] font-bold uppercase tracking-[0.18em] text-(--pitch-faint) md:text-xs">{proof.raceLabel}</p>
        <RaceBars race={proof.race} />
        <p className="mt-10 text-2xl font-bold tracking-[-0.02em] md:text-3xl">{proof.takeaway}</p>
        <SourceNote sources={clubSources} ids={proof.sources} className="mt-4" />
      </div>
    </Section>
  );
}

function Demo() {
  const { demoSection: d } = c;
  return (
    <Section id="demo">
      <div className={`${container} club-reveal grid items-center gap-12 lg:grid-cols-[1fr_320px] lg:gap-20`}>
        <div className="flex flex-col items-start">
          <Eyebrow>{pitchUi.demoEyebrow}</Eyebrow>
          <h2 className={`${h2} mt-4`}>{d.title}</h2>
          <p className={`${lead} mt-5 max-w-2xl`}>{d.lead}</p>
          <a href={c.demo.href} target="_blank" rel="noopener" className={`${buttonPrimary} mt-8 gap-2`}>
            {pitchUi.demoOpen}
            <NewTab />
          </a>
          <p className="mt-3 text-sm text-(--pitch-faint)">{c.demo.display}</p>
        </div>
        <div className="hidden flex-col items-center lg:flex">
          <div className="rounded-[28px] bg-(--pitch-accent) p-7 text-(--pitch-on-accent) shadow-[0_0_80px_color-mix(in_srgb,var(--club-cyan)_18%,transparent)]">
            <QrCode value={c.demo.href} label={`QR code vers ${c.demo.display}`} className="size-60" />
          </div>
          <p className="mt-5 text-sm font-semibold">{pitchUi.demoScan}</p>
        </div>
      </div>
    </Section>
  );
}

function Faq() {
  const { faq } = c;
  return (
    <Section>
      <div className={`${container} club-reveal grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16`}>
        <div>
          <Eyebrow>{faq.eyebrow}</Eyebrow>
          <Title {...faq.title} />
        </div>
        <dl className="flex flex-col">
          {faq.items.map((item) => (
            <div key={item.question} className="border-b border-(--pitch-line) py-5 first:pt-0">
              <dt className="text-lg font-bold leading-snug">{item.question}</dt>
              <dd className="mt-2 leading-relaxed text-(--pitch-muted)">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}

function Pricing() {
  const { pricing } = c;
  const { example } = pricing;
  return (
    <Section className="overflow-hidden">
      <div className={`${container} club-reveal`}>
        <Eyebrow>{pricing.eyebrow}</Eyebrow>
        <h2 className="mt-4 text-[34px] font-bold leading-[1.08] tracking-[-0.045em] sm:text-[52px] lg:text-[60px]">
          <span className="block">{pricing.title.first}</span>
          <span className="block">
            <span className="mark mark-start">{pricing.title.accent}</span> {pricing.title.rest}
          </span>
        </h2>
        <p className={`${lead} mt-5 max-w-3xl`}>{pricing.lead}</p>
        <div className="mt-10 grid gap-4 lg:grid-cols-[0.9fr_1.3fr] lg:gap-8">
          <div className="self-start rounded-3xl bg-(--pitch-surface) p-6 md:p-8">
            <p className="font-semibold">{example.label}</p>
            <dl className="mt-4 flex flex-col gap-2">
              {example.lines.map((line) => (
                <div key={line.label} className="flex justify-between gap-4 text-(--pitch-muted)">
                  <dt>{line.label}</dt>
                  <dd className="shrink-0 tabular-nums">{line.value}</dd>
                </div>
              ))}
              <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-dashed border-(--pitch-line) pt-3">
                <dt className="font-bold">{example.totalLabel}</dt>
                <dd className="text-right">
                  <span className="block font-numeral text-5xl leading-none">{example.total}</span>
                  <span className="mt-1 block text-xs text-(--pitch-faint)">{example.share}</span>
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-sm leading-relaxed text-(--pitch-faint)">{example.note}</p>
          </div>
          <ul className="flex flex-col">
            {pricing.items.map((item) => (
              <li key={item} className="flex gap-3 border-b border-(--pitch-line) py-4 font-medium leading-relaxed">
                <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-(--club-cyan)" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <SourceNote sources={clubSources} ids={pricing.sources} className="mt-5" />
      </div>
    </Section>
  );
}

function Closing() {
  const { closing } = c;
  return (
    <Section id="closing" className="overflow-hidden">
      <Lights className="opacity-80" />
      <div className={`${container} club-reveal relative grid items-center gap-12 lg:grid-cols-[1fr_260px] lg:gap-20`}>
        <div className="flex flex-col items-start">
          <Eyebrow>{closing.eyebrow}</Eyebrow>
          <Title {...closing.title} />
          <ol className="mt-8 flex flex-col gap-3">
            {closing.steps.map((step, i) => (
              <li key={step} className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-(--pitch-accent) font-numeral">{i + 1}</span>
                <span className="font-semibold">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-8 grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            <a href={c.contact.mailto} className={buttonPrimary}>
              {c.contact.label}
            </a>
            <a href={c.contact.mailto} className="inline-flex min-h-11 items-center justify-center text-sm text-(--pitch-muted) underline decoration-(--pitch-line) underline-offset-4 sm:ml-2">
              {c.contact.email}
            </a>
          </div>
        </div>
        <div className="flex flex-col items-center text-center">
          <p className="hidden text-sm font-semibold lg:block">{closing.scan}</p>
          <div className="mt-4 hidden rounded-[24px] bg-(--pitch-accent) p-5 text-(--pitch-on-accent) lg:block">
            <QrCode value={c.demo.href} label={`QR code vers ${c.demo.display}`} className="size-40" />
          </div>
          <a href={c.demo.href} target="_blank" rel="noopener" className={`${buttonSecondary} mt-5 gap-2`}>
            {pitchUi.demoOpen}
            <NewTab />
          </a>
          <p className="mt-3 text-xs text-(--pitch-faint)">{c.demo.display}</p>
        </div>
      </div>
    </Section>
  );
}

export function ClubPitchPage() {
  return (
    <>
      <FilmOpener
        wide={c.film.wide}
        vertical={c.film.vertical}
        poster={c.film.poster.src}
        posterVertical={c.film.posterVertical}
        seenKey={c.filmSeenKey}
        copy={{ ...pitchUi.opener, label: c.film.label }}
      />
      <MobileContactBar watch="hero-actions" until="closing" demoHref="#demo" demoLabel={pitchUi.demoShort} mailHref={c.contact.mailto} mailLabel={c.contact.label} />
      <main className="flex-1">
        <Hero />
        <Problem />
        <Steps />
        <Benefits />
        <Proof />
        <Demo />
        <Faq />
        <Pricing />
        <Closing />
        <SourcesList sources={clubSources} note={c.sourcesNote} />
      </main>
      <PitchFooter text={c.footer} />
    </>
  );
}
