import type { CSSProperties, ReactNode } from "react";
import { OmininMark } from "@/components/pitch/brand";
import { buttonPrimary, buttonSecondary } from "@/components/pitch/buttons";
import { MobileContactBar } from "@/components/pitch/mobile-contact-bar";
import { container, Eyebrow, h2, lead, NewTab, PitchFooter, Section, SourceNote, SourcesList } from "@/components/pitch/page-sections";
import { chicha, chichaSources } from "@/lib/pitch/chicha";
import { percent, pitchUi } from "@/lib/pitch/kit";

/*
 * La page du pitch aux restaurants-chicha, ouverte depuis un e-mail, souvent
 * au téléphone. Elle reprend la mise en page du kit (Section, Eyebrow, les
 * sources) et suit le message en trois temps — les ventes, la
 * simplicité, les données — puis le suivi chez BOHO.
 */

const c = chicha;

/** Les volutes au-dessus de la braise : chaque volute, sa place, sa taille, sa dérive et son rythme. */
const WISPS = [
  { left: "58%", size: "34rem", drift: "-6rem", speed: "19s", delay: "0s" },
  { left: "72%", size: "26rem", drift: "5rem", speed: "15s", delay: "-6s" },
  { left: "44%", size: "30rem", drift: "8rem", speed: "22s", delay: "-11s" },
  { left: "82%", size: "22rem", drift: "-4rem", speed: "17s", delay: "-3s" },
  { left: "8%", size: "28rem", drift: "6rem", speed: "24s", delay: "-15s" },
];

