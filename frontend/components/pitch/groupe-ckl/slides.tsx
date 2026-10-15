import Image from "next/image";
import { Fragment, type CSSProperties } from "react";
import { OmininMark, ReviewStars } from "@/components/pitch/brand";
import { PhoneFrame, TabletFrame } from "@/components/pitch/devices";
import { QrCode } from "@/components/pitch/qr-code";
import {
  contact,
  deck,
  displayUrl,
  groupBoxes,
  groupCrop,
  groupDemo,
  groupHours,
  motion,
  paymentCrop,
  salleDemo,
  screens,
  sources,
  venueBySlug,
  venues,
} from "@/lib/pitch/groupe-ckl";
import { pitchUi, raceBarWidth, screenSizes } from "@/lib/pitch/kit";
import { anim, Eyebrow, Slide, Sources, Title, VenueMark } from "./parts";

/*
 * Les diapositives du Groupe CKL, dans l'ordre du récit : ce qu'Ominin fait,
 * leurs cartes déjà construites, la salle, le happy hour, le branchement, la
 * vue groupe, la preuve, la mise en route. Le texte vient de
 * lib/pitch/groupe-ckl ; ici, la mise en page et l'ordre des entrées.
 */

type SlideProps = { index: number; total: number };

function Cover(props: SlideProps) {
  const c = deck.cover;
  return (
    <Slide {...props} label={c.title.join(" ")} note={deck.date} glow={{ x: 86, y: 6 }}>
      <div className="flex items-center justify-between">
        <div {...anim("fade")}>
          <OmininMark className="text-[40px]" />
        </div>
        <p className="ckl-eyebrow" {...anim("fade", 1)}>
          {c.eyebrow}
        </p>
      </div>
      <div className="mt-auto">
        <h1 className="ckl-display text-[148px] leading-[0.98] tracking-[-0.035em]" {...anim("rise", 5)}>
          <span className="block">{c.title[0]}</span>
          <span className="ckl-accent block">{c.title[1]}</span>
        </h1>
        <p className="mt-[40px] max-w-[1200px] text-balance text-[31px] leading-[1.42] text-(--ckl-muted)" {...anim("rise", 6)}>
          {c.lead}
        </p>
      </div>
      {/* Les quatre adresses arrivent de loin et se rangent côte à côte. */}
      <ul className="mt-[72px] grid grid-cols-4 gap-[28px]">
        {venues.map((venue, i) => (
          <li
            key={venue.slug}
            className="flex items-center gap-[22px] border-t-[3px] pt-[26px]"
            {...anim("converge", 1 + i * 0.5, { borderColor: venue.color, "--from-x": `${(i - 1.5) * motion.convergePx}px` } as CSSProperties)}
          >
            <VenueMark venue={venue} size={84} />
            <div className="min-w-0">
              <p className="ckl-display text-[31px] leading-[1.1]">{venue.name}</p>
              <p className="mt-[6px] text-[19px] text-(--ckl-faint)">{venue.address}</p>
            </div>
          </li>
        ))}
      </ul>
    </Slide>
  );
}

