import type { ReactNode } from "react";
import { OmininMark, PartnerMarks, TicketCard, type BrandKit } from "@/components/pitch/brand";
import { buttonPrimary, buttonSecondary } from "@/components/pitch/buttons";
import { BrowserFrame, PhoneFrame, TabletFrame } from "@/components/pitch/devices";
import { FilmOpener } from "@/components/pitch/film-opener";
import { FilmPlayer } from "@/components/pitch/film-player";
import { MobileContactBar } from "@/components/pitch/mobile-contact-bar";
import { QrCode } from "@/components/pitch/qr-code";
import { pitchUi, raceBarWidth, sourcesLabel } from "@/lib/pitch/kit";
import type { Pitch } from "@/lib/pitch/types";

/*
 * La page privée : le récit de la présentation, resserré pour se lire au
 * téléphone (le fondateur l'ouvrira sans doute là) et respirer en bureau.
 * Mêmes données, mêmes marques que les diapositives.
 */

/** La présentation : son PDF quand il existe, sinon sa version web. */
const deck = (p: Pitch) => ({
  href: p.deckPdfHref ?? `${p.path}/presentation`,
  label: p.deckPdfHref ? pitchUi.ctaDeck : pitchUi.ctaDeckWeb,
});

type SectionProps = { p: Pitch; brand: BrandKit };

const container = "mx-auto w-full max-w-6xl px-5 md:px-8";
const h2 = "text-balance text-[38px] font-extrabold leading-[1.06] tracking-[-0.04em] sm:text-[52px] lg:text-[68px]";
const lead = "text-pretty text-[17px] leading-relaxed text-(--pitch-muted) md:text-xl";

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow text-[11px] tracking-[0.18em]! text-(--pitch-muted) md:text-xs md:tracking-[0.28em]!">{children}</p>;
}

function SourceNote({ p, ids, className = "" }: { p: Pitch; ids: string[]; className?: string }) {
  return (
    <p className={`text-[13px] leading-relaxed text-(--pitch-faint) md:text-sm ${className}`}>
      {sourcesLabel(new Set(ids).size)}
      {[...new Set(ids)].map((id) => p.sources[id].short).join(" · ")}
    </p>
  );
}

function Section({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`relative scroll-mt-4 border-t border-(--pitch-line) py-14 md:py-24 ${className}`}>
      {children}
    </section>
  );
}

/** La flèche des liens qui ouvrent une démo dans un nouvel onglet, et son équivalent lu. */
function NewTab({ className = "" }: { className?: string }) {
  return (
    <>
      <svg viewBox="0 0 24 24" aria-hidden className={`size-4 shrink-0 fill-none stroke-current ${className}`} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 17 17 7M9 7h8v8" />
      </svg>
      <span className="sr-only">{pitchUi.newTab}</span>
    </>
  );
}

function PointList({ points }: { points: readonly { title: string; text: string }[] }) {
  return (
    <ul className="mt-8 flex flex-col gap-6">
      {points.map((point) => (
        <li key={point.title} className="border-l-[3px] border-(--pitch-accent) pl-5">
          <p className="text-lg font-bold leading-snug md:text-xl">{point.title}</p>
          <p className="mt-1 text-pretty leading-relaxed text-(--pitch-muted)">{point.text}</p>
        </li>
      ))}
    </ul>
  );
}

