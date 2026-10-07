import type { ReactNode } from "react";
import { OmininMark, PartnerMarks, TicketCard, type BrandKit } from "@/components/pitch/brand";
import { BrowserFrame, PhoneFrame, TabletFrame } from "@/components/pitch/devices";
import { QrCode } from "@/components/pitch/qr-code";
import { pitchUi, raceBarWidth, sourcesLabel } from "@/lib/pitch/kit";
import type { Pitch } from "@/lib/pitch/types";
import { siteUrl } from "@/lib/site";

/*
 * La présentation : une diapositive par idée, chacune dessinée à 1 920 ×
 * 1 080 px exactement — l'écran la met à l'échelle, l'impression la pose
 * telle quelle sur une page (deck.css). Les tailles sont donc en pixels de
 * diapositive, pas en unités d'interface. Deux tailles de titre : pleine
 * largeur, et à côté d'une image.
 */

const titleFull = "text-[96px] font-extrabold leading-[1.04] tracking-[-0.04em]";
const titleSplit = "text-[80px] font-extrabold leading-[1.04] tracking-[-0.04em]";

type SlideProps = { index: number; total: number; p: Pitch; brand: BrandKit };

function Footnote({ p, ids }: { p: Pitch; ids: string[] }) {
  const unique = [...new Set(ids)];
  return (
    <>
      {sourcesLabel(unique.length)}
      {unique.map((id) => p.sources[id].short).join(" · ")}
    </>
  );
}

function Slide({
  index,
  total,
  p,
  brand,
  eyebrow,
  note,
  rays,
  children,
}: SlideProps & {
  eyebrow?: string;
  /** Pied de page gauche : les sources, ou une mention. */
  note?: ReactNode;
  rays?: { cx: number; cy: number };
  children: ReactNode;
}) {
  const page = (n: number) => String(n).padStart(2, "0");
  return (
    <section className="deck-frame" aria-label={`Diapositive ${index} sur ${total}`}>
      <div className="deck-slide">
        {rays && <brand.Backdrop cx={rays.cx} cy={rays.cy} />}
        <div aria-hidden className="pitch-vignette absolute inset-0" />
        <div className="relative flex h-full flex-col px-[128px] pb-[56px] pt-[96px]">
          {eyebrow && <p className="eyebrow text-[20px] text-(--pitch-muted)">{eyebrow}</p>}
          <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
          <footer className="mt-[28px] flex items-end justify-between gap-[64px] text-[16px] leading-[1.45] text-(--pitch-faint)">
            <p className="max-w-[1380px]">{note}</p>
            <p className="shrink-0 tabular-nums">
              {p.deckFooter}
              <span className="px-[14px] opacity-50">/</span>
              {page(index)}
              <span className="opacity-50"> · {page(total)}</span>
            </p>
          </footer>
        </div>
      </div>
    </section>
  );
}

function Point({ title, text }: { title: string; text: string }) {
  return (
    <li className="border-l-[3px] border-(--pitch-accent) pl-[24px]">
      <p className="text-[29px] font-bold leading-[1.18]">{title}</p>
      <p className="mt-[6px] text-[22px] leading-[1.45] text-(--pitch-muted)">{text}</p>
    </li>
  );
}

function CoverSlide(props: SlideProps) {
  const { p, brand } = props;
  return (
    <Slide {...props} note={p.pitchDate} rays={{ cx: 76, cy: 44 }}>
      <PartnerMarks brand={brand} className="absolute -top-[18px] left-0 text-[40px]" />
      <div className="mt-auto flex items-end justify-between">
        <div>
          <p className="eyebrow text-[22px] text-(--pitch-muted)">{p.cover.eyebrow}</p>
          <h1 className="mt-[28px] text-[124px] font-extrabold leading-[1.06] tracking-[-0.045em]">
            <span className="block">{p.cover.title.first}</span>
            <span className="block">
              {p.cover.title.second.text} <span className="mark mark-start">{p.cover.title.second.accent}</span>
            </span>
          </h1>
          <p className="mt-[56px] max-w-[900px] text-balance text-[36px] font-medium leading-[1.3] text-(--pitch-muted)">{p.cover.lead}</p>
        </div>
        <TicketCard brand={brand} name={p.brandName} number={p.ticketNumber} className="mb-[24px] mr-[36px] shrink-0 rotate-[5deg] text-[58px]" />
      </div>
      <ul className="mt-[48px] flex justify-between gap-[48px] border-t border-(--pitch-line) pt-[28px]">
        {p.page.heroFacts.map((fact) => (
          <li key={fact.label} className="flex items-center gap-[20px]">
            <span className="whitespace-nowrap font-numeral text-[60px] leading-none text-(--pitch-accent)">{fact.value}</span>
            <span className="max-w-[420px] text-[21px] font-medium leading-[1.3]">{fact.label}</span>
          </li>
        ))}
      </ul>
    </Slide>
  );
}