function Seen(props: SlideProps) {
  const s = deck.seen;
  return (
    <Slide {...props} label={s.title.join(" ")} note={<Sources ids={s.sources} />} glow={{ x: 12, y: 0 }}>
      <Eyebrow>{s.eyebrow}</Eyebrow>
      <h2 className="ckl-display mt-[22px] text-[76px] leading-[1.04]" {...anim("rise", 1)}>
        <span className="block">{s.title[0]}</span>
        <span className="ckl-accent block">{s.title[1]}</span>
      </h2>
      <div className="mt-[44px] grid min-h-0 flex-1 grid-cols-[1fr_800px] gap-[72px]">
        <div className="flex flex-col">
          <ul className="grid grid-cols-2 gap-x-[48px] gap-y-[34px]">
            {s.capacities.map((fact, i) => (
              <li
                key={fact.label}
                className="border-l-[3px] pl-[24px]"
                {...anim("rise", 2 + i * 0.5, { borderColor: venueBySlug(fact.venue).color })}
              >
                <p className="ckl-figure text-[76px]">{fact.value}</p>
                <p className="mt-[12px] text-[20px] leading-[1.38] text-(--ckl-muted)">{fact.label}</p>
              </li>
            ))}
          </ul>
          <ul className="mt-auto grid grid-cols-3 gap-[32px] border-t border-(--ckl-line) pt-[26px]">
            {s.hours.map((fact, i) => (
              <li key={fact.label} {...anim("fade", 5 + i * 0.5)}>
                <p className="ckl-figure whitespace-nowrap text-[42px] text-(--ckl-amber)">{fact.value}</p>
                <p className="mt-[10px] text-[19px] leading-[1.35] text-(--ckl-muted)">{fact.label}</p>
              </li>
            ))}
          </ul>
        </div>
        <ul className="grid auto-rows-fr gap-[18px]">
          {s.quotes.map((quote, i) => {
            const venue = venueBySlug(quote.venue);
            return (
              <li key={quote.text} className="ckl-card flex flex-col justify-center px-[40px] py-[28px]" {...anim("rise", 3 + i)}>
                <div className="flex items-center gap-[14px] text-[18px] text-(--ckl-faint)">
                  <VenueMark venue={venue} size={34} />
                  <span className="font-semibold text-(--ckl-muted)">{venue.name}</span>
                  <ReviewStars stars={quote.stars} className="ml-auto text-[18px] tracking-[0.16em]" />
                  <span>{quote.meta}</span>
                </div>
                <p className="ckl-display mt-[18px] text-[40px] leading-[1.2] tracking-[-0.015em]">«&nbsp;{quote.text}&nbsp;»</p>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="mt-[34px] border-l-[3px] border-(--ckl-amber) pl-[24px] text-[25px] font-semibold leading-[1.4]" {...anim("fade", 7)}>
        {s.respect}
      </p>
    </Slide>
  );
}

function How(props: SlideProps) {
  const h = deck.how;
  return (
    <Slide {...props} label={`${h.title.text} ${h.title.accent}`} note={pitchUi.clickToOpen} glow={{ x: 50, y: 105 }}>
      <div className="flex items-end justify-between gap-[64px]">
        <div>
          <Eyebrow>{h.eyebrow}</Eyebrow>
          <Title title={h.title} size={80} split className="mt-[22px]" />
        </div>
        <p className="mb-[8px] max-w-[520px] border-l-[3px] border-(--ckl-amber) pl-[24px] text-[23px] font-medium leading-[1.42]" {...anim("fade", 2)}>
          {h.note}
        </p>
      </div>
      <ol className="mt-auto grid grid-cols-5 gap-[36px]">
        {h.steps.map((step, i) => (
          <li key={step.title} className="flex flex-col" {...anim("rise", 2 + i)}>
            <a href={h.demo} className="block" tabIndex={i ? -1 : undefined}>
              <PhoneFrame src={step.screen.src} alt={step.screen.alt} sizes="900px" unoptimized crop={step.crop} className="w-full" />
            </a>
            <div className="mt-[24px] flex items-baseline gap-[14px]">
              <span className="ckl-figure text-[40px] text-(--ckl-amber)">{i + 1}</span>
              <p className="text-[27px] font-semibold leading-[1.15]">{step.title}</p>
            </div>
            <p className="mt-[8px] text-[20px] leading-[1.42] text-(--ckl-muted)">{step.text}</p>
          </li>
        ))}
      </ol>
    </Slide>
  );
}

/** La largeur des téléphones de « Vos cartes », en px de diapositive. */
const carteWidth = 252;

function Cartes(props: SlideProps) {
  const c = deck.cartes;
  return (
    <Slide {...props} label={`${c.title.text} ${c.title.accent}`} note={<Sources ids={c.sources} extra={c.note} />} glow={{ x: 50, y: -10 }}>
      <div className="flex items-end justify-between gap-[64px]">
        <div>
          <Eyebrow>{c.eyebrow}</Eyebrow>
          <Title title={c.title} size={80} className="mt-[22px]" />
        </div>
        <p className="mb-[10px] max-w-[600px] border-l-[3px] border-(--ckl-amber) pl-[24px] text-[23px] font-medium leading-[1.42]" {...anim("fade", 2)}>
          {c.lead}
        </p>
      </div>
      <ul className="mt-auto grid grid-cols-4 gap-[40px]">
        {venues.map((venue, i) => (
          <li key={venue.slug} className="flex flex-col items-center" {...anim("rise", 2 + i)}>
            {venue.demo ? (
              <a href={venue.demo} className="block" style={{ width: carteWidth }} tabIndex={-1}>
                <PhoneFrame src={screens.carte(venue.slug)} alt={`La carte ${venue.name}, à la table 12`} sizes="600px" unoptimized className="w-full" />
              </a>
            ) : (
              <PendingPhone width={carteWidth} label={c.pendingLabel} name={venue.name} color={venue.color} />
            )}
            <div className="mt-[26px] flex w-full items-center gap-[20px]">
              {venue.demo ? (
                <a href={venue.demo} className="ckl-qr shrink-0 p-[10px]">
                  <QrCode value={venue.demo} label={`QR code vers la carte ${venue.name}`} className="size-[92px]" />
                </a>
              ) : (
                <VenueMark venue={venue} size={112} />
              )}
              <div className="min-w-0">
                <p className="flex items-center gap-[10px] text-[25px] font-semibold leading-[1.15]">
                  <span aria-hidden className="size-[10px] shrink-0 rounded-full" style={{ background: venue.color }} />
                  {venue.name}
                </p>
                <p className="mt-[6px] text-[18px] text-(--ckl-faint)">{venue.address}</p>
                {venue.demo && <DemoUrl url={venue.demo} />}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Slide>
  );
}

/** L'adresse d'une démo sur deux lignes, coupée avant son nom : « menu.ominin.com/demo/ », puis le nom. */
function DemoUrl({ url }: { url: string }) {
  const path = displayUrl(url).replace(/\?.*$/, "");
  const cut = path.lastIndexOf("/") + 1;
  return (
    <p className="mt-[4px] text-[14px] leading-[1.35] text-(--ckl-muted)">
      <span className="block">{path.slice(0, cut)}</span>
      <span className="block">{path.slice(cut)}</span>
    </p>
  );
}

/** La place d'un téléphone dont la carte n'est pas encore faite : son contour, rien d'inventé dedans. */
function PendingPhone({ width, label, name, color }: { width: number; label: string; name: string; color: string }) {
  const { width: w, height: h } = screenSizes.phone;
  return (
    <div
      className="flex flex-col items-center justify-center gap-[14px] rounded-[13%/6%] border-[2px] border-dashed text-center"
      style={{ width, aspectRatio: `${w} / ${h}`, borderColor: `color-mix(in srgb, ${color} 55%, transparent)` }}
    >
      <p className="ckl-display px-[20px] text-[30px] leading-[1.1]">{name}</p>
      <p className="text-[16px] font-semibold uppercase tracking-[0.2em] text-(--ckl-faint)">{label}</p>
    </div>
  );
}

function Staff(props: SlideProps) {
  const s = deck.staff;
  return (
    <Slide {...props} label={`${s.title.text} ${s.title.accent}`} note={pitchUi.clickToOpen} glow={{ x: 88, y: 20 }}>
      <div className="grid min-h-0 flex-1 grid-cols-[640px_1fr] gap-[64px]">
        <div className="flex flex-col">
          <Eyebrow>{s.eyebrow}</Eyebrow>
          <Title title={s.title} size={76} split className="mt-[22px]" />
          <p className="mt-[22px] text-[24px] leading-[1.42] text-(--ckl-muted)" {...anim("rise", 2)}>
            {s.lead}
          </p>
          <ul className="mt-[34px] flex flex-col gap-[24px]">
            {s.points.map((point, i) => (
              <li key={point.title} className="border-l-[3px] border-(--ckl-amber) pl-[24px]" {...anim("rise", 3 + i)}>
                <p className="text-[25px] font-semibold leading-[1.2]">{point.title}</p>
                <p className="mt-[6px] text-[20px] leading-[1.42] text-(--ckl-muted)">{point.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-auto border-t border-(--ckl-line) pt-[20px] text-[21px] leading-[1.45] text-(--ckl-muted)" {...anim("fade", 6)}>
            {s.tips}
          </p>
        </div>
        <div className="flex flex-col justify-center" {...anim("rise", 2)}>
          <a href={salleDemo} className="block">
            <TabletFrame src={screens.salle.src} alt={screens.salle.alt} sizes="2000px" unoptimized className="w-full" />
          </a>
          <p className="mt-[16px] text-[18px] text-(--ckl-faint)">{s.caption}</p>
        </div>
      </div>
    </Slide>
  );
}

function Happy(props: SlideProps) {
  const h = deck.happy;
  const novelty = venueBySlug("le-novelty");
  return (
    <Slide {...props} label={`${h.title.text} ${h.title.accent}`} note={<Sources ids={h.sources} />} glow={{ x: 60, y: 0 }}>
      <Eyebrow>{h.eyebrow}</Eyebrow>
      <Title title={h.title} size={76} className="mt-[22px]" />
      <div className="mt-auto grid grid-cols-[480px_300px_1fr] gap-[56px]">
        <figure className="ckl-card flex flex-col justify-between px-[36px] py-[34px]" {...anim("rise", 2)}>
          <div>
            <ReviewStars stars={1} className="text-[20px] tracking-[0.16em]" />
            <blockquote className="ckl-display mt-[16px] text-[38px] leading-[1.22]">«&nbsp;{h.quote}&nbsp;»</blockquote>
            <figcaption className="mt-[22px] flex items-center gap-[12px] text-[18px] text-(--ckl-faint)">
              <VenueMark venue={novelty} size={30} />
              {h.quoteMeta}
            </figcaption>
          </div>
          <p className="border-t border-(--ckl-line) pt-[24px] text-[22px] font-medium leading-[1.42] text-(--ckl-muted)">{h.explain}</p>
        </figure>
        <div {...anim("rise", 3)}>
          <a href={novelty.demo} className="block">
            <PhoneFrame src={screens.happy.src} alt={screens.happy.alt} sizes="600px" unoptimized className="w-full" />
          </a>
          <p className="mt-[14px] text-[17px] leading-[1.4] text-(--ckl-faint)">{h.today}</p>
        </div>
        <div className="flex flex-col justify-between gap-[22px]">
          <div className="ckl-card px-[32px] py-[24px]" {...anim("rise", 4)}>
            <p className="text-[16px] font-bold uppercase tracking-[0.2em] text-(--ckl-amber)">{h.rule.where}</p>
            <p className="mt-[8px] text-[26px] font-semibold">{h.rule.label}</p>
            <dl className="mt-[14px] grid grid-cols-[auto_1fr] gap-x-[28px] gap-y-[6px] text-[20px]">
              {(["target", "days", "window", "change"] as const).map((key) => [h.rule.terms[key], h.rule[key]]).map(([term, value]) => (
                <div key={term} className="contents">
                  <dt className="text-(--ckl-faint)">{term}</dt>
                  <dd className="tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="grid grid-cols-2 gap-[18px]">
            {h.states.map((state, i) => (
              <div
                key={state.time}
                className={`rounded-[24px] px-[26px] py-[20px] ${i ? "border-[2px] border-(--ckl-amber) bg-(--ckl-surface)" : "ckl-card"}`}
                {...anim("rise", 5 + i)}
              >
                <p className={`text-[16px] font-bold uppercase tracking-[0.16em] ${i ? "text-(--ckl-amber)" : "text-(--ckl-faint)"}`}>
                  {state.time} · {state.label}
                </p>
                <p className="mt-[10px] flex items-baseline gap-[16px]">
                  <span className="ckl-figure text-[68px]">{state.price}</span>
                  {"struck" in state && (
                    <span className="ckl-struck text-[28px]" style={{ "--i": 6 } as CSSProperties}>
                      {state.struck}
                    </span>
                  )}
                </p>
                <p className="mt-[8px] text-[18px] text-(--ckl-muted)">{state.detail}</p>
              </div>
            ))}
          </div>
          <p className="text-[22px] font-semibold leading-[1.42]" {...anim("fade", 7)}>
            {h.takeaway}
          </p>
          <p className="text-[18px] leading-[1.4] text-(--ckl-faint)" {...anim("fade", 8)}>
            {h.midnight}
          </p>
        </div>
      </div>
    </Slide>
  );
}

/*
 * Le schéma du branchement, en px de diapositive : le téléphone payé, Ominin
 * au centre, trois destinations empilées autour de l'axe. Les liaisons sont
 * horizontales ; chaque impulsion les parcourt par une simple translation
 * (--length).
 */
const diagram = {
  height: 430,
  /** Le téléphone, son centre à peu près sur l'axe (le cadre recadré fait ≈ 310 px de haut). */
  phone: { width: 232, top: 64 },
  hub: { left: 460, width: 300, height: 402 },
  cards: { left: 890, height: 118, gap: 20 },
  /** L'écart entre un trait et ce qu'il relie. */
  gap: 18,
};

function Connect(props: SlideProps) {
  const c = deck.connect;
  const { phone, hub, cards, gap } = diagram;
  const axis = diagram.height / 2;
  const rows = [-1, 0, 1].map((row) => axis + row * (cards.height + cards.gap));
  const links = [
    { left: phone.width + gap, top: axis, length: hub.left - phone.width - 2 * gap },
    ...rows.map((row) => ({ left: hub.left + hub.width + gap, top: row, length: cards.left - hub.left - hub.width - 2 * gap })),
  ];
  const destinations = [c.till, c.printers, c.accounts];
  return (
    <Slide {...props} label={`${c.title.text} ${c.title.accent}`} glow={{ x: 50, y: 50 }}>
      <Eyebrow>{c.eyebrow}</Eyebrow>
      <Title title={c.title} size={80} className="mt-[22px]" />
      <p className="mt-[18px] max-w-[1560px] text-[24px] leading-[1.42] text-(--ckl-muted)" {...anim("rise", 2)}>
        {c.landing}
      </p>
      <div className="relative mt-auto" style={{ height: diagram.height }}>
        <div className="absolute left-0" {...anim("rise", 3, { top: phone.top, width: phone.width })}>
          <PhoneFrame src={screens.paiement.src} alt={screens.paiement.alt} sizes="600px" unoptimized crop={paymentCrop} className="w-full" />
          <p className="mt-[12px] text-center text-[17px] font-semibold text-(--ckl-muted)">{c.order}</p>
        </div>
        {links.map((link, i) => (
          <Fragment key={i}>
            <div className="ckl-link" {...anim("wipe", i ? 5 : 4, { left: link.left, top: link.top, width: link.length })} />
            {/* L'impulsion du téléphone part la première ; celles des destinations suivent. */}
            <span className="ckl-pulse" style={{ left: link.left, top: link.top, "--length": `${link.length}px`, "--i": i ? 1 + i : 0 } as CSSProperties} />
          </Fragment>
        ))}
        <div
          className="ckl-card absolute flex flex-col items-center justify-center gap-[28px] border-[2px] border-(--ckl-amber)/50"
          {...anim("pop", 4, { left: hub.left, top: axis - hub.height / 2, width: hub.width, height: hub.height })}
        >
          <OmininMark className="text-[44px]" />
          <ul className="flex flex-col items-center gap-[10px]">
            {c.hub.map((step) => (
              <li key={step} className="rounded-full bg-(--ckl-raised) px-[22px] py-[8px] text-[19px] font-semibold text-(--ckl-muted)">
                {step}
              </li>
            ))}
          </ul>
        </div>
        {destinations.map((destination, i) => (
          <div
            key={destination.label}
            className="ckl-card absolute right-0 flex items-center gap-[32px] px-[32px]"
            {...anim("rise", 5 + i, { left: cards.left, top: rows[i] - cards.height / 2, height: cards.height })}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[24px] font-semibold leading-[1.2]">{destination.label}</p>
              <p className="mt-[6px] text-[18px] leading-[1.4] text-(--ckl-muted)">{destination.text}</p>
            </div>
            {i === 0 && (
              <ul className="grid shrink-0 grid-cols-5 gap-[8px]" aria-label={c.till.partners.map((partner) => partner.name).join(", ")}>
                {c.till.partners.map((partner) => (
                  <li key={partner.name} className="size-[40px] overflow-hidden rounded-[10px] bg-white">
                    <Image
                      src={partner.icon.src}
                      alt=""
                      width={80}
                      height={80}
                      unoptimized
                      className={`size-full ${partner.icon.bleed ? "object-cover" : "object-contain p-[5px]"}`}
                    />
                  </li>
                ))}
              </ul>
            )}
            {i === 1 && (
              <ul className="flex shrink-0 gap-[10px]">
                {c.printers.stations.map((station) => (
                  <li key={station} className="rounded-[10px] border border-dashed border-(--ckl-line) bg-(--ckl-raised) px-[18px] py-[10px] text-[17px] font-semibold">
                    {station}
                  </li>
                ))}
              </ul>
            )}
            {i === 2 && (
              <ul className="flex shrink-0 gap-[10px]">
                {venues.map((venue) => (
                  <li key={venue.slug}>
                    <VenueMark venue={venue} size={40} alt={venue.name} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <div className="mt-[30px] flex items-center gap-[40px] rounded-[24px] border-[2px] border-dashed border-(--ckl-amber)/55 px-[36px] py-[22px]" {...anim("rise", 8)}>
        <p className="ckl-display shrink-0 text-[42px] text-(--ckl-amber)">{c.question}</p>
        <p className="text-[21px] leading-[1.42] text-(--ckl-muted)">{c.answer}</p>
      </div>
    </Slide>
  );
}

/** La vue groupe dans la diapositive, en px : la largeur de son écran et de ses heures fortes. */
const groupWidth = 980;
type Box = { x: number; y: number; width: number; height: number };

/** L'air laissé entre une zone mesurée et son liseré, en px de la capture : le liseré ne touche pas le texte. */
const zonePad = 8;
/** Une zone de la vue groupe, en % de son écran recadré. */
const zone = (box: Box) => ({
  left: `${((box.x - zonePad - groupCrop.x) / groupCrop.width) * 100}%`,
  top: `${((box.y - zonePad - groupCrop.y) / groupCrop.height) * 100}%`,
  width: `${((box.width + 2 * zonePad) / groupCrop.width) * 100}%`,
  height: `${((box.height + 2 * zonePad) / groupCrop.height) * 100}%`,
});

/** Un repère de la vue groupe : son projecteur, son liseré et son numéro, au pas des autres. */
function Mark({ box, i }: { box: Box; i: number }) {
  return (
    <>
      <span className="ckl-spot" style={{ ...zone(box), "--i": i } as CSSProperties} />
      <span className="ckl-zone" style={{ ...zone(box), "--i": i } as CSSProperties} data-anim="pop" data-step="">
        <span className="ckl-pin">{i + 1}</span>
      </span>
    </>
  );
}

function Group(props: SlideProps) {
  const g = deck.group;

  return (
    <Slide {...props} label={`${g.title.text} ${g.title.accent}`} note={<Sources ids={g.sources} />} glow={{ x: 75, y: 0 }}>
      <Eyebrow>{g.eyebrow}</Eyebrow>
      <Title title={g.title} size={76} className="mt-[20px]" />
      <p className="mt-[16px] max-w-[1600px] text-[23px] leading-[1.42] text-(--ckl-muted)" {...anim("rise", 2)}>
        {g.lead}
      </p>
      <div className="mt-auto grid grid-cols-[auto_1fr] gap-[56px]">
        <div className="flex flex-col gap-[18px]" style={{ width: groupWidth }}>
          <a href={groupDemo} className="device-browser block text-[15px]" tabIndex={-1} {...anim("rise", 3)}>
            <span className="device-browser-bar" aria-hidden>
              <span className="device-browser-dots">
                <span />
                <span />
                <span />
              </span>
              <span className="device-browser-url">{displayUrl(groupDemo)}</span>
              <span className="device-browser-badge">{g.badge}</span>
            </span>
            <span className="ckl-screen block" style={{ aspectRatio: `${groupCrop.width} / ${groupCrop.height}` }}>
              <Image
                src={screens.groupe.src}
                alt={screens.groupe.alt}
                width={screenSizes.desktop.width}
                height={screenSizes.desktop.height}
                sizes="2200px"
                unoptimized
                style={{ width: `${(screenSizes.desktop.width / groupCrop.width) * 100}%`, marginTop: `${(-groupCrop.y / groupCrop.width) * 100}%` }}
              />
              {(["revenue", "late", "open"] as const).map((id, i) => (
                <Mark key={id} box={groupBoxes[id]} i={i} />
              ))}
            </span>
          </a>
          {/* Le liseré et son numéro hors de la capture, qui coupe ce qui la déborde : ils l'entourent. */}
          <a href={groupDemo} className="relative block" tabIndex={-1} {...anim("rise", 4)}>
            <span className="ckl-screen block rounded-[14px]">
              <Image src={screens.heures.src} alt={screens.heures.alt} width={groupHours.width} height={groupHours.height} sizes="2000px" unoptimized className="h-auto w-full" />
            </span>
            <span className="ckl-zone inset-0" style={{ "--i": 3 } as CSSProperties} data-anim="pop" data-step="">
              <span className="ckl-pin">4</span>
            </span>
          </a>
        </div>
        <div className="flex flex-col">
          <ol className="flex flex-col gap-[22px]">
            {g.callouts.map((callout, i) => (
              <li key={callout.id} className="flex gap-[18px]" style={{ "--i": i } as CSSProperties} data-anim="rise" data-step="">
                <span className="ckl-pin size-[40px] text-[22px]">{i + 1}</span>
                <div>
                  <p className="text-[24px] font-semibold leading-[1.25]">{callout.title}</p>
                  <p className="mt-[4px] text-[19px] leading-[1.4] text-(--ckl-muted)">{callout.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-auto border-l-[3px] border-(--ckl-amber) pl-[20px] text-[19px] leading-[1.45] text-(--ckl-muted)" {...anim("fade", 5)}>
            {g.demoNote}
          </p>
          <div className="mt-[28px] flex items-center gap-[24px]" {...anim("fade", 5)}>
            <a href={groupDemo} className="ckl-qr shrink-0 p-[10px]">
              <QrCode value={groupDemo} label={`QR code vers ${displayUrl(groupDemo)}`} className="size-[96px]" />
            </a>
            <div>
              <p className="text-[22px] font-semibold">{g.scan}</p>
              <p className="mt-[4px] text-[17px] text-(--ckl-muted)">{displayUrl(groupDemo)}</p>
            </div>
          </div>
        </div>
      </div>
    </Slide>
  );
}

function Proof(props: SlideProps) {
  const p = deck.proof;
  const longest = Math.max(...p.race.map((lane) => lane.seconds));
  return (
    <Slide {...props} label={`${p.title.text} ${p.title.accent}`} note={<Sources ids={p.sources} />} glow={{ x: 10, y: 20 }}>
      <Eyebrow>{p.eyebrow}</Eyebrow>
      <Title title={p.title} size={80} className="mt-[22px] max-w-[1500px]" />
      <p className="mt-[22px] max-w-[1480px] text-[23px] leading-[1.45] text-(--ckl-muted)" {...anim("rise", 2)}>
        {p.context}
      </p>
      <div className="my-auto flex flex-col gap-[40px]">
        <p className="text-[17px] font-bold uppercase tracking-[0.18em] text-(--ckl-faint)" {...anim("fade", 3)}>
          {p.raceLabel}
        </p>
        {p.race.map((lane, i) => (
          <div key={lane.label} className="grid grid-cols-[380px_1fr_380px] items-center gap-[36px]" {...anim("fade", 3)}>
            <p className="text-[28px] font-semibold leading-[1.2]">{lane.label}</p>
            <div className="h-[44px] rounded-full bg-(--ckl-surface)">
              <div
                className="ckl-race-bar"
                style={{ width: raceBarWidth(lane.seconds, longest), background: i ? "var(--ckl-muted)" : "var(--ckl-amber)", "--seconds": lane.seconds } as CSSProperties}
                data-anim="grow"
              />
            </div>
            <p className={`ckl-figure whitespace-nowrap text-right text-[104px] ${i ? "" : "text-(--ckl-amber)"}`}>{lane.value}</p>
          </div>
        ))}
      </div>
      <div className="flex items-end justify-between gap-[64px] border-t border-(--ckl-line) pt-[32px]">
        <div className="flex items-center gap-[32px]" {...anim("rise", 6)}>
          <p className="ckl-figure flex shrink-0 items-center gap-[20px] text-[92px]">
            <span className="text-(--ckl-faint)">{p.shift.from}</span>
            <svg viewBox="0 0 48 24" className="w-[56px] text-(--ckl-amber)" role="img" aria-label={deck.ui.then}>
              <path d="M0 12h44M34 2l10 10-10 10" fill="none" stroke="currentColor" strokeWidth="3" />
            </svg>
            <span className="ckl-accent">{p.shift.to}</span>
          </p>
          <p className="max-w-[620px] text-[21px] leading-[1.42] text-(--ckl-muted)">{p.shift.label}</p>
        </div>
        <p className="max-w-[520px] text-[26px] font-semibold leading-[1.35]" {...anim("fade", 7)}>
          {p.takeaway}
        </p>
      </div>
    </Slide>
  );
}

function Start(props: SlideProps) {
  const s = deck.start;
  return (
    <Slide {...props} label={`${s.title.text} ${s.title.accent}`} glow={{ x: 50, y: 110 }}>
      <Eyebrow>{s.eyebrow}</Eyebrow>
      <Title title={s.title} size={84} className="mt-[22px]" />
      <p className="mt-[20px] text-[27px] leading-[1.42] text-(--ckl-muted)" {...anim("rise", 2)}>
        {s.lead}
      </p>
      <ol className="my-auto grid grid-cols-4 gap-[28px]">
        {s.steps.map((step, i) => (
          <li key={step.title} className="ckl-card flex flex-col px-[38px] pb-[44px] pt-[38px]" {...anim("rise", 3 + i)}>
            <span className="ckl-figure text-[72px] text-(--ckl-amber)">{i + 1}</span>
            <p className="mt-[30px] text-[31px] font-semibold leading-[1.18]">{step.title}</p>
            <p className="mt-[16px] text-[23px] leading-[1.45] text-(--ckl-muted)">{step.text}</p>
          </li>
        ))}
      </ol>
      <p className="text-[20px] font-semibold uppercase tracking-[0.18em] text-(--ckl-faint)" {...anim("fade", 7)}>
        {s.order}
      </p>
      <ul className="mt-[22px] flex items-center gap-[20px]" {...anim("fade", 7)}>
        {venues.map((venue, i) => (
          <li key={venue.slug} className="flex items-center gap-[20px]">
            {i > 0 && <span aria-hidden className="h-[2px] w-[56px] bg-(--ckl-line)" />}
            <VenueMark venue={venue} size={52} />
            <span className="text-[21px] font-semibold">{venue.name}</span>
          </li>
        ))}
      </ul>
    </Slide>
  );
}

function Next(props: SlideProps) {
  const n = deck.next;
  return (
    <Slide {...props} label={`${n.title.text} ${n.title.accent}`} note={deck.date} glow={{ x: 82, y: 40 }}>
      <div className="grid flex-1 grid-cols-[1fr_440px] items-center gap-[120px]">
        <div>
          <Eyebrow>{n.eyebrow}</Eyebrow>
          <Title title={n.title} size={104} split className="mt-[24px] tracking-[-0.035em]" />
          <ol className="mt-[40px] flex flex-col gap-[16px]">
            {n.steps.map((step, i) => (
              <li key={step} className="flex items-center gap-[20px]" {...anim("rise", 2 + i)}>
                <span className="ckl-figure flex size-[48px] shrink-0 items-center justify-center rounded-full border-[2px] border-(--ckl-amber) text-[24px] text-(--ckl-amber)">
                  {i + 1}
                </span>
                <span className="text-[27px] font-medium leading-[1.3]">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-[44px] flex items-center gap-[28px]" {...anim("rise", 5)}>
            <a href={contact.mailto} className="inline-flex items-center rounded-full bg-(--ckl-amber) px-[40px] py-[18px] text-[28px] font-bold text-(--ckl-on-amber)">
              {n.mail}&nbsp;→
            </a>
            <a href={contact.mailto} className="text-[24px] font-medium" tabIndex={-1}>
              {contact.email}
            </a>
          </div>
          <p className="mt-[24px] text-[22px] font-semibold" {...anim("fade", 6)}>
            {contact.signature}
          </p>
          <a href={n.page} className="mt-[6px] block w-fit text-[18px] text-(--ckl-faint)" {...anim("fade", 6)}>
            {displayUrl(n.page)}
          </a>
        </div>
        <div className="flex flex-col items-center text-center" {...anim("pop", 4)}>
          <p className="text-[26px] font-semibold">{n.scan}</p>
          <a href={groupDemo} className="mt-[22px] block rounded-[32px] bg-(--ckl-amber) p-[32px] text-(--ckl-on-amber)">
            <QrCode value={groupDemo} label={`QR code vers ${displayUrl(groupDemo)}`} className="size-[300px]" />
          </a>
          <a href={groupDemo} className="mt-[16px] text-[18px] text-(--ckl-muted)" tabIndex={-1}>
            {displayUrl(groupDemo)}
          </a>
        </div>
      </div>
      <div className="mt-[40px] flex items-center gap-[22px]" {...anim("fade", 7)}>
        {venues.map((venue) => (
          <VenueMark key={venue.slug} venue={venue} size={52} alt={venue.name} />
        ))}
        <span aria-hidden className="px-[8px] text-[26px] text-(--ckl-faint)">
          ×
        </span>
        <OmininMark className="text-[34px]" />
      </div>
    </Slide>
  );
}

function SourceList(props: SlideProps) {
  return (
    <Slide {...props} label={deck.sourcesTitle} glow={{ x: 50, y: 120 }}>
      <Eyebrow>{deck.sourcesTitle}</Eyebrow>
      <ul className="mt-[40px] columns-2 gap-[72px] text-[20px] leading-[1.45]">
        {Object.values(sources).map((source) => (
          <li key={source.full} className="mb-[20px] break-inside-avoid">
            <p>{source.full}</p>
            {"url" in source && (
              <a href={source.url} className="text-[16px] text-(--ckl-faint) underline decoration-(--ckl-line) underline-offset-4">
                {"display" in source ? source.display : new URL(source.url).hostname.replace(/^www\./, "")}
              </a>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-auto text-[18px] text-(--ckl-faint)">{deck.sourcesNote}</p>
    </Slide>
  );
}

export const slides = [Cover, Seen, How, Cartes, Staff, Happy, Connect, Group, Proof, Start, Next, SourceList];