function Hero({ p, brand }: SectionProps) {
  return (
    <section className="relative overflow-hidden">
      <brand.Backdrop cx={50} cy={4} className="opacity-70" />
      <header className={`${container} relative flex items-center justify-between py-5`}>
        <PartnerMarks brand={brand} className="text-[21px] md:text-[26px]" />
        <a href={p.contact.mailto} className="hidden text-sm font-semibold text-(--pitch-muted) hover:text-(--pitch-ink) sm:block">
          {p.closing.mail}
        </a>
      </header>
      <div className={`${container} relative pb-16 pt-8 md:pb-24 md:pt-14`}>
        <Eyebrow>{p.page.heroEyebrow}</Eyebrow>
        <h1 className="mt-5 text-[46px] font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-[68px] lg:text-[104px]">
          <span className="block">{p.cover.title.first}</span>
          <span className="block">
            {p.cover.title.second.text} <span className="mark">{p.cover.title.second.accent}</span>
          </span>
        </h1>
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div>
            <p className={`${lead} mt-6 max-w-2xl`}>{p.page.heroLead}</p>
            <ul className="mt-8 flex max-w-4xl flex-col gap-3 sm:grid sm:grid-cols-[1fr_1.6fr_1fr] sm:gap-8">
              {p.page.heroFacts.map((fact) => (
                <li key={fact.label} className="flex items-center gap-4 sm:block">
                  <p className="w-[7.5rem] shrink-0 whitespace-nowrap font-numeral text-4xl leading-none text-(--pitch-accent) sm:w-auto md:text-5xl">{fact.value}</p>
                  <p className="text-sm font-medium leading-snug text-(--pitch-muted) sm:mt-2">{fact.label}</p>
                </li>
              ))}
            </ul>
            <div id="hero-actions" className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <a href="#demo" className={buttonPrimary}>
                {pitchUi.tryDemo}
              </a>
              <a href={deck(p).href} className={buttonSecondary}>
                {deck(p).label}
              </a>
            </div>
          </div>
          <TicketCard brand={brand} name={p.brandName} number={p.ticketNumber} className="mr-6 mt-16 hidden rotate-[5deg] text-[36px] lg:block" />
        </div>
        <div className="mt-10 md:mt-14">
          <FilmPlayer src={p.filmSrc} poster={p.screens.poster.src} alt={p.screens.poster.alt} />
        </div>
      </div>
    </section>
  );
}

