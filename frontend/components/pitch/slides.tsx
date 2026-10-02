import type { ReactNode } from "react";
import { Coq, OcpLockup, OmininMark, PartnerMarks, Rays, TicketCard } from "@/components/pitch/brand";
import { BrowserFrame, PhoneFrame, TabletFrame } from "@/components/pitch/devices";
import { QrCode } from "@/components/pitch/qr-code";
import {
  clickToOpen,
  closing,
  contact,
  cover,
  deckFooter,
  demoDisplayUrl,
  demos,
  deployment,
  etaNotice,
  forCustomers,
  forHeadOffice,
  forRevenue,
  forTeams,
  growth,
  pageCopy,
  pitchDate,
  pricing,
  promise,
  proposal,
  rush,
  screens,
  solution,
  sources,
  sourcesLabel,
  sourcesNote,
  sourcesTitle,
  walkAway,
  type SourceId,
} from "@/lib/pitch/o-crousti-poulet";

/*
 * La présentation : une diapositive par idée, chacune dessinée à 1 920 ×
 * 1 080 px exactement — l'écran la met à l'échelle, l'impression la pose
 * telle quelle sur une page (deck.css). Les tailles sont donc en pixels de
 * diapositive, pas en unités d'interface. Deux tailles de titre : pleine
 * largeur, et à côté d'une image.
 */

const cardDemo = demos[0];
const reseauDemo = demos[2];
/** La vue réseau sans ses indicateurs : ses trois panneaux, arrêtés au-dessus du graphique. */
const reseauCrop = { x: 0, y: 344, width: 1600, height: 368 };

const titleFull = "text-[96px] font-extrabold leading-[1.04] tracking-[-0.04em]";
const titleSplit = "text-[80px] font-extrabold leading-[1.04] tracking-[-0.04em]";

type SlideProps = { index: number; total: number };

function Footnote({ ids }: { ids: SourceId[] }) {
  return (
    <>
      {sourcesLabel(ids.length)}
      {ids.map((id) => sources[id].short).join(" · ")}
    </>
  );
}

function Slide({
  index,
  total,
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
        {rays && <Rays cx={rays.cx} cy={rays.cy} />}
        <div aria-hidden className="pitch-vignette absolute inset-0" />
        <div className="relative flex h-full flex-col px-[128px] pb-[56px] pt-[96px]">
          {eyebrow && <p className="eyebrow text-[20px] text-(--ocp-muted)">{eyebrow}</p>}
          <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
          <footer className="mt-[28px] flex items-end justify-between gap-[64px] text-[16px] leading-[1.45] text-(--ocp-faint)">
            <p className="max-w-[1380px]">{note}</p>
            <p className="shrink-0 tabular-nums">
              {deckFooter}
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
    <li className="border-l-[3px] border-(--ocp-yellow) pl-[24px]">
      <p className="text-[29px] font-bold leading-[1.18]">{title}</p>
      <p className="mt-[6px] text-[22px] leading-[1.45] text-(--ocp-muted)">{text}</p>
    </li>
  );
}

function CoverSlide(props: SlideProps) {
  return (
    <Slide {...props} note={pitchDate} rays={{ cx: 76, cy: 44 }}>
      <PartnerMarks className="absolute -top-[18px] left-0 text-[40px]" />
      <div className="mt-auto flex items-end justify-between">
        <div>
          <p className="eyebrow text-[22px] text-(--ocp-muted)">{cover.eyebrow}</p>
          <h1 className="mt-[28px] text-[124px] font-extrabold leading-[1.06] tracking-[-0.045em]">
            <span className="block">{cover.title.first}</span>
            <span className="block">
              {cover.title.second.text} <span className="mark mark-start">{cover.title.second.accent}</span>
            </span>
          </h1>
          <p className="mt-[56px] max-w-[900px] text-balance text-[36px] font-medium leading-[1.3] text-(--ocp-muted)">{cover.lead}</p>
        </div>
        <TicketCard number={42} className="mb-[24px] mr-[36px] shrink-0 rotate-[5deg] text-[58px]" />
      </div>
      <ul className="mt-[48px] flex justify-between gap-[48px] border-t border-(--ocp-line) pt-[28px]">
        {pageCopy.heroFacts.map((fact) => (
          <li key={fact.label} className="flex items-center gap-[20px]">
            <span className="font-anton text-[60px] leading-none text-(--ocp-yellow)">{fact.value}</span>
            <span className="max-w-[320px] text-[21px] font-medium leading-[1.3]">{fact.label}</span>
          </li>
        ))}
      </ul>
    </Slide>
  );
}