function PromiseSlide(props: SlideProps) {
  const { p } = props;
  return (
    <Slide {...props} eyebrow={p.promise.eyebrow} note={<Footnote p={p} ids={p.promise.sources} />} rays={{ cx: 26, cy: 55 }}>
      <div className="grid flex-1 grid-cols-[1060px_1fr] items-center gap-[64px]">
        <div>
          <h2 className="text-[140px] font-extrabold leading-[1.02] tracking-[-0.05em]">
            <span className="block">«&nbsp;{p.promise.slogan[0]}</span>
            <span className="block text-(--pitch-accent)">{p.promise.slogan[1]}&nbsp;»</span>
          </h2>
          <p className="mt-[28px] text-[24px] text-(--pitch-faint)">— {p.promise.sloganSource}</p>
        </div>
        <div className="flex flex-col gap-[48px]">
          <div>
            <p className="flex items-start gap-[18px]">
              <span className="font-numeral text-[176px] leading-[0.85]">{p.promise.rating.value}</span>
              <span aria-hidden className="mt-[8px] text-[68px] leading-none text-(--pitch-accent)">★</span>
            </p>
            <p className="mt-[20px] text-[28px] font-medium text-(--pitch-muted)">{p.promise.rating.label}</p>
          </div>
          <div className="border-t border-(--pitch-line) pt-[44px]">
            <p className="font-numeral text-[128px] leading-[0.85] text-(--pitch-accent)">{p.promise.speed.value}</p>
            <p className="mt-[20px] text-[28px] font-medium text-(--pitch-muted)">{p.promise.speed.label}</p>
            <p className="mt-[6px] text-[22px] text-(--pitch-faint)">{p.promise.speed.detail}</p>
          </div>
        </div>
      </div>
      <p className="mb-[8px] text-[34px] font-medium text-(--pitch-muted)">{p.promise.closing}</p>
    </Slide>
  );
}

function WalkAwaySlide(props: SlideProps) {
  const { p } = props;
  return (
    <Slide
      {...props}
      eyebrow={p.walkAway.eyebrow}
      note={<Footnote p={p} ids={[...p.walkAway.facts.map((fact) => fact.source), ...(p.walkAway.followUpSources ?? [])]} />}
      rays={{ cx: 50, cy: -30 }}
    >
      <blockquote className="mt-[48px]">
        <p className="pitch-quote text-balance text-[72px] font-bold leading-[1.12] tracking-[-0.03em]">
          <span className="block">«&nbsp;{p.walkAway.quote[0]}</span>
          <span className="block text-(--pitch-accent)">{p.walkAway.quote[1]}&nbsp;»</span>
        </p>
        <footer className="mt-[28px] text-[28px] font-medium text-(--pitch-muted)">— {p.walkAway.attribution}</footer>
      </blockquote>
      <div className="mt-auto grid grid-cols-2 gap-[48px]">
        {p.walkAway.facts.map((fact) => (
          <div key={fact.value} className="flex items-center gap-[40px] rounded-[28px] bg-(--pitch-surface) px-[44px] py-[36px]">
            <p className="shrink-0 font-numeral text-[120px] leading-[0.85]">{fact.value}</p>
            <p className="text-[26px] font-medium leading-[1.4] text-(--pitch-muted)">{fact.text}</p>
          </div>
        ))}
      </div>
      {/* En blanc : en rouge, plus fort que le titre et d'un rouge à 3,6:1 au projecteur. */}
      <p className="mb-[56px] mt-[36px] text-[34px] font-extrabold leading-[1.25] tracking-[-0.01em] text-(--pitch-ink)">{p.walkAway.followUp}</p>
    </Slide>
  );
}