function Demo({ p }: SectionProps) {
  const client = p.demos[0];
  return (
    <Section id="demo">
      <div className={`${container} grid items-center gap-12 lg:grid-cols-[1fr_340px] lg:gap-20`}>
        <div>
          <Eyebrow>{pitchUi.demoEyebrow}</Eyebrow>
          <h2 className={`${h2} mt-4`}>{p.page.demoTitle}</h2>
          <p className={`${lead} mt-5 max-w-2xl`}>{p.page.demoLead}</p>
          {/* Chaque carte est un seul lien vers sa démo en ligne : le bouton jaune le dit, la carte entière réagit. */}
          <ul className="mt-8 flex flex-col gap-3">
            {p.demos.map((demo) => (
              <li key={demo.id}>
                <a
                  href={demo.href}
                  target="_blank"
                  rel="noopener"
                  aria-label={`${demo.label}, ${demo.title} : ${pitchUi.demoOpen.toLowerCase()} ${pitchUi.newTab}`}
                  className="group flex cursor-pointer flex-col gap-4 rounded-2xl border border-(--pitch-line) bg-(--pitch-surface) p-5 transition-[border-color,background-color,transform] duration-150 hover:-translate-y-0.5 hover:border-(--pitch-accent) hover:bg-(--pitch-raised) focus-visible:border-(--pitch-accent) active:translate-y-0 active:scale-[0.99] sm:flex-row sm:items-center sm:gap-6"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-(--pitch-accent-text)">
                      <span aria-hidden className="size-1.5 rounded-full bg-(--pitch-accent) shadow-[0_0_8px_var(--pitch-accent)]" />
                      {demo.label}
                    </span>
                    <span className="mt-2 min-w-0">
                      <span className="block text-balance text-lg font-bold leading-snug">{demo.title}</span>
                      <span className="block text-sm leading-relaxed text-(--pitch-muted)">{demo.description}</span>
                    </span>
                  </span>
                  <span className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-stretch rounded-full bg-(--pitch-accent) px-5 text-sm font-bold text-(--pitch-on-accent) transition-colors group-hover:bg-(--pitch-accent-light) sm:self-center">
                    {pitchUi.demoOpen}
                    <NewTab className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-start gap-2 text-xs text-(--pitch-faint)">
            <span aria-hidden className="mt-[0.45em] size-1.5 shrink-0 rounded-full bg-(--pitch-accent)" />
            {pitchUi.demoLive}
          </p>
        </div>
        <div className="hidden flex-col items-center lg:flex">
          <div className="pitch-qr rounded-[28px] bg-(--pitch-accent) p-7 text-(--pitch-on-accent) shadow-[0_0_80px_color-mix(in_srgb,var(--pitch-accent)_15%,transparent)]">
            <QrCode value={client.href} label={`QR code vers ${p.demoDisplayUrl}`} className="size-64" />
          </div>
          <p className="mt-5 text-sm font-semibold">{pitchUi.demoScan}</p>
          <p className="mt-1 text-xs text-(--pitch-faint)">{p.demoDisplayUrl}</p>
        </div>
      </div>
    </Section>
  );
}

function Story({ p, brand }: SectionProps) {
  return (
    <>
      <Section className="overflow-hidden">
        <brand.Backdrop cx={20} cy={40} className="opacity-70" />
        <div className={`${container} relative`}>
          <Eyebrow>{p.promise.eyebrow}</Eyebrow>
        </div>
        <div className={`${container} relative mt-4 grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:items-center lg:gap-16`}>
          <div>
            <p className="pitch-quote text-[56px] font-extrabold leading-[1.02] tracking-[-0.05em] sm:text-[84px] lg:whitespace-nowrap lg:text-[88px]">
              <span className="block">«&nbsp;{p.promise.slogan[0]}</span>
              <span className="block text-(--pitch-accent)">{p.promise.slogan[1]}&nbsp;»</span>
            </p>
            <p className="mt-4 text-sm text-(--pitch-faint)">— {p.promise.sloganSource}</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <p className="flex items-start gap-2">
                <span className="font-numeral text-[88px] leading-[0.85] md:text-[120px]">{p.promise.rating.value}</span>
                <span aria-hidden className="text-4xl text-(--pitch-accent)">★</span>
              </p>
              <p className="mt-3 text-(--pitch-muted)">{p.promise.rating.label}</p>
            </div>
            <div className="border-t border-(--pitch-line) pt-8 sm:border-t-0 sm:pt-0 lg:border-t lg:pt-8">
              <p className="font-numeral text-[72px] leading-[0.85] text-(--pitch-accent) md:text-[96px]">{p.promise.speed.value}</p>
              <p className="mt-3 text-(--pitch-muted)">{p.promise.speed.label}</p>
              <p className="mt-1 text-sm text-(--pitch-faint)">{p.promise.speed.detail}</p>
            </div>
          </div>
        </div>
        <div className={`${container} relative`}>
          <p className={`${lead} mt-12`}>{p.promise.closing}</p>
          <SourceNote p={p} ids={p.promise.sources} className="mt-5" />
        </div>
      </Section>

      <Section>
        <div className={container}>
          <Eyebrow>{p.walkAway.eyebrow}</Eyebrow>
          <blockquote className="mt-6 max-w-4xl">
            <p className="pitch-quote text-balance text-[28px] font-bold leading-[1.18] tracking-[-0.03em] sm:text-[40px] lg:text-[52px]">
              «&nbsp;{p.walkAway.quote[0]} <span className="text-(--pitch-accent)">{p.walkAway.quote[1]}</span>&nbsp;»
            </p>
            <footer className="mt-4 text-sm text-(--pitch-muted)">— {p.walkAway.attribution}</footer>
          </blockquote>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {p.walkAway.facts.map((fact) => (
              <div key={fact.value} className="rounded-3xl bg-(--pitch-surface) p-6 md:p-8">
                <p className="font-numeral text-[64px] leading-[0.85] md:text-[88px]">{fact.value}</p>
                <p className="mt-4 leading-relaxed text-(--pitch-muted)">{fact.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-2xl font-extrabold tracking-[-0.01em] text-(--pitch-ink) md:text-3xl">{p.walkAway.followUp}</p>
          <SourceNote p={p} ids={[...p.walkAway.facts.map((fact) => fact.source), ...(p.walkAway.followUpSources ?? [])]} className="mt-4" />
        </div>
      </Section>
    </>
  );
}

function Solution({ p }: SectionProps) {
  return (
    <Section className="overflow-hidden">
      <div className={container}>
        <Eyebrow>{p.solution.eyebrow}</Eyebrow>
        <h2 className={`${h2} mt-4`}>
          {p.solution.title.text} <span className="mark">{p.solution.title.accent}</span>
        </h2>
        <p className="mt-6 max-w-2xl border-l-[3px] border-(--pitch-accent) pl-5 font-semibold leading-snug md:text-lg">{p.solution.note}</p>
      </div>
      {/* En bureau, un écran par étape. Au téléphone, ces écrans seraient illisibles : les étapes en
          texte, et le seul écran qui compte pour le client, « C'est prêt ! », à sa taille. */}
      <div className={`${container} mt-10 grid items-center gap-10 sm:grid-cols-[1fr_220px] lg:mt-12 lg:block`}>
        <ol className="flex flex-col gap-6 lg:grid lg:grid-cols-4 lg:gap-10">
          {p.solution.steps.map((step, i) => (
            <li key={step.title}>
              <PhoneFrame
                src={p.screens[step.screen].src}
                alt={p.screens[step.screen].alt}
                sizes="500px"
                className="hidden w-full max-w-[240px] lg:block"
              />
              <p className="flex items-baseline gap-3 lg:mt-5">
                <span className="font-numeral text-3xl leading-none text-(--pitch-accent)">{i + 1}</span>
                <span className="text-xl font-bold">{step.title}</span>
              </p>
              <p className="mt-2 text-pretty leading-relaxed text-(--pitch-muted)">{step.text}</p>
            </li>
          ))}
        </ol>
        <PhoneFrame
          src={p.screens.prete.src}
          alt={p.screens.prete.alt}
          sizes="(min-width: 640px) 220px, 240px"
          className="mx-auto w-full max-w-[240px] lg:hidden"
        />
      </div>
    </Section>
  );
}

function Estimator({ p }: SectionProps) {
  const e = p.estimator;
  if (!e) return null;
  return (
    <Section className="overflow-hidden">
      <div className={`${container} grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-center lg:gap-16`}>
        <div>
          <Eyebrow>{e.eyebrow}</Eyebrow>
          <h2 className={`${h2} mt-4`}>
            {e.title.text} <span className="mark">{e.title.accent}</span>
          </h2>
          <p className={`${lead} mt-6`}>{e.lead}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3 md:gap-4">
            {[e.announced, e.ready].map((clock, i) => (
              <div key={clock.label} className="flex items-center gap-3 md:gap-4">
                {i > 0 && (
                  <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-(--pitch-accent) text-lg font-bold text-(--pitch-on-accent)">
                    =
                  </span>
                )}
                <div className={`rounded-2xl px-5 py-3 ${i ? "bg-(--pitch-accent) text-(--pitch-on-accent)" : "bg-(--pitch-surface)"}`}>
                  <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${i ? "" : "text-(--pitch-muted)"}`}>{clock.label}</p>
                  <p className="mt-1 font-numeral text-[52px] leading-[0.9] tabular-nums md:text-[64px]">{clock.value}</p>
                </div>
              </div>
            ))}
            <p className="w-full text-2xl font-extrabold tracking-[-0.02em] sm:w-auto md:text-3xl">{e.verdict}</p>
          </div>
          <PointList points={e.points} />
        </div>
        <PhoneFrame src={p.screens[e.screen].src} alt={p.screens[e.screen].alt} sizes="(min-width: 1024px) 320px, 240px" className="mx-auto w-full max-w-[240px] lg:max-w-[320px]" />
      </div>
    </Section>
  );
}

function FieldProof({ p }: SectionProps) {
  const f = p.fieldProof;
  if (!f) return null;
  const longest = Math.max(...f.race.map((lane) => lane.seconds));
  return (
    <Section>
      <div className={container}>
        <Eyebrow>{f.eyebrow}</Eyebrow>
        <h2 className={`${h2} mt-4`}>
          {f.title.text} <span className="mark">{f.title.accent}</span>
        </h2>
        <p className={`${lead} mt-6`}>{f.context}</p>
        <p className="mt-10 text-[11px] font-bold uppercase tracking-[0.18em] text-(--pitch-faint) md:text-xs">{f.raceLabel}</p>
        <div className="mt-4 flex flex-col gap-6">
          {f.race.map((lane, i) => (
            <div key={lane.label}>
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-bold md:text-lg">{lane.label}</p>
                <p className={`font-numeral text-[44px] leading-none tabular-nums md:text-[64px] ${i ? "" : "text-(--pitch-accent-text)"}`}>{lane.value}</p>
              </div>
              <div className="mt-2 h-3 rounded-full bg-(--pitch-surface) md:h-4">
                <div className={`h-full rounded-full ${i ? "bg-(--pitch-muted)" : "bg-(--pitch-accent)"}`} style={{ width: raceBarWidth(lane.seconds, longest) }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {f.facts.map((fact) => (
            <div key={fact.label} className="rounded-3xl bg-(--pitch-surface) p-6 md:p-8">
              <p className="font-numeral text-[56px] leading-[0.9] md:text-[72px]">{fact.value}</p>
              <p className="mt-3 leading-relaxed text-(--pitch-muted)">{fact.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-2xl font-extrabold tracking-[-0.01em] md:text-3xl">{f.takeaway}</p>
        <SourceNote p={p} ids={f.sources} className="mt-4" />
      </div>
    </Section>
  );
}

function Benefits({ p }: SectionProps) {
  return (
    <>
      <Section>
        <div className={`${container} grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-x-16 lg:gap-y-0`}>
          <div>
            <Eyebrow>{p.forCustomers.eyebrow}</Eyebrow>
            <h2 className={`${h2} mt-4`}>
              <span className="lg:block">{p.forCustomers.title[0]}</span> <span className="lg:block">{p.forCustomers.title[1]}</span>
            </h2>
          </div>
          <div className="mx-auto w-full max-w-[200px] lg:row-span-2 lg:max-w-[340px] lg:self-center">
            <PhoneFrame src={p.screens.composer.src} alt={p.screens.composer.alt} sizes="(min-width: 1024px) 340px, 240px" className="w-full" />
          </div>
          <div>
            <ul className="flex flex-col gap-6 lg:mt-8 lg:gap-7">
              {p.forCustomers.points.map((point) => (
                <li key={point.title} className="grid grid-cols-[14px_1fr] gap-3 md:grid-cols-[24px_1fr]">
                  <span aria-hidden className="mt-2 size-2.5 rounded-full bg-(--pitch-accent)" />
                  <div>
                    <p className="text-lg font-bold leading-snug md:text-xl">{point.title}</p>
                    {"text" in point && <p className="mt-1 text-pretty leading-relaxed text-(--pitch-muted)">{point.text}</p>}
                    <p className="mt-2 text-sm leading-relaxed text-(--pitch-faint)">{point.fact}</p>
                    {point.eta && (
                      <div className="mt-3 rounded-2xl border border-(--pitch-accent)/45 bg-(--pitch-accent)/[0.06] px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-(--pitch-accent-light)">{p.etaNotice.tag}</p>
                        <p className="mt-1 text-sm leading-relaxed text-(--pitch-muted)">{p.etaNotice.text}</p>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-7 border-t border-(--pitch-line) pt-4 leading-relaxed text-(--pitch-muted)">
              <span className="font-bold text-(--pitch-ink)">{p.forCustomers.scan.question}</span> {p.forCustomers.scan.answer}{" "}
              {p.forCustomers.scan.pilot}
            </p>
            <SourceNote p={p} ids={[...p.forCustomers.sources, ...(p.forCustomers.scan.sources ?? [])]} className="mt-4" />
          </div>
        </div>
      </Section>

      <Section>
        <div className={container}>
          <div className="grid gap-x-16 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div>
              <Eyebrow>{p.forTeams.eyebrow}</Eyebrow>
              <h2 className={`${h2} mt-4`}>
                {p.forTeams.title.text} <span className="text-(--pitch-accent)">{p.forTeams.title.accent}</span>
              </h2>
            </div>
            <PointList points={p.forTeams.points} />
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
                src={p.screens.comptoir.src}
                alt={p.screens.comptoir.alt}
                sizes="(min-width: 1024px) 2400px, 320vw"
                crop={crop}
                className={`w-full ${visibility}`}
              />
            ))}
            <p className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-xs text-(--pitch-faint)">
              {p.forTeams.caption}
              <a href={p.demos[1].href} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-(--pitch-accent-text)">
                {pitchUi.demoOpen}
                <NewTab />
              </a>
            </p>
            <p className="mt-8 max-w-3xl border-t border-(--pitch-line) pt-5 text-sm leading-relaxed text-(--pitch-muted)">{p.forTeams.simple}</p>
            <SourceNote p={p} ids={p.forTeams.sources} className="mt-3" />
          </div>
        </div>
      </Section>

      <Section>
        <div className={container}>
          <Eyebrow>{p.forHeadOffice.eyebrow}</Eyebrow>
          <h2 className={`${h2} mt-4`}>{p.forHeadOffice.title}</h2>
          <p className="mt-5 max-w-3xl text-lg font-semibold leading-relaxed text-(--pitch-accent-light) md:text-xl">{p.forHeadOffice.lead}</p>
          <div className="mt-10">
            {/* En bureau, la carte, les restaurants en rush et le fil des commandes, lisibles ; au téléphone, le classement du jour. */}
            {(
              [
                ["hidden lg:block", { x: 0, y: p.forHeadOffice.panelsTop, width: 1192, height: 368 }],
                ["lg:hidden", { x: p.forHeadOffice.areas[2].x - 8, y: p.forHeadOffice.panelsTop, width: 392, height: 436 }],
              ] as const
            ).map(([visibility, crop]) => (
              <BrowserFrame
                key={visibility}
                src={p.screens.reseau.src}
                alt={p.screens.reseau.alt}
                sizes="(min-width: 1024px) 1800px, 410vw"
                url={p.demos[2].href.replace(/^https?:\/\//, "").replace(/\?.*$/, "")}
                crop={crop}
                badge={p.forHeadOffice.badge}
                className={`w-full text-[11px] md:text-[13px] ${visibility}`}
              />
            ))}
            <p className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-xs text-(--pitch-faint)">
              <span>{[`${p.forHeadOffice.badge}.`, p.forHeadOffice.hypothesis, p.forHeadOffice.rushKey].filter(Boolean).join(" ")}</span>
              <a href={p.demos[2].href} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-(--pitch-accent-text)">
                {pitchUi.demoOpen}
                <NewTab />
              </a>
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}

function Calculation({ p }: SectionProps) {
  return (
    <Section>
      <div className={container}>
        <Eyebrow>{p.forRevenue.eyebrow}</Eyebrow>
        <h2 className={`${h2} mt-4`}>{p.forRevenue.title}</h2>
        <p className={`${lead} mt-5 max-w-3xl`}>{p.forRevenue.mechanism}</p>
        <div className="mt-10 rounded-3xl border-2 border-dashed border-(--pitch-accent)/45 p-6 md:p-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-(--pitch-accent-light)">{p.forRevenue.illustrationLabel}</p>
          <p className="mt-2 text-sm text-(--pitch-muted)">{p.forRevenue.rateNote}</p>
          <ol className="mt-6 grid gap-8 md:grid-cols-3 md:gap-10">
            {p.forRevenue.sum.map((term) => (
              <li key={term.value}>
                <p className="font-numeral text-[56px] leading-none text-(--pitch-accent) md:text-[64px]">{term.value}</p>
                <p className="mt-2 text-lg font-bold">{term.unit}</p>
                <p className="mt-1 leading-relaxed text-(--pitch-muted)">{term.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 border-t border-(--pitch-line) pt-4 text-sm leading-relaxed text-(--pitch-muted)">{p.forRevenue.beyond}</p>
        </div>
        <SourceNote p={p} ids={p.forRevenue.sources} className="mt-5" />
      </div>
    </Section>
  );
}

function Deployment({ p }: SectionProps) {
  return (
    <Section>
      <div className={container}>
        <Eyebrow>{p.deployment.eyebrow}</Eyebrow>
        <h2 className={`${h2} mt-4`}>
          {p.deployment.title.text} <span className="text-(--pitch-accent)">{p.deployment.title.accent}</span>
        </h2>
        <p className={`${lead} mt-5 max-w-3xl`}>{p.deployment.lead}</p>
        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {p.deployment.points.map((point) => (
            <li key={point.title} className="rounded-3xl bg-(--pitch-surface) p-6">
              <p className="eyebrow text-[11px] text-(--pitch-accent-text)">{point.label}</p>
              <p className="mt-3 text-lg font-bold leading-snug">{point.title}</p>
              <p className="mt-2 text-pretty leading-relaxed text-(--pitch-muted)">{point.text}</p>
            </li>
          ))}
        </ol>
        {p.deployment.sources && <SourceNote p={p} ids={p.deployment.sources} className="mt-5" />}
      </div>
    </Section>
  );
}

function Pricing({ p, brand }: SectionProps) {
  const { example } = p.pricing;
  return (
    <Section className="overflow-hidden">
      <brand.Backdrop cx={15} cy={20} className="opacity-70" />
      <div className={`${container} relative`}>
        <Eyebrow>{p.pricing.eyebrow}</Eyebrow>
        <h2 className="mt-4 text-[31px] font-extrabold leading-[1.08] tracking-[-0.04em] sm:text-[48px] lg:text-[50px]">
          <span className="block">{p.pricing.headline.subscription}</span>
          <span className="block xl:whitespace-nowrap">
            <span className="mark mark-start [word-spacing:0.12em]">{p.pricing.headline.commission}</span> {p.pricing.headline.basis}
          </span>
        </h2>
        <p className={`${lead} mt-5 max-w-3xl`}>{p.pricing.lead}</p>
        <div className="mt-10 grid gap-4 lg:grid-cols-[0.9fr_1.3fr] lg:gap-8">
          <div className="self-start rounded-3xl bg-(--pitch-surface) p-6 md:p-8">
            <p className="font-semibold">{example.label}</p>
            <p className="mt-0.5 text-sm text-(--pitch-accent-light)">{example.rateNote}</p>
            <dl className="mt-4 flex flex-col gap-2">
              {example.lines.map((line) => (
                <div key={line.label} className="flex justify-between gap-4 text-(--pitch-muted)">
                  <dt>{line.label}</dt>
                  <dd className="tabular-nums">{line.value}</dd>
                </div>
              ))}
              <div className="mt-2 flex items-baseline justify-between border-t border-dashed border-(--pitch-line) pt-3">
                <dt className="font-bold">{example.totalLabel}</dt>
                <dd className="text-right">
                  <span className="block font-numeral text-5xl leading-none text-(--pitch-accent)">{example.total}</span>
                  <span className="mt-1 block text-xs text-(--pitch-faint)">{example.share}</span>
                </dd>
              </div>
              <div className="mt-1 flex justify-between gap-4 text-(--pitch-muted)">
                <dt>{example.counter.label}</dt>
                <dd className="shrink-0 tabular-nums">{example.counter.value}</dd>
              </div>
              <div className="flex justify-between gap-4 font-bold">
                <dt>{example.extra.label}</dt>
                <dd className="tabular-nums">{example.extra.value}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm leading-relaxed text-(--pitch-faint)">{example.compare}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-(--pitch-faint)">{p.pricing.comparisonTitle}</p>
            <dl className="mt-2">
              {p.pricing.comparison.map((row) => (
                <div key={row.name} className="flex flex-col gap-1 border-b border-(--pitch-line) py-4 sm:flex-row sm:gap-6">
                  <dt className="font-bold sm:w-52 sm:shrink-0">{row.name}</dt>
                  <dd className="text-(--pitch-muted)">{row.model}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-lg font-bold">{p.pricing.noOnline}</p>
            {p.pricing.setup && <p className="mt-1 text-sm text-(--pitch-muted)">{p.pricing.setup}</p>}
            <p className="mt-3 text-sm leading-relaxed text-(--pitch-faint)">
              {p.pricing.cardFees} {p.pricing.vat}
            </p>
          </div>
        </div>
        <SourceNote p={p} ids={p.pricing.sources} className="mt-5" />
      </div>
    </Section>
  );
}

function Proposal({ p }: SectionProps) {
  const columns = [
    { ...p.proposal.pilot, tone: "bg-(--pitch-accent) text-(--pitch-on-accent)" },
    { ...p.proposal.network, tone: "bg-(--pitch-surface)" },
  ];
  return (
    <Section>
      <div className={container}>
        <Eyebrow>{p.proposal.eyebrow}</Eyebrow>
        <h2 className={`${h2} mt-4`}>{p.proposal.title}</h2>
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
          <div className="rounded-3xl border border-(--pitch-line) p-6 md:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-(--pitch-muted)">{p.proposal.measures.title}</p>
            <p className="mt-3 text-2xl font-extrabold leading-tight tracking-[-0.02em]">{p.proposal.measures.lead}</p>
            <ul className="mt-5 flex flex-col gap-3">
              {p.proposal.measures.points.map((point) => (
                <li key={point} className="flex gap-3 font-medium leading-relaxed">
                  <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-(--pitch-accent)" />
                  {point}
                </li>
              ))}
            </ul>
            {p.proposal.measures.vendor && (
              <p className="mt-5 border-t border-(--pitch-line) pt-4 font-semibold leading-relaxed">{p.proposal.measures.vendor}</p>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

function FinalCta({ p, brand }: SectionProps) {
  return (
    <Section id="closing" className="overflow-hidden">
      <brand.Backdrop cx={50} cy={100} className="opacity-70" />
      <div className={`${container} relative grid items-center gap-12 lg:grid-cols-[1fr_300px] lg:gap-20`}>
        <div className="flex flex-col items-start">
          <Eyebrow>{p.closing.eyebrow}</Eyebrow>
          <h2 className={`${h2} mt-4`}>{p.closing.title.join(" ")}</h2>
          <ol className="mt-8 flex flex-col gap-3">
            {p.closing.steps.map((step, i) => (
              <li key={step} className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-(--pitch-accent) font-numeral text-(--pitch-accent-text)">
                  {i + 1}
                </span>
                <span className="font-semibold">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-8 max-w-2xl font-medium leading-relaxed md:text-lg">{p.closing.reference}</p>
          <p className="mt-5 max-w-2xl font-semibold">{p.closing.interlocutor}</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-(--pitch-faint)">{p.closing.company}</p>
          <div className="mt-6 grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap">
            <a href={p.contact.mailto} className={buttonPrimary}>
              {p.closing.mail}
            </a>
            <a href={deck(p).href} className={buttonSecondary}>
              {deck(p).label}
            </a>
          </div>
          <a href={p.contact.mailto} className="mt-1 inline-flex min-h-11 items-center text-sm text-(--pitch-muted) underline decoration-(--pitch-line) underline-offset-4">
            {p.contact.email}
          </a>
        </div>
        <div className="hidden flex-col items-center text-center lg:flex">
          <p className="text-sm font-semibold">{p.closing.scanPage}</p>
          <p className="flourish mt-1 text-5xl leading-tight">{p.closing.flourish}</p>
          <div className="pitch-qr mt-4 rounded-[28px] bg-(--pitch-accent) p-6 text-(--pitch-on-accent)">
            <QrCode value={p.demos[0].href} label={`QR code vers ${p.demoDisplayUrl}`} className="size-52" />
          </div>
        </div>
      </div>
    </Section>
  );
}

function Sources({ p }: SectionProps) {
  return (
    <section id="sources" className="scroll-mt-4 border-t border-(--pitch-line) py-12">
      <div className={container}>
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-(--pitch-muted)">
            {pitchUi.sourcesToggle}
            <span aria-hidden className="text-lg text-(--pitch-accent-text) transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <ul className="mt-6 grid gap-4 text-sm leading-relaxed md:grid-cols-2 md:gap-x-10">
            {Object.values(p.sources).map((source) => (
              <li key={source.full}>
                <p>{source.full}</p>
                {source.url && (
                  <a href={source.url} target="_blank" rel="noopener" className="break-all text-xs text-(--pitch-faint) underline underline-offset-4">
                    {source.url}
                  </a>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-(--pitch-faint)">{p.sourcesNote}</p>
        </details>
      </div>
    </section>
  );
}

function Footer({ p }: SectionProps) {
  return (
    <footer className="border-t border-(--pitch-line) pb-28 pt-10 lg:pb-10">
      <div className={`${container} flex flex-col gap-4 text-sm text-(--pitch-faint) sm:flex-row sm:items-center sm:justify-between`}>
        <OmininMark className="text-[22px]" />
        <p>{p.page.footer}</p>
      </div>
    </footer>
  );
}

export function PitchPage({ pitch: p, brand }: { pitch: Pitch; brand: BrandKit }) {
  const props = { p, brand };
  return (
    <>
      {p.filmSrc && (
        <FilmOpener
          wide={p.filmSrc}
          vertical={p.filmVerticalSrc}
          poster={p.screens.poster.src}
          posterVertical={p.screens.posterVertical.src}
          seenKey={p.filmSeenKey}
          copy={{ ...pitchUi.opener, label: p.page.openerLabel }}
        />
      )}
      <MobileContactBar watch="hero-actions" until="closing" demoHref="#demo" demoLabel={pitchUi.demoShort} mailHref={p.contact.mailto} mailLabel={p.closing.mail} />
      <main className="flex-1">
        <Hero {...props} />
        <Demo {...props} />
        <Story {...props} />
        <Solution {...props} />
        <Estimator {...props} />
        <FieldProof {...props} />
        <Benefits {...props} />
        <Deployment {...props} />
        <Pricing {...props} />
        <Calculation {...props} />
        <Proposal {...props} />
        <FinalCta {...props} />
        <Sources {...props} />
      </main>
      <Footer {...props} />
    </>
  );
}