/** La fumée ; elle ne monte qu'en tête de page (moving), ailleurs elle reste posée. */
function Smoke({ moving = false, className = "" }: { moving?: boolean; className?: string }) {
  return (
    <div aria-hidden className={`chicha-smoke ${moving ? "chicha-smoke-moving" : ""} ${className}`}>
      {WISPS.map((w) => (
        <span key={w.left} className="chicha-wisp" style={{ left: w.left, "--size": w.size, "--drift": w.drift, "--speed": w.speed, "--delay": w.delay } as CSSProperties} />
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

function Tag({ children }: { children: string }) {
  return <span className="chicha-tag">{children}</span>;
}

const kickerClass = "text-[11px] font-bold uppercase tracking-[0.18em] text-(--pitch-faint) md:text-xs";

function WhatsAppLink() {
  return (
    <a href={c.contact.whatsapp} target="_blank" rel="noopener" className={`${buttonPrimary} gap-2`}>
      <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0 fill-current">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z" />
      </svg>
      {c.contact.whatsappLabel}
      <NewTab />
    </a>
  );
}

function BohoMenuLink({ className = "" }: { className?: string }) {
  return (
    <a href={c.bohoMenu.href} target="_blank" rel="noopener" className={`${buttonSecondary} gap-2 ${className}`}>
      {c.bohoMenu.label}
      <NewTab />
    </a>
  );
}

function Hero() {
  const { hero } = c;
  return (
    <section className="relative overflow-hidden">
      <Smoke moving />
      <header className={`${container} relative flex items-center justify-between py-5`}>
        <OmininMark className="text-[24px] md:text-[28px]" />
        <a href={c.contact.whatsapp} target="_blank" rel="noopener" className="hidden min-h-10 items-center rounded-full border border-(--pitch-line) px-5 text-sm font-semibold transition-colors hover:border-(--pitch-accent) sm:inline-flex">
          {c.contact.label}
          <span className="sr-only">{pitchUi.newTab}</span>
        </a>
      </header>
      <div className={`${container} relative pb-16 pt-8 md:pb-24 md:pt-14`}>
        <Eyebrow>{hero.eyebrow}</Eyebrow>
        <h1 className="mt-5 text-[44px] font-bold leading-[1.04] tracking-[-0.045em] sm:text-[68px] lg:text-[80px]">
          <span className="block">{hero.title.first}</span>
          <span className="block">{hero.title.second}</span>
          <span className="block">
            <span className="mark mark-start">{hero.title.accent}</span>
          </span>
        </h1>
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
          <div>
            <p className={lead}>{hero.lead}</p>
            <p className="mt-3 text-sm leading-relaxed text-(--pitch-muted)">{hero.calculation}</p>
            <ul className="mt-8 flex flex-col gap-3">
              {hero.pillars.map((pillar, i) => (
                <li key={pillar} className="grid grid-cols-[2rem_1fr] items-baseline gap-2 text-lg font-bold leading-snug md:text-xl">
                  <span aria-hidden className="font-numeral tabular-nums text-(--pitch-accent-text)">0{i + 1}</span>
                  {pillar}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-lg font-semibold text-(--pitch-muted) md:text-xl">{hero.together}</p>
            <div id="hero-actions" className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <WhatsAppLink />
              <BohoMenuLink />
            </div>
          </div>
          <div className="self-end">
            <ul className="flex flex-col divide-y divide-(--pitch-line) border-y border-(--pitch-line)">
              {hero.facts.map((fact) => (
                <li key={fact.label} className="flex items-center gap-5 py-5">
                  <p className="w-[7.5rem] shrink-0 whitespace-nowrap font-numeral text-4xl leading-none text-(--pitch-accent-text) md:w-[10rem] md:text-5xl">{fact.value}</p>
                  <p className="font-medium leading-snug text-(--pitch-muted)">{fact.label}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-(--pitch-faint)">{hero.measured}</p>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-(--pitch-line) px-4 py-1.5 text-sm font-semibold">
              <span aria-hidden className="size-2 rounded-full bg-(--chicha-coal) shadow-[0_0_8px_var(--chicha-coal)]" />
              {hero.consent}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Adoption() {
  const { adoption: a } = c;
  return (
    <Section>
      <div className={`${container} chicha-reveal`}>
        <Eyebrow>{a.eyebrow}</Eyebrow>
        <Title {...a.title} />
        <p className={`${lead} mt-6 max-w-3xl`}>{a.lead}</p>
        <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col justify-between gap-8 rounded-3xl bg-(--pitch-accent) p-6 text-(--pitch-on-accent) md:p-8">
            <p className="font-numeral text-[96px] leading-[0.85] md:text-[140px]">{a.main.value}</p>
            <p className="text-lg font-semibold leading-snug md:text-xl">{a.main.label}</p>
          </div>
          <div className="rounded-3xl bg-(--pitch-surface) p-6 md:p-8">
            <p className={kickerClass}>{a.growthLabel}</p>
            <div className="mt-6 flex flex-col gap-6">
              {a.growth.map((row) => (
                <div key={row.label}>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="font-bold">{row.label}</p>
                    <p className="font-numeral text-3xl leading-none tabular-nums md:text-4xl">
                      <span className="text-(--pitch-faint)">{percent(row.from)}</span>
                      <span aria-hidden className="mx-2 text-(--pitch-faint)">→</span>
                      <span className="sr-only"> puis </span>
                      <span className="text-(--pitch-accent-text)">{percent(row.to)}</span>
                    </p>
                  </div>
                  <div className="relative mt-3 h-3 rounded-full bg-(--pitch-raised) md:h-4">
                    <div className="chicha-bar absolute inset-y-0 left-0 rounded-full bg-(--pitch-accent)" style={{ width: `${row.to}%` }} />
                    <div className="chicha-bar absolute inset-y-0 left-0 rounded-full bg-(--pitch-muted)" style={{ width: `${row.from}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <ul className="mt-8 grid gap-5 border-t border-(--pitch-line) pt-6 sm:grid-cols-3">
              {a.facts.map((fact) => (
                <li key={fact.label}>
                  <p className="whitespace-nowrap font-numeral text-4xl leading-none text-(--pitch-accent-text)">{fact.value}</p>
                  <p className="mt-2 text-sm leading-relaxed text-(--pitch-muted)">{fact.label}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <SourceNote sources={chichaSources} ids={a.sources} className="mt-5" />
      </div>
    </Section>
  );
}

/** Une interface dessinée pour l'exemple, annoncée comme telle. */
function Example({ label, className, children }: { label: string; className: string; children: ReactNode }) {
  return (
    <div className={className}>
      <p className={`${kickerClass} mb-2`}>{label}</p>
      {children}
    </div>
  );
}

/** La carte de fidélité du client, dessinée : son solde, le palier, la récompense qui approche. */
function LoyaltyCard() {
  const { card } = c.sales.loyalty;
  return (
    <div aria-hidden className="rounded-2xl border border-(--pitch-line) bg-(--pitch-raised) p-5">
      <div className="flex items-baseline justify-between">
        <p className={kickerClass}>{card.label}</p>
        <p className="text-sm font-semibold text-(--pitch-accent-text)">{card.hint}</p>
      </div>
      <p className="mt-3 font-numeral text-5xl leading-none">
        {card.balance}
        <span className="text-2xl text-(--pitch-faint)"> / {card.goal}</span>
      </p>
      <div className="mt-4 h-2.5 rounded-full bg-(--pitch-ground)">
        <div className="h-full rounded-full bg-(--pitch-accent) shadow-[0_0_14px_var(--chicha-coal)]" style={{ width: `${(card.balance / card.goal) * 100}%` }} />
      </div>
      <p className="mt-3 text-sm text-(--pitch-muted)">{card.reward}</p>
    </div>
  );
}

/** Une suggestion sur la carte, dessinée : l'accord proposé et son bouton. */
function RecoCard({ card }: { card: (typeof c.sales.reco.cards)[number] }) {
  return (
    <div aria-hidden className="rounded-2xl border border-(--pitch-line) bg-(--pitch-raised) p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-(--chicha-amber)">
        <svg viewBox="0 0 24 24" className="size-4 fill-current">
          <path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z" />
        </svg>
        {card.kicker}
      </p>
      <div className="mt-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-lg font-bold">{card.item}</p>
          <p className="text-sm text-(--pitch-muted)">{card.note}</p>
        </div>
        <span className="shrink-0 rounded-full bg-(--pitch-accent) px-4 py-2 text-sm font-bold text-(--pitch-on-accent)">{c.sales.reco.action}</span>
      </div>
    </div>
  );
}

function Sales() {
  const { sales: s } = c;
  return (
    <Section>
      <div className={`${container} chicha-reveal`}>
        <Eyebrow>{s.eyebrow}</Eyebrow>
        <Title {...s.title} />
        <p className={`${lead} mt-6 max-w-3xl`}>{s.lead}</p>
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col rounded-3xl bg-(--pitch-surface) p-6 md:p-8">
            <h3 className="text-2xl font-bold tracking-[-0.02em]">{s.loyalty.title}</h3>
            <p className="mt-3 leading-relaxed text-(--pitch-muted)">{s.loyalty.text}</p>
            <Example label={s.loyalty.example} className="mt-6">
              <LoyaltyCard />
            </Example>
            <p className="mt-8 text-sm font-semibold">{s.loyalty.since}</p>
            <dl className="mt-4 grid grid-cols-2 items-start gap-x-6 gap-y-5 sm:grid-cols-4">
              {s.loyalty.facts.map((fact) => (
                <div key={fact.label} className="flex flex-col-reverse">
                  <dt className="mt-1 text-sm leading-snug text-(--pitch-muted)">{fact.label}</dt>
                  <dd className="whitespace-nowrap font-numeral text-4xl leading-none text-(--pitch-accent-text)">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-col rounded-3xl border border-(--pitch-line) p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-bold tracking-[-0.02em]">{s.reco.title}</h3>
              <Tag>{c.soonTag}</Tag>
            </div>
            <p className="mt-3 leading-relaxed text-(--pitch-muted)">{s.reco.text}</p>
            <Example label={s.reco.example} className="mt-6 lg:mt-auto lg:pt-6">
              <div className="flex flex-col gap-3">
                {s.reco.cards.map((card) => (
                  <RecoCard key={card.item} card={card} />
                ))}
              </div>
            </Example>
          </div>
        </div>
        <SourceNote sources={chichaSources} ids={s.sources} className="mt-5" />
      </div>
    </Section>
  );
}

function Simple() {
  const { simple: s } = c;
  return (
    <Section>
      <div className={`${container} chicha-reveal`}>
        <Eyebrow>{s.eyebrow}</Eyebrow>
        <Title {...s.title} />
        <p className={`${lead} mt-6 max-w-3xl`}>{s.lead}</p>
        <ol className="mt-10 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
          {s.steps.map((step, i) => (
            <li key={step.title} className="grid grid-cols-[2rem_1fr] gap-x-3 border-t border-(--pitch-line) py-5">
              <span aria-hidden className="font-numeral text-3xl leading-none text-(--pitch-accent-text)">{i + 1}</span>
              <div>
                <h3 className="text-lg font-bold leading-tight">{step.title}</h3>
                <p className="mt-1 leading-relaxed text-(--pitch-muted)">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {s.facts.map((fact) => (
            <li key={fact.value} className="border-t-2 border-(--pitch-accent) pt-5">
              <p className="whitespace-nowrap font-numeral text-4xl leading-none text-(--pitch-accent-text) md:text-5xl">{fact.value}</p>
              <p className="mt-3 leading-relaxed text-(--pitch-muted)">{fact.label}</p>
            </li>
          ))}
        </ul>
        <SourceNote sources={chichaSources} ids={s.sources} className="mt-6" />
      </div>
    </Section>
  );
}

function Data() {
  const { data } = c;
  return (
    <Section className="overflow-hidden">
      <Smoke className="opacity-70" />
      <div className={`${container} chicha-reveal relative`}>
        <Eyebrow>{data.eyebrow}</Eyebrow>
        <Title {...data.title} />
        <p className={`${lead} mt-6 max-w-3xl`}>{data.lead}</p>
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {data.items.map((item, i) => (
            <li key={item.kicker} className="flex flex-col rounded-3xl border border-(--pitch-line) bg-(--pitch-surface) p-6 md:p-8">
              <p className={`${kickerClass} flex items-center gap-3`}>
                <span aria-hidden className="font-numeral text-2xl leading-none tracking-normal text-(--pitch-accent-text)">0{i + 1}</span>
                {item.kicker}
              </p>
              <h3 className="mt-5 text-xl font-bold leading-snug md:text-2xl md:tracking-[-0.02em]">{item.title}</h3>
              <p className="mt-3 leading-relaxed text-(--pitch-muted)">{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function Together() {
  const { together: t } = c;
  return (
    <Section>
      <div className={`${container} chicha-reveal grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16`}>
        <div>
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <Title {...t.title} />
          <p className={`${lead} mt-6`}>{t.lead}</p>
          <BohoMenuLink className="mt-8" />
        </div>
        <div className="self-start rounded-3xl bg-(--pitch-surface) p-6 md:p-8">
          <p className={kickerClass}>{t.journalLabel}</p>
          <ol className="mt-6 flex flex-col">
            {t.journal.map((entry, i) => (
              <li key={entry.text} className="relative grid grid-cols-[4.5rem_1fr] gap-5 pb-6 last:pb-0">
                {i < t.journal.length - 1 && <span aria-hidden className="absolute bottom-0 left-[4.5rem] top-3 w-px bg-(--pitch-line)" />}
                <span className="pt-0.5 text-sm font-semibold tabular-nums text-(--pitch-accent-text)">{entry.date}</span>
                <span className="relative leading-relaxed">
                  <span aria-hidden className="absolute -left-[1.5rem] top-2.5 size-2 rounded-full bg-(--chicha-coal) shadow-[0_0_10px_var(--chicha-coal)]" />
                  {entry.text}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}

function Faq() {
  const { faq } = c;
  return (
    <Section>
      <div className={`${container} chicha-reveal grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16`}>
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
  return (
    <Section>
      <div className={`${container} chicha-reveal`}>
        <Eyebrow>{pricing.eyebrow}</Eyebrow>
        <h2 className="mt-4 text-[34px] font-bold leading-[1.08] tracking-[-0.045em] sm:text-[52px] lg:text-[60px]">
          <span className="block">{pricing.title.first}</span>
          <span className="block">
            <span className="mark mark-start">{pricing.title.accent}</span> {pricing.title.rest}
          </span>
        </h2>
        <p className={`${lead} mt-5 max-w-3xl`}>{pricing.lead}</p>
        <ul className="mt-10 grid gap-x-10 lg:grid-cols-2">
          {pricing.items.map((item) => (
            <li key={item} className="flex gap-3 border-b border-(--pitch-line) py-4 font-medium leading-relaxed">
              <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-(--pitch-accent)" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function Closing() {
  const { closing } = c;
  return (
    <Section id="closing" className="overflow-hidden">
      <Smoke className="opacity-80" />
      <div className={`${container} chicha-reveal relative flex flex-col items-start`}>
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
        <div className="mt-10 grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <WhatsAppLink />
          <a href={c.contact.mailto} className={buttonSecondary}>
            {c.contact.emailLabel}
          </a>
          <BohoMenuLink />
        </div>
        <p className="mt-8 font-semibold">{c.contact.signature}</p>
        <a href={c.contact.mailto} className="inline-flex min-h-11 items-center text-sm text-(--pitch-muted) underline decoration-(--pitch-line) underline-offset-4">
          {c.contact.email}
        </a>
      </div>
    </Section>
  );
}

export function ChichaPitchPage() {
  return (
    <>
      <MobileContactBar watch="hero-actions" until="closing" demoHref={c.bohoMenu.href} demoExternal demoLabel={c.bohoMenu.short} mailHref={c.contact.whatsapp} mailExternal mailLabel={c.contact.whatsappShort} />
      <main className="flex-1">
        <Hero />
        <Adoption />
        <Sales />
        <Simple />
        <Data />
        <Together />
        <Faq />
        <Pricing />
        <Closing />
        <SourcesList sources={chichaSources} note={c.sourcesNote} />
      </main>
      <PitchFooter text={c.footer} />
    </>
  );
}