function SolutionSlide(props: SlideProps) {
  const { p } = props;
  return (
    <Slide {...props} eyebrow={p.solution.eyebrow} note={pitchUi.clickToOpen} rays={{ cx: 50, cy: 110 }}>
      <div className="mt-[16px] flex items-center justify-between gap-[48px]">
        <h2 className="whitespace-nowrap text-[84px] font-extrabold leading-[1.04] tracking-[-0.04em]">
          {p.solution.title.text} <span className="mark">{p.solution.title.accent}</span>
        </h2>
        <p className="max-w-[460px] border-l-[4px] border-(--pitch-accent) pl-[24px] text-[24px] font-semibold leading-[1.35]">
          {p.solution.note}
        </p>
      </div>
      <ol className="mt-[44px] grid grid-cols-[repeat(4,380px)] justify-between">
        {p.solution.steps.map((step, i) => (
          <li key={step.title} className="flex flex-col">
            <a href={p.demos[0].href} className="block w-[258px]">
              <PhoneFrame src={p.screens[step.screen].src} alt={p.screens[step.screen].alt} sizes="580px" unoptimized className="w-full" />
            </a>
            <div className="mt-[20px] flex items-baseline gap-[14px]">
              <span className="font-numeral text-[36px] leading-none text-(--pitch-accent)">{i + 1}</span>
              <p className="text-[28px] font-bold leading-[1.1]">{step.title}</p>
            </div>
            <p className="mt-[6px] text-[21px] leading-[1.4] text-(--pitch-muted)">{step.text}</p>
          </li>
        ))}
      </ol>
    </Slide>
  );
}

function EtaBadge({ notice, className = "" }: { notice: Pitch["etaNotice"]; className?: string }) {
  return (
    <div className={`rounded-[18px] border border-(--pitch-accent)/45 bg-(--pitch-accent)/[0.06] px-[22px] py-[14px] ${className}`}>
      <p className="text-[16px] font-bold uppercase tracking-[0.2em] text-(--pitch-accent-light)">{notice.tag}</p>
      <p className="mt-[4px] text-[19px] leading-[1.4] text-(--pitch-muted)">{notice.text}</p>
    </div>
  );
}