function GrowthSlide(props: SlideProps) {
  return (
    <Slide {...props} eyebrow={growth.eyebrow} note={<Footnote ids={growth.sources} />} rays={{ cx: 50, cy: 120 }}>
      <h2 className={`mt-[40px] ${titleFull}`}>«&nbsp;{growth.quote}&nbsp;»</h2>
      <p className="mt-[20px] text-[24px] text-(--ocp-faint)">— {growth.quoteSource}</p>
      <p className="mt-auto text-[20px] font-bold uppercase tracking-[0.24em] text-(--ocp-faint)">{growth.unit}</p>
      {/* Chaque flèche au milieu de l'écart entre deux chiffres ; le filet court sous toute la rangée. */}
      <ol className="mt-[20px] grid grid-cols-[auto_1fr_auto_1fr_auto]">
        {growth.steps.map((step, i) => (
          <li key={step.value} className="contents">
            {i > 0 && (
              <span aria-hidden className="flex flex-col">
                <span className="flex h-[246px] items-center justify-center text-[64px] font-light text-(--ocp-yellow)">→</span>
                <span className="mt-[28px] border-t border-(--ocp-line)" />
              </span>
            )}
            <div>
              <p
                className={`font-anton text-[300px] leading-[0.82] tracking-[-0.01em] ${
                  i === 2 ? "text-(--ocp-yellow)" : i === 0 ? "text-(--ocp-faint)" : ""
                }`}
              >
                {step.value}
              </p>
              <p className="mt-[28px] border-t border-(--ocp-line) pt-[22px] text-[28px] font-semibold">{step.label}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-[56px] text-[34px] font-medium text-(--ocp-muted)">
        À chaque ouverture, la même scène&nbsp;: <span className="text-(--ocp-white)">ballons jaunes, file sur le trottoir.</span>
      </p>
    </Slide>
  );
}

function PromiseSlide(props: SlideProps) {
  return (
    <Slide {...props} eyebrow={promise.eyebrow} note={<Footnote ids={promise.sources} />} rays={{ cx: 26, cy: 55 }}>
      <div className="grid flex-1 grid-cols-[1060px_1fr] items-center gap-[64px]">
        <div>
          <h2 className="text-[140px] font-extrabold leading-[1.02] tracking-[-0.05em]">
            <span className="block">«&nbsp;{promise.slogan[0]}</span>
            <span className="block text-(--ocp-yellow)">{promise.slogan[1]}&nbsp;»</span>
          </h2>
          <p className="mt-[28px] text-[24px] text-(--ocp-faint)">— {promise.sloganSource}</p>
        </div>
        <div className="flex flex-col gap-[48px]">
          <div>
            <p className="flex items-start gap-[18px]">
              <span className="font-anton text-[176px] leading-[0.85]">{promise.rating.value}</span>
              <span aria-hidden className="mt-[8px] text-[68px] leading-none text-(--ocp-yellow)">★</span>
            </p>
            <p className="mt-[20px] text-[28px] font-medium text-(--ocp-muted)">{promise.rating.label}</p>
          </div>
          <div className="border-t border-(--ocp-line) pt-[44px]">
            <p className="font-anton text-[128px] leading-[0.85] text-(--ocp-yellow)">{promise.speed.value}</p>
            <p className="mt-[20px] text-[28px] font-medium text-(--ocp-muted)">{promise.speed.label}</p>
            <p className="mt-[6px] text-[22px] text-(--ocp-faint)">{promise.speed.detail}</p>
          </div>
        </div>
      </div>
      <p className="mb-[8px] text-[34px] font-medium text-(--ocp-muted)">{promise.closing}</p>
    </Slide>
  );
}

function RushSlide(props: SlideProps) {
  return (
    <Slide {...props} eyebrow={rush.eyebrow} note={<Footnote ids={rush.sources} />} rays={{ cx: 22, cy: 52 }}>
      <div className="grid flex-1 grid-cols-[820px_1fr] items-center gap-[80px]">
        <div>
          <p className="whitespace-nowrap font-anton text-[250px] leading-[0.85] tracking-[-0.01em]">
            {rush.clock}
            <span className="ml-[8px] inline-block size-[44px] bg-(--ocp-yellow) align-baseline" aria-hidden />
          </p>
          <p className="font-neon mt-[36px] text-[92px] leading-none">{rush.neon}</p>
        </div>
        <div>
          <h2 className="eyebrow text-[20px] text-(--ocp-muted)">{rush.evidence}</h2>
          <ul className="mt-[24px] flex flex-col">
            {rush.items.map((item) => (
              <li key={item.key} className="border-t border-(--ocp-line) py-[24px]">
                <p className="text-[30px] font-bold">{item.key}</p>
                <p className="mt-[6px] text-[23px] leading-[1.45] text-(--ocp-muted)">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Slide>
  );
}

function WalkAwaySlide(props: SlideProps) {
  return (
    <Slide
      {...props}
      eyebrow={walkAway.eyebrow}
      note={<Footnote ids={walkAway.facts.map((fact) => fact.source)} />}
      rays={{ cx: 50, cy: -30 }}
    >
      <blockquote className="mt-[48px]">
        <p className="text-balance text-[72px] font-bold leading-[1.12] tracking-[-0.03em]">
          <span className="block">«&nbsp;{walkAway.quote[0]}</span>
          <span className="block text-(--ocp-yellow)">{walkAway.quote[1]}&nbsp;»</span>
        </p>
        <footer className="mt-[28px] text-[28px] font-medium text-(--ocp-muted)">— {closing.signature}</footer>
      </blockquote>
      <div className="mt-auto grid grid-cols-2 gap-[48px]">
        {walkAway.facts.map((fact) => (
          <div key={fact.value} className="flex items-center gap-[40px] rounded-[28px] bg-(--ocp-surface) px-[44px] py-[36px]">
            <p className="shrink-0 font-anton text-[120px] leading-[0.85]">{fact.value}</p>
            <p className="text-[26px] font-medium leading-[1.4] text-(--ocp-muted)">{fact.text}</p>
          </div>
        ))}
      </div>
      <p className="mb-[56px] mt-[36px] text-[34px] font-extrabold leading-[1.25] tracking-[-0.01em] text-(--ocp-yellow)">{walkAway.followUp}</p>
    </Slide>
  );
}

function SolutionSlide(props: SlideProps) {
  return (
    <Slide {...props} eyebrow={solution.eyebrow} note={clickToOpen} rays={{ cx: 50, cy: 110 }}>
      <div className="mt-[16px] flex items-center justify-between gap-[48px]">
        <h2 className="whitespace-nowrap text-[84px] font-extrabold leading-[1.04] tracking-[-0.04em]">
          {solution.title.text} <span className="mark">{solution.title.accent}</span>
        </h2>
        <p className="max-w-[460px] border-l-[4px] border-(--ocp-yellow) pl-[24px] text-[24px] font-semibold leading-[1.35]">
          {solution.note}
        </p>
      </div>
      <ol className="mt-[44px] grid grid-cols-[repeat(4,380px)] justify-between">
        {solution.steps.map((step, i) => (
          <li key={step.title} className="flex flex-col">
            <a href={cardDemo.href} className="block w-[258px]">
              <PhoneFrame src={screens[step.screen].src} alt={screens[step.screen].alt} sizes="580px" unoptimized className="w-full" />
            </a>
            <div className="mt-[20px] flex items-baseline gap-[14px]">
              <span className="font-anton text-[36px] leading-none text-(--ocp-yellow)">{i + 1}</span>
              <p className="text-[28px] font-bold leading-[1.1]">{step.title}</p>
            </div>
            <p className="mt-[6px] text-[21px] leading-[1.4] text-(--ocp-muted)">{step.text}</p>
          </li>
        ))}
      </ol>
    </Slide>
  );
}

function EtaBadge({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-[18px] border border-(--ocp-yellow)/45 bg-(--ocp-yellow)/[0.06] px-[22px] py-[14px] ${className}`}>
      <p className="text-[16px] font-bold uppercase tracking-[0.2em] text-(--ocp-lemon)">{etaNotice.tag}</p>
      <p className="mt-[4px] text-[19px] leading-[1.4] text-(--ocp-muted)">{etaNotice.text}</p>
    </div>
  );
}

function CustomersSlide(props: SlideProps) {
  return (
    <Slide {...props} note={<Footnote ids={forCustomers.sources} />} rays={{ cx: 20, cy: 60 }}>
      <div className="grid flex-1 grid-cols-[500px_1fr] gap-[112px]">
        <div className="flex items-center justify-center">
          <a href={cardDemo.href} className="block w-[380px]">
            <PhoneFrame src={screens.composer.src} alt={screens.composer.alt} sizes="820px" unoptimized className="w-full" />
          </a>
        </div>
        <div className="flex flex-col justify-center">
          <p className="eyebrow mb-[32px] text-[20px] text-(--ocp-muted)">{forCustomers.eyebrow}</p>
          <h2 className={titleSplit}>
            <span className="block">{forCustomers.title[0]}</span>
            <span className="block">{forCustomers.title[1]}</span>
          </h2>
          <ul className="mt-[40px] flex flex-col gap-[32px]">
            {forCustomers.points.map((point) => (
              <li key={point.title} className="grid grid-cols-[36px_1fr] gap-[16px]">
                <span aria-hidden className="mt-[12px] size-[14px] rounded-full bg-(--ocp-yellow)" />
                <div>
                  <p className="text-[30px] font-bold leading-[1.18]">{point.title}</p>
                  {"text" in point && <p className="mt-[6px] text-[23px] leading-[1.45] text-(--ocp-muted)">{point.text}</p>}
                  <p className="mt-[8px] text-[21px] leading-[1.4] text-(--ocp-faint)">{point.fact}</p>
                  {point.eta && <EtaBadge className="mt-[14px] max-w-[780px]" />}
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
  return (
    <Slide {...props} eyebrow={forTeams.eyebrow} note={<Footnote ids={forTeams.sources} />} rays={{ cx: 78, cy: 50 }}>
      <div className="grid flex-1 grid-cols-[640px_1fr] gap-[72px]">
        <div className="flex flex-col justify-center">
          <h2 className={titleSplit}>
            {forTeams.title.text} <span className="text-(--ocp-yellow)">{forTeams.title.accent}</span>
          </h2>
          <ul className="mt-[40px] flex flex-col gap-[26px]">
            {forTeams.points.map((point) => (
              <Point key={point.title} title={point.title} text={point.text} />
            ))}
          </ul>
        </div>
        <div className="flex flex-col justify-center">
          <a href={demos[1].href} className="block">
            <TabletFrame src={screens.comptoir.src} alt={screens.comptoir.alt} sizes="1900px" unoptimized className="w-full" />
          </a>
          <p className="mt-[16px] text-[19px] text-(--ocp-faint)">
            {forTeams.caption} · {clickToOpen}
          </p>
        </div>
      </div>
      <p className="mt-[28px] border-t border-(--ocp-line) pt-[18px] text-[22px] leading-[1.45] text-(--ocp-muted)">{forTeams.simple}</p>
    </Slide>
  );
}

function RevenueSlide(props: SlideProps) {
  return (
    <Slide
      {...props}
      eyebrow={forRevenue.eyebrow}
      note={<Footnote ids={forRevenue.sources} />}
      rays={{ cx: 70, cy: 62 }}
    >
      <h2 className="mt-[16px] text-balance text-[72px] font-extrabold leading-[1.06] tracking-[-0.04em]">{forRevenue.title}</h2>
      <p className="mt-[20px] max-w-[1560px] text-[26px] font-medium leading-[1.4] text-(--ocp-muted)">{forRevenue.mechanism}</p>
      <div className="my-auto rounded-[28px] border-[2px] border-dashed border-(--ocp-yellow)/45 px-[48px] py-[40px]">
        <p className="text-[18px] font-bold uppercase tracking-[0.22em] text-(--ocp-lemon)">{forRevenue.illustrationLabel}</p>
        <ol className="mt-[24px] grid grid-cols-3 gap-[56px]">
          {forRevenue.sum.map((term) => (
            <li key={term.value}>
              <p className="font-anton text-[96px] leading-none text-(--ocp-yellow)">{term.value}</p>
              <p className="mt-[10px] text-[24px] font-bold">{term.unit}</p>
              <p className="mt-[4px] text-[22px] leading-[1.4] text-(--ocp-muted)">{term.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-[28px] border-t border-(--ocp-line) pt-[18px] text-[19px] leading-[1.45] text-(--ocp-faint)">{forRevenue.beyond}</p>
      </div>
    </Slide>
  );
}

function HeadOfficeSlide(props: SlideProps) {
  return (
    <Slide {...props} eyebrow={forHeadOffice.eyebrow} note={`${forHeadOffice.badge}. ${clickToOpen}`} rays={{ cx: 70, cy: 20 }}>
      <h2 className={`mt-[16px] ${titleSplit}`}>{forHeadOffice.title}</h2>
      <p className="mt-[14px] text-[30px] font-semibold leading-[1.4] text-(--ocp-lemon)">{forHeadOffice.lead}</p>
      <div className="my-auto">
        {/* Les trois parties de l'écran, chacune au-dessus de son panneau : celles de la phrase d'accroche. */}
        <ul className="relative h-[52px]">
          {forHeadOffice.areas.map((area) => (
            <li
              key={area.label}
              className="absolute top-0 flex flex-col items-start"
              style={{ left: `${(area.x / reseauCrop.width) * 100}%` }}
            >
              <span className="text-[19px] font-bold uppercase tracking-[0.2em] text-(--ocp-lemon)">{area.label}</span>
              <span aria-hidden className="mt-[8px] h-[16px] w-[3px] bg-(--ocp-yellow)" />
            </li>
          ))}
        </ul>
        <a href={reseauDemo.href} className="block">
          <BrowserFrame
            src={screens.reseau.src}
            alt={screens.reseau.alt}
            sizes="3200px"
            unoptimized
            url={reseauDemo.href.replace(/^https?:\/\//, "").replace(/\?.*$/, "")}
            badge={forHeadOffice.badge}
            crop={reseauCrop}
            className="w-full text-[17px]"
          />
        </a>
      </div>
    </Slide>
  );
}

function DeploymentSlide(props: SlideProps) {
  return (
    <Slide {...props} eyebrow={deployment.eyebrow} rays={{ cx: 50, cy: 115 }}>
      <h2 className={`mt-[24px] ${titleFull}`}>
        {deployment.title.text} <span className="text-(--ocp-yellow)">{deployment.title.accent}</span>
      </h2>
      <p className="mt-[24px] max-w-[1500px] text-[30px] font-medium leading-[1.4] text-(--ocp-muted)">{deployment.lead}</p>
      <ol className="my-auto grid grid-cols-4 gap-[28px]">
        {deployment.points.map((point) => (
          <li key={point.title} className="flex flex-col rounded-[28px] bg-(--ocp-surface) p-[40px]">
            <span className="eyebrow text-[19px] text-(--ocp-yellow)">{point.label}</span>
            <p className="mt-[22px] text-[31px] font-bold leading-[1.16]">{point.title}</p>
            <p className="mt-[16px] text-[25px] leading-[1.45] text-(--ocp-muted)">{point.text}</p>
          </li>
        ))}
      </ol>
    </Slide>
  );
}

function PriceSlide(props: SlideProps) {
  const { example } = pricing;
  return (
    <Slide {...props} eyebrow={pricing.eyebrow} note={<Footnote ids={pricing.sources} />} rays={{ cx: 16, cy: 30 }}>
      <h2 className="mt-[12px] whitespace-nowrap text-[76px] font-extrabold leading-[1.04] tracking-[-0.04em]">
        <span className="block">{pricing.headline.subscription}</span>
        <span className="block">
          <span className="mark mark-start">{pricing.headline.commission}</span> {pricing.headline.basis}
        </span>
      </h2>
      <p className="mt-[36px] max-w-[1600px] text-[25px] font-medium leading-[1.4] text-(--ocp-muted)">{pricing.lead}</p>
      <div className="my-auto grid grid-cols-[560px_1fr] items-start gap-[64px]">
        <div className="rounded-[28px] bg-(--ocp-surface) px-[40px] py-[32px]">
          <p className="text-[24px] font-semibold">{example.label}</p>
          <dl className="mt-[18px] flex flex-col gap-[10px] text-[23px]">
            {example.lines.map((line) => (
              <div key={line.label} className="flex justify-between gap-[24px] text-(--ocp-muted)">
                <dt>{line.label}</dt>
                <dd className="tabular-nums">{line.value}</dd>
              </div>
            ))}
            <div className="mt-[6px] flex items-baseline justify-between border-t border-dashed border-(--ocp-line) pt-[16px]">
              <dt className="font-bold">{example.totalLabel}</dt>
              <dd className="text-right">
                <span className="block font-anton text-[64px] leading-none text-(--ocp-yellow)">{example.total}</span>
                <span className="mt-[6px] block text-[19px] text-(--ocp-faint)">{example.share}</span>
              </dd>
            </div>
            <div className="mt-[8px] flex justify-between gap-[24px] text-(--ocp-muted)">
              <dt>{example.counter.label}</dt>
              <dd className="tabular-nums">{example.counter.value}</dd>
            </div>
            <div className="flex justify-between gap-[24px] font-bold">
              <dt>{example.extra.label}</dt>
              <dd className="tabular-nums">{example.extra.value}</dd>
            </div>
          </dl>
          <p className="mt-[12px] text-[19px] leading-[1.45] text-(--ocp-faint)">{example.compare}</p>
        </div>
        <div>
          <p className="text-[18px] font-bold uppercase tracking-[0.2em] text-(--ocp-faint)">{pricing.comparisonTitle}</p>
          <table className="mt-[8px] w-full border-collapse text-left">
            <tbody>
              {pricing.comparison.map((row) => (
                <tr key={row.name} className="border-b border-(--ocp-line)">
                  <th scope="row" className="w-[330px] py-[14px] pr-[24px] align-top text-[25px] font-bold">
                    {row.name}
                  </th>
                  <td className="py-[14px] text-[22px] leading-[1.4] text-(--ocp-muted)">{row.model}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-[24px] text-[26px] font-bold">{pricing.noOnline}</p>
          <p className="mt-[12px] text-[20px] leading-[1.45] text-(--ocp-faint)">
            {pricing.cardFees} {pricing.vat}
          </p>
        </div>
      </div>
    </Slide>
  );
}

function ProposalSlide(props: SlideProps) {
  const columns = [
    { ...proposal.pilot, tone: "bg-(--ocp-yellow) text-(--ocp-black)" },
    { ...proposal.network, tone: "bg-(--ocp-surface)" },
  ];
  return (
    <Slide {...props} eyebrow={proposal.eyebrow} note={<Footnote ids={proposal.measures.sources} />} rays={{ cx: 20, cy: 110 }}>
      <h2 className={`mt-[16px] ${titleSplit}`}>{proposal.title}</h2>
      <div className="my-auto">
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
          <div className="rounded-[28px] bg-(--ocp-surface) px-[36px] py-[34px]">
            <p className="text-[18px] font-bold uppercase tracking-[0.22em] opacity-70">{proposal.measures.title}</p>
            <p className="mt-[14px] text-[32px] font-extrabold leading-[1.12] tracking-[-0.01em]">{proposal.measures.lead}</p>
            <ul className="mt-[20px] flex flex-col gap-[10px]">
              {proposal.measures.points.map((point) => (
                <li key={point} className="flex gap-[14px] text-[20px] leading-[1.4] opacity-90">
                  <span aria-hidden className="mt-[10px] size-[10px] shrink-0 rounded-full bg-(--ocp-yellow)" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-[28px] text-[21px] leading-[1.45] text-(--ocp-muted)">
          <span className="font-bold text-(--ocp-white)">{forCustomers.scan.question}</span> {forCustomers.scan.answer}
        </p>
      </div>
    </Slide>
  );
}

function ClosingSlide(props: SlideProps) {
  return (
    <Slide {...props} eyebrow={closing.eyebrow} rays={{ cx: 80, cy: 46 }}>
      <div className="grid flex-1 grid-cols-[1fr_480px] items-center gap-[120px]">
        <div>
          <h2 className="text-[108px] font-extrabold leading-[1.02] tracking-[-0.045em]">
            <span className="block">{closing.title[0]}</span>
            <span className="block">{closing.title[1]}</span>
          </h2>
          <ol className="mt-[32px] flex flex-col gap-[12px]">
            {closing.steps.map((step, i) => (
              <li key={step} className="flex items-center gap-[18px]">
                <span className="flex size-[46px] shrink-0 items-center justify-center rounded-full border-[2px] border-(--ocp-yellow) font-anton text-[24px] text-(--ocp-yellow)">
                  {i + 1}
                </span>
                <span className="text-[28px] font-semibold">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-[32px] max-w-[1000px] text-[25px] font-medium leading-[1.4]">{closing.reference}</p>
          <div className="mt-[24px] flex items-center gap-[28px]">
            <a
              href={contact.mailto}
              className="inline-flex items-center rounded-full bg-(--ocp-yellow) px-[40px] py-[18px] text-[30px] font-bold text-(--ocp-black)"
            >
              {closing.mail}&nbsp;→
            </a>
            <a href={contact.mailto} className="text-[24px] font-medium text-(--ocp-white)">
              {contact.email}
            </a>
          </div>
          <p className="mt-[24px] text-[22px] font-semibold">{closing.interlocutor}</p>
          <p className="mt-[6px] max-w-[1000px] text-[19px] leading-[1.45] text-(--ocp-faint)">{closing.company}</p>
        </div>
        <div className="flex flex-col items-center text-center">
          <p className="text-[26px] font-semibold">{closing.scanTitle}</p>
          <p className="font-neon mt-[4px] text-[72px] leading-[1.15]">{closing.neon}</p>
          <a href={cardDemo.href} className="mt-[18px] block rounded-[32px] bg-(--ocp-yellow) p-[34px] text-(--ocp-black) shadow-[0_0_120px_rgba(247,238,33,0.18)]">
            <QrCode value={cardDemo.href} label={`QR code vers ${demoDisplayUrl}`} className="size-[290px]" />
          </a>
          <a href={cardDemo.href} className="mt-[18px] text-[18px] font-medium text-(--ocp-muted)">
            {demoDisplayUrl}
          </a>
        </div>
      </div>
      <div className="mt-[48px] flex items-center gap-[40px] text-[32px]">
        <OcpLockup coq={false} />
        <span aria-hidden className="text-[22px] text-(--ocp-faint)">×</span>
        <OmininMark className="text-[30px]" />
      </div>
    </Slide>
  );
}

function SourcesSlide(props: SlideProps) {
  return (
    <Slide {...props} eyebrow={sourcesTitle}>
      <ul className="mt-[40px] columns-2 gap-[72px] text-[17px] leading-[1.45]">
        {Object.values(sources).map((source) => (
          <li key={source.full} className="mb-[18px] break-inside-avoid">
            <p className="text-(--ocp-white)">{source.full}</p>
            {"url" in source && source.url && (
              <a href={source.url} className="text-[15px] text-(--ocp-faint) underline decoration-(--ocp-line) underline-offset-4">
                {new URL(source.url).hostname.replace(/^www\./, "")}
              </a>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-auto flex items-center gap-[16px] text-[18px] text-(--ocp-faint)">
        <Coq className="h-[26px] w-auto text-(--ocp-faint)" />
        {sourcesNote}
      </p>
    </Slide>
  );
}

const SLIDES = [
  CoverSlide,
  GrowthSlide,
  PromiseSlide,
  RushSlide,
  WalkAwaySlide,
  SolutionSlide,
  CustomersSlide,
  TeamsSlide,
  HeadOfficeSlide,
  DeploymentSlide,
  PriceSlide,
  RevenueSlide,
  ProposalSlide,
  ClosingSlide,
  SourcesSlide,
];

export function Deck() {
  return (
    <main className="deck">
      {SLIDES.map((SlideContent, i) => (
        <SlideContent key={i} index={i + 1} total={SLIDES.length} />
      ))}
    </main>
  );
}