function CustomersSlide(props: SlideProps) {
  const { p } = props;
  return (
    <Slide {...props} note={<Footnote p={p} ids={p.forCustomers.sources} />} rays={{ cx: 20, cy: 60 }}>
      <div className="grid flex-1 grid-cols-[500px_1fr] gap-[112px]">
        <div className="flex items-center justify-center">
          <a href={p.demos[0].href} className="block w-[380px]">
            <PhoneFrame src={p.screens.composer.src} alt={p.screens.composer.alt} sizes="820px" unoptimized className="w-full" />
          </a>
        </div>
        <div className="flex flex-col justify-center">
          <p className="eyebrow mb-[32px] text-[20px] text-(--pitch-muted)">{p.forCustomers.eyebrow}</p>
          <h2 className={titleSplit}>
            <span className="block">{p.forCustomers.title[0]}</span>
            <span className="block">{p.forCustomers.title[1]}</span>
          </h2>
          <ul className="mt-[40px] flex flex-col gap-[32px]">
            {p.forCustomers.points.map((point) => (
              <li key={point.title} className="grid grid-cols-[36px_1fr] gap-[16px]">
                <span aria-hidden className="mt-[12px] size-[14px] rounded-full bg-(--pitch-accent)" />
                <div>
                  <p className="text-[30px] font-bold leading-[1.18]">{point.title}</p>
                  {"text" in point && <p className="mt-[6px] text-[23px] leading-[1.45] text-(--pitch-muted)">{point.text}</p>}
                  <p className="mt-[8px] text-[21px] leading-[1.4] text-(--pitch-faint)">{point.fact}</p>
                  {point.eta && <EtaBadge notice={p.etaNotice} className="mt-[14px] max-w-[780px]" />}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Slide>
  );
}

function TeamsSlide(props: SlideProps) {
  const { p } = props;
  return (
    <Slide {...props} eyebrow={p.forTeams.eyebrow} note={<Footnote p={p} ids={p.forTeams.sources} />} rays={{ cx: 78, cy: 50 }}>
      <div className="grid flex-1 grid-cols-[640px_1fr] gap-[72px]">
        <div className="flex flex-col justify-center">
          <h2 className={titleSplit}>
            {p.forTeams.title.text} <span className="text-(--pitch-accent)">{p.forTeams.title.accent}</span>
          </h2>
          <ul className="mt-[40px] flex flex-col gap-[26px]">
            {p.forTeams.points.map((point) => (
              <Point key={point.title} title={point.title} text={point.text} />
            ))}
          </ul>
        </div>
        <div className="flex flex-col justify-center">
          <a href={p.demos[1].href} className="block">
            <TabletFrame src={p.screens.comptoir.src} alt={p.screens.comptoir.alt} sizes="1900px" unoptimized className="w-full" />
          </a>
          <p className="mt-[16px] text-[19px] text-(--pitch-faint)">
            {p.forTeams.caption} · {pitchUi.clickToOpen}
          </p>
        </div>
      </div>
      <p className="mt-[28px] border-t border-(--pitch-line) pt-[18px] text-[22px] leading-[1.45] text-(--pitch-muted)">{p.forTeams.simple}</p>
    </Slide>
  );
}

function RevenueSlide(props: SlideProps) {
  const { p } = props;
  return (
    <Slide
      {...props}
      eyebrow={p.forRevenue.eyebrow}
      note={<Footnote p={p} ids={p.forRevenue.sources} />}
      rays={{ cx: 70, cy: 62 }}
    >
      <h2 className="mt-[16px] text-balance text-[72px] font-extrabold leading-[1.06] tracking-[-0.04em]">{p.forRevenue.title}</h2>
      <p className="pitch-mechanism mt-[20px] max-w-[1560px] text-[26px] font-medium leading-[1.4] text-(--pitch-muted)">{p.forRevenue.mechanism}</p>
      <div className="my-auto rounded-[28px] border-[2px] border-dashed border-(--pitch-accent)/45 px-[48px] py-[40px]">
        <p className="text-[18px] font-bold uppercase tracking-[0.22em] text-(--pitch-accent-light)">{p.forRevenue.illustrationLabel}</p>
        <p className="mt-[8px] text-[21px] text-(--pitch-muted)">{p.forRevenue.rateNote}</p>
        <ol className="mt-[24px] grid grid-cols-3 gap-[56px]">
          {p.forRevenue.sum.map((term) => (
            <li key={term.value}>
              <p className="font-numeral text-[96px] leading-none text-(--pitch-accent)">{term.value}</p>
              <p className="mt-[10px] text-[24px] font-bold">{term.unit}</p>
              <p className="mt-[4px] text-[22px] leading-[1.4] text-(--pitch-muted)">{term.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-[28px] border-t border-(--pitch-line) pt-[18px] text-[19px] leading-[1.45] text-(--pitch-faint)">{p.forRevenue.beyond}</p>
      </div>
    </Slide>
  );
}

function HeadOfficeSlide(props: SlideProps) {
  const { p } = props;
  /** La vue réseau sans ses indicateurs : ses trois panneaux, arrêtés au-dessus du graphique. */
  const reseauCrop = { x: 0, y: p.forHeadOffice.panelsTop, width: 1600, height: 368 };
  return (
    <Slide {...props} eyebrow={p.forHeadOffice.eyebrow} note={[`${p.forHeadOffice.badge}.`, p.forHeadOffice.hypothesis, p.forHeadOffice.delayKey, pitchUi.clickToOpen].filter(Boolean).join(" ")} rays={{ cx: 70, cy: 20 }}>
      <h2 className={`mt-[16px] ${titleSplit}`}>{p.forHeadOffice.title}</h2>
      <p className="mt-[14px] text-[30px] font-semibold leading-[1.4] text-(--pitch-accent-light)">{p.forHeadOffice.lead}</p>
      <div className="my-auto">
        {/* Les trois parties de l'écran, chacune au-dessus de son panneau : celles de la phrase d'accroche. */}
        <ul className="relative h-[52px]">
          {p.forHeadOffice.areas.map((area) => (
            <li
              key={area.label}
              className="absolute top-0 flex flex-col items-start"
              style={{ left: `${(area.x / reseauCrop.width) * 100}%` }}
            >
              <span className="text-[19px] font-bold uppercase tracking-[0.2em] text-(--pitch-accent-light)">{area.label}</span>
              <span aria-hidden className="mt-[8px] h-[16px] w-[3px] bg-(--pitch-accent)" />
            </li>
          ))}
        </ul>
        <a href={p.demos[2].href} className="block">
          <BrowserFrame
            src={p.screens.reseau.src}
            alt={p.screens.reseau.alt}
            sizes="3200px"
            unoptimized
            url={p.demos[2].href.replace(/^https?:\/\//, "").replace(/\?.*$/, "")}
            badge={p.forHeadOffice.badge}
            crop={reseauCrop}
            className="w-full text-[17px]"
          />
        </a>
      </div>
    </Slide>
  );
}

function DeploymentSlide(props: SlideProps) {
  const { p } = props;
  return (
    <Slide
      {...props}
      eyebrow={p.deployment.eyebrow}
      note={p.deployment.sources && <Footnote p={p} ids={p.deployment.sources} />}
      rays={{ cx: 50, cy: 115 }}
    >
      <h2 className={`mt-[24px] ${titleFull}`}>
        {p.deployment.title.text} <span className="text-(--pitch-accent)">{p.deployment.title.accent}</span>
      </h2>
      <p className="mt-[24px] max-w-[1500px] text-[30px] font-medium leading-[1.4] text-(--pitch-muted)">{p.deployment.lead}</p>
      <ol className="mb-auto mt-[40px] grid grid-cols-4 gap-[28px]">
        {p.deployment.points.map((point) => (
          <li key={point.title} className="flex flex-col rounded-[28px] bg-(--pitch-surface) p-[40px]">
            <span className="eyebrow text-[19px] text-(--pitch-accent-text)">{point.label}</span>
            <p className="mt-[22px] text-[31px] font-bold leading-[1.16]">{point.title}</p>
            <p className="mt-[16px] text-[25px] leading-[1.45] text-(--pitch-muted)">{point.text}</p>
          </li>
        ))}
      </ol>
    </Slide>
  );
}

function PriceSlide(props: SlideProps) {
  const { p } = props;
  const { example } = p.pricing;
  return (
    <Slide {...props} eyebrow={p.pricing.eyebrow} note={<Footnote p={p} ids={p.pricing.sources} />} rays={{ cx: 16, cy: 30 }}>
      <h2 className="mt-[12px] whitespace-nowrap text-[72px] font-extrabold leading-[1.04] tracking-[-0.04em]">
        <span className="block">{p.pricing.headline.subscription}</span>
        <span className="block">
          <span className="mark mark-start [word-spacing:0.12em]">{p.pricing.headline.commission}</span> {p.pricing.headline.basis}
        </span>
      </h2>
      <p className="mt-[24px] max-w-[1600px] text-[25px] font-medium leading-[1.4] text-(--pitch-muted)">{p.pricing.lead}</p>
      <div className="my-auto grid grid-cols-[560px_1fr] items-start gap-[64px]">
        <div className="rounded-[28px] bg-(--pitch-surface) px-[40px] py-[32px]">
          <p className="text-[24px] font-semibold">{example.label}</p>
          <p className="mt-[2px] text-[19px] text-(--pitch-accent-light)">{example.rateNote}</p>
          <dl className="mt-[18px] flex flex-col gap-[10px] text-[23px]">
            {example.lines.map((line) => (
              <div key={line.label} className="flex justify-between gap-[24px] text-(--pitch-muted)">
                <dt>{line.label}</dt>
                <dd className="tabular-nums">{line.value}</dd>
              </div>
            ))}
            <div className="mt-[6px] flex items-baseline justify-between border-t border-dashed border-(--pitch-line) pt-[16px]">
              <dt className="font-bold">{example.totalLabel}</dt>
              <dd className="text-right">
                <span className="block font-numeral text-[64px] leading-none text-(--pitch-accent)">{example.total}</span>
                <span className="mt-[6px] block text-[19px] text-(--pitch-faint)">{example.share}</span>
              </dd>
            </div>
            <div className="mt-[8px] flex justify-between gap-[24px] text-(--pitch-muted)">
              <dt>{example.counter.label}</dt>
              <dd className="tabular-nums">{example.counter.value}</dd>
            </div>
            <div className="flex justify-between gap-[24px] font-bold">
              <dt>{example.extra.label}</dt>
              <dd className="tabular-nums">{example.extra.value}</dd>
            </div>
          </dl>
          <p className="mt-[12px] text-[19px] leading-[1.45] text-(--pitch-faint)">{example.compare}</p>
        </div>
        <div>
          <p className="text-[18px] font-bold uppercase tracking-[0.2em] text-(--pitch-faint)">{p.pricing.comparisonTitle}</p>
          <table className="mt-[8px] w-full border-collapse text-left">
            <tbody>
              {p.pricing.comparison.map((row) => (
                <tr key={row.name} className="border-b border-(--pitch-line)">
                  <th scope="row" className="w-[330px] py-[14px] pr-[24px] align-top text-[25px] font-bold">
                    {row.name}
                  </th>
                  <td className="py-[14px] text-[22px] leading-[1.4] text-(--pitch-muted)">{row.model}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-[24px] text-[26px] font-bold">{p.pricing.noOnline}</p>
          {p.pricing.setup && <p className="mt-[6px] text-[20px] leading-[1.4] text-(--pitch-muted)">{p.pricing.setup}</p>}
          <p className="mt-[12px] text-[20px] leading-[1.45] text-(--pitch-faint)">
            {p.pricing.cardFees} {p.pricing.vat}
          </p>
        </div>
      </div>
    </Slide>
  );
}

function ProposalSlide(props: SlideProps) {
  const { p } = props;
  const columns = [
    { ...p.proposal.pilot, tone: "bg-(--pitch-accent) text-(--pitch-on-accent)" },
    { ...p.proposal.network, tone: "bg-(--pitch-surface)" },
  ];
  return (
    <Slide {...props} eyebrow={p.proposal.eyebrow} note={<Footnote p={p} ids={[...p.proposal.measures.sources, ...(p.forCustomers.scan.sources ?? [])]} />} rays={{ cx: 20, cy: 110 }}>
      <h2 className={`mt-[16px] ${titleSplit}`}>{p.proposal.title}</h2>
      <div className="mb-auto mt-[48px]">
        <div className="grid grid-cols-[1fr_1fr_0.95fr] gap-[28px]">
          {columns.map((column) => (
            <div key={column.title} className={`rounded-[28px] px-[36px] py-[34px] ${column.tone}`}>
              <p className="text-[18px] font-bold uppercase tracking-[0.22em] opacity-70">{column.title}</p>
              <p className="mt-[14px] text-[32px] font-extrabold leading-[1.12] tracking-[-0.01em]">{column.lead}</p>
              <ul className="mt-[20px] flex flex-col gap-[10px]">
                {column.points.map((point) => (
                  <li key={point} className="flex gap-[14px] text-[20px] leading-[1.4] opacity-90">
                    <span aria-hidden className="mt-[10px] size-[10px] shrink-0 rounded-full bg-current opacity-60" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="rounded-[28px] bg-(--pitch-surface) px-[36px] py-[34px]">
            <p className="text-[18px] font-bold uppercase tracking-[0.22em] opacity-70">{p.proposal.measures.title}</p>
            <p className="mt-[14px] text-[32px] font-extrabold leading-[1.12] tracking-[-0.01em]">{p.proposal.measures.lead}</p>
            <ul className="mt-[20px] flex flex-col gap-[10px]">
              {p.proposal.measures.points.map((point) => (
                <li key={point} className="flex gap-[14px] text-[20px] leading-[1.4] opacity-90">
                  <span aria-hidden className="mt-[10px] size-[10px] shrink-0 rounded-full bg-(--pitch-accent)" />
                  {point}
                </li>
              ))}
            </ul>
            {p.proposal.measures.vendor && (
              <p className="mt-[24px] border-t border-(--pitch-line) pt-[20px] text-[20px] font-semibold leading-[1.4]">{p.proposal.measures.vendor}</p>
            )}
          </div>
        </div>
        <p className="mt-[28px] text-[21px] leading-[1.45] text-(--pitch-muted)">
          <span className="font-bold text-(--pitch-ink)">{p.forCustomers.scan.question}</span> {p.forCustomers.scan.answer}
        </p>
      </div>
    </Slide>
  );
}

function ClosingSlide(props: SlideProps) {
  const { p, brand } = props;
  return (
    <Slide {...props} eyebrow={p.closing.eyebrow} rays={{ cx: 80, cy: 46 }}>
      <div className="grid flex-1 grid-cols-[1fr_480px] items-center gap-[120px]">
        <div>
          <h2 className="text-[108px] font-extrabold leading-[1.02] tracking-[-0.045em]">
            <span className="block">{p.closing.title[0]}</span>
            <span className="block">{p.closing.title[1]}</span>
          </h2>
          <ol className="mt-[32px] flex flex-col gap-[12px]">
            {p.closing.steps.map((step, i) => (
              <li key={step} className="flex items-center gap-[18px]">
                <span className="flex size-[46px] shrink-0 items-center justify-center rounded-full border-[2px] border-(--pitch-accent) font-numeral text-[24px] text-(--pitch-accent-text)">
                  {i + 1}
                </span>
                <span className="text-[28px] font-semibold">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-[32px] max-w-[1000px] text-[25px] font-medium leading-[1.4]">{p.closing.reference}</p>
          <div className="mt-[24px] flex items-center gap-[28px]">
            <a
              href={p.contact.mailto}
              className="inline-flex items-center rounded-full bg-(--pitch-accent) px-[40px] py-[18px] text-[30px] font-bold text-(--pitch-on-accent)"
            >
              {p.closing.mail}&nbsp;→
            </a>
            <a href={p.contact.mailto} className="text-[24px] font-medium text-(--pitch-ink)">
              {p.contact.email}
            </a>
          </div>
          <p className="mt-[24px] text-[22px] font-semibold">{p.closing.interlocutor}</p>
          <p className="mt-[6px] max-w-[1000px] text-[19px] leading-[1.45] text-(--pitch-faint)">{p.closing.company}</p>
          <a href={`${siteUrl}${p.path}`} className="mt-[14px] block w-fit text-[19px] font-medium text-(--pitch-muted)">
            {pitchUi.filmAndDemos} {`${siteUrl}${p.path}`.replace(/^https?:\/\//, "")}
          </a>
        </div>
        <div className="flex flex-col items-center text-center">
          <p className="text-[26px] font-semibold">{p.closing.scanTitle}</p>
          <p className="flourish mt-[4px] text-[72px] leading-[1.15]">{p.closing.flourish}</p>
          <a href={p.demos[0].href} className="pitch-qr mt-[18px] block rounded-[32px] bg-(--pitch-accent) p-[34px] text-(--pitch-on-accent) shadow-[0_0_120px_color-mix(in_srgb,var(--pitch-accent)_18%,transparent)]">
            <QrCode value={p.demos[0].href} label={`QR code vers ${p.demoDisplayUrl}`} className="size-[290px]" />
          </a>
          <a href={p.demos[0].href} className="mt-[18px] text-[18px] font-medium text-(--pitch-muted)">
            {p.demoDisplayUrl}
          </a>
        </div>
      </div>
      <div className="mt-[48px] flex items-center gap-[40px] text-[32px]">
        <brand.Lockup />
        <span aria-hidden className="text-[22px] text-(--pitch-faint)">×</span>
        <OmininMark className="text-[30px]" />
      </div>
    </Slide>
  );
}

function SourcesSlide(props: SlideProps) {
  const { p, brand } = props;
  return (
    <Slide {...props} eyebrow={pitchUi.sourcesTitle}>
      <ul className="mt-[40px] columns-2 gap-[72px] text-[17px] leading-[1.45]">
        {Object.values(p.sources).map((source) => (
          <li key={source.full} className="mb-[18px] break-inside-avoid">
            <p className="text-(--pitch-ink)">{source.full}</p>
            {source.url && (
              <a href={source.url} className="text-[15px] text-(--pitch-faint) underline decoration-(--pitch-line) underline-offset-4">
                {new URL(source.url).hostname.replace(/^www\./, "")}
              </a>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-auto flex items-center gap-[16px] text-[18px] text-(--pitch-faint)">
        <brand.Emblem className="h-[26px] w-auto text-(--pitch-faint)" />
        {p.sourcesNote}
      </p>
    </Slide>
  );
}

/** L'estimateur IA : l'heure annoncée, l'heure prête, et ce qu'il apprend. */
function EstimatorSlide(props: SlideProps) {
  const { p } = props;
  const e = p.estimator!;
  return (
    <Slide {...props} eyebrow={e.eyebrow} note={pitchUi.clickToOpen} rays={{ cx: 82, cy: 40 }}>
      <div className="grid flex-1 grid-cols-[1fr_420px] gap-[96px]">
        <div className="flex flex-col justify-center">
          <h2 className={titleSplit}>
            {e.title.text} <span className="mark">{e.title.accent}</span>
          </h2>
          <p className="mt-[24px] max-w-[980px] text-[26px] leading-[1.45] text-(--pitch-muted)">{e.lead}</p>
          <div className="mt-[40px] flex items-center gap-[28px]">
            {[e.announced, e.ready].map((clock, i) => (
              <div key={clock.label} className="flex items-center gap-[28px]">
                {i > 0 && (
                  <span aria-hidden className="flex size-[56px] items-center justify-center rounded-full bg-(--pitch-accent) text-[30px] font-bold text-(--pitch-on-accent)">
                    =
                  </span>
                )}
                <div className={`rounded-[24px] px-[36px] py-[22px] ${i ? "bg-(--pitch-accent) text-(--pitch-on-accent)" : "bg-(--pitch-surface)"}`}>
                  <p className={`text-[17px] font-bold uppercase tracking-[0.18em] ${i ? "" : "text-(--pitch-muted)"}`}>{clock.label}</p>
                  <p className="mt-[6px] font-numeral text-[104px] leading-[0.9] tabular-nums">{clock.value}</p>
                </div>
              </div>
            ))}
            <p className="ml-[16px] text-[40px] font-extrabold leading-[1.1] tracking-[-0.02em]">{e.verdict}</p>
          </div>
          <ul className="mt-[48px] grid grid-cols-3 gap-[40px]">
            {e.points.map((point) => (
              <Point key={point.title} {...point} />
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-center">
          <a href={p.demos[0].href} className="block w-[380px]">
            <PhoneFrame src={p.screens[e.screen].src} alt={p.screens[e.screen].alt} sizes="820px" unoptimized className="w-full" />
          </a>
        </div>
      </div>
    </Slide>
  );
}

/** Mesuré chez un client : la course commande → ticket cuisine, barres à l'échelle des durées. */
function FieldProofSlide(props: SlideProps) {
  const { p } = props;
  const f = p.fieldProof!;
  const longest = Math.max(...f.race.map((lane) => lane.seconds));
  return (
    <Slide {...props} eyebrow={f.eyebrow} note={<Footnote p={p} ids={f.sources} />} rays={{ cx: 12, cy: 30 }}>
      <h2 className={`${titleSplit} mt-[12px]`}>
        {f.title.text} <span className="mark">{f.title.accent}</span>
      </h2>
      <p className="mt-[16px] max-w-[1500px] text-[22px] leading-[1.45] text-(--pitch-muted)">{f.context}</p>
      <div className="mt-[44px] flex flex-col gap-[28px]">
        <p className="text-[17px] font-bold uppercase tracking-[0.18em] text-(--pitch-faint)">{f.raceLabel}</p>
        {f.race.map((lane, i) => (
          <div key={lane.label} className="grid grid-cols-[340px_1fr_380px] items-center gap-[32px]">
            <p className="text-[25px] font-bold leading-[1.2]">{lane.label}</p>
            <div className="h-[36px] rounded-full bg-(--pitch-surface)">
              <div
                className={`h-full rounded-full ${i ? "bg-(--pitch-muted)" : "bg-(--pitch-accent)"}`}
                style={{ width: raceBarWidth(lane.seconds, longest) }}
              />
            </div>
            <p className={`whitespace-nowrap text-right font-numeral text-[88px] leading-none tabular-nums ${i ? "" : "text-(--pitch-accent-text)"}`}>{lane.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-auto grid grid-cols-3 gap-[40px]">
        {f.facts.map((fact) => (
          <div key={fact.label} className="rounded-[28px] bg-(--pitch-surface) px-[36px] py-[26px]">
            <p className="font-numeral text-[76px] leading-[0.9]">{fact.value}</p>
            <p className="mt-[10px] text-[21px] leading-[1.4] text-(--pitch-muted)">{fact.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-[28px] text-[28px] font-extrabold leading-[1.25] tracking-[-0.01em]">{f.takeaway}</p>
    </Slide>
  );
}

/** Les diapositives, dans l'ordre ; celles qui ont un `when` ne paraissent que si l'enseigne en a le contenu. */
const SLIDES: { slide: (props: SlideProps) => ReactNode; when?: (p: Pitch) => boolean }[] = [
  { slide: CoverSlide },
  { slide: PromiseSlide },
  { slide: WalkAwaySlide },
  { slide: SolutionSlide },
  { slide: EstimatorSlide, when: (p) => Boolean(p.estimator) },
  { slide: FieldProofSlide, when: (p) => Boolean(p.fieldProof) },
  { slide: CustomersSlide },
  { slide: TeamsSlide },
  { slide: HeadOfficeSlide },
  { slide: DeploymentSlide },
  { slide: PriceSlide },
  { slide: RevenueSlide },
  { slide: ProposalSlide },
  { slide: ClosingSlide },
  { slide: SourcesSlide },
];

/**
 * Pose --deck-scale (largeur d'un cadre ÷ largeur d'une diapositive) avant le
 * premier rendu, puis à chaque redimensionnement. Script en ligne et non
 * composant client : il s'exécute pendant l'analyse du HTML, sans attendre
 * l'hydratation, donc sans diapositives géantes au chargement.
 */
const deckScaleScript = `(() => {
  const deck = document.currentScript.parentElement;
  const slideWidth = parseFloat(getComputedStyle(deck).getPropertyValue("--deck-slide-width"));
  new ResizeObserver(([entry]) => deck.style.setProperty("--deck-scale", String(entry.contentRect.width / slideWidth))).observe(deck);
})()`;

export function Deck({ pitch, brand }: { pitch: Pitch; brand: BrandKit }) {
  const slides = SLIDES.filter((entry) => entry.when?.(pitch) ?? true).map((entry) => entry.slide);
  return (
    // Le script pose un style sur <main> avant l'hydratation.
    <main className="deck" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: deckScaleScript }} />
      {slides.map((SlideContent, i) => (
        <SlideContent key={i} index={i + 1} total={slides.length} p={pitch} brand={brand} />
      ))}
    </main>
  );
}
