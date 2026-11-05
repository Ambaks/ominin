import { KitHeading } from "@/components/landing-kit/heading";
import { Reveal } from "@/components/landing-kit/reveal";
import { direction, infrastructure, team } from "@/lib/hotels-landing-data";
import { Accent, FeatureColumns, LiveDot } from "./ui";

/* Côté hôtel : l'équipe, la direction, et l'infrastructure qui reste en place. */

const label = "text-[11px] font-semibold uppercase tracking-[0.2em] text-muted";
const tile = "rounded-2xl bg-foreground/[0.05] ring-1 ring-foreground/10";

/** Deux halos, laiton et eau, derrière un verre posé hors photo. */
function Glow() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
      <div className="absolute left-[8%] top-[10%] size-[60%] rounded-full bg-ember-2/25 blur-[90px]" />
      <div className="absolute bottom-[4%] right-[6%] size-[55%] rounded-full bg-(--hotels-water) blur-[90px]" />
    </div>
  );
}

type TicketData = { kind: string; where: string; what: string; age: string; fresh?: boolean };

function Ticket({ t }: { t: TicketData }) {
  return (
    <li className={`px-4 py-3 ${tile} ${t.fresh ? "ring-ember-1/50!" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ember-1">{t.kind}</span>
        <span className="flex items-center gap-1.5 text-[11px] text-faint">
          {t.fresh && <LiveDot />}
          {t.age}
        </span>
      </div>
      <p className="mt-1 font-bold">{t.where}</p>
      <p className="text-sm text-foreground/75">{t.what}</p>
    </li>
  );
}

function Inbox() {
  const { inbox } = team;
  return (
    <div className="relative" aria-hidden>
      <Glow />
      <div className="g-glass kit-phone mx-auto max-w-[22rem] p-g-pad">
        <div className="g-plate px-4 pb-5 pt-3">
          <div className="mx-auto mb-4 h-5 w-20 rounded-full bg-black/30" />
          <div className="flex items-center justify-between">
            <p className="kit-display text-2xl">{inbox.title}</p>
            <span className="rounded-full bg-foreground/[0.07] px-2.5 py-1 text-[11px] font-semibold text-muted ring-1 ring-foreground/10">{inbox.count}</span>
          </div>
          <ul className="mt-4 flex flex-col gap-2">
            {inbox.tickets.map((t) => (
              <Ticket key={t.where} t={t} />
            ))}
          </ul>
          <ul className="mt-2 border-t border-hairline pt-2">
            <Ticket t={inbox.floor} />
          </ul>
        </div>
      </div>
    </div>
  );
}

export function HotelsTeam() {
  return (
    <section id={team.id} className="scroll-mt-20">
      <div className="mx-auto grid w-full max-w-6xl gap-14 px-4 py-16 sm:px-6 sm:py-28 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-20 lg:px-10">
        <div>
          <KitHeading eyebrow={team.eyebrow} title={<Accent text={team.title} />} subtitle={team.subtitle} />
          <ul className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {team.items.map((item, i) => (
              <Reveal key={item.title} as="li" delay={(i % 2) * 90} className="border-t border-hairline pt-5">
                <h3 className="text-base font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
              </Reveal>
            ))}
          </ul>
        </div>
        <Reveal>
          <Inbox />
        </Reveal>
      </div>
    </section>
  );
}

function Board() {
  const { board } = direction;
  return (
    <Reveal className="relative mt-14">
      <Glow />
      <div className="g-glass g-glass-hero p-g-pad" aria-hidden>
        <div className="kit-glass-inner g-plate grid gap-4 p-4 sm:p-6 lg:grid-cols-[1.4fr_1fr] lg:p-8">
          <div className={`p-5 sm:p-6 ${tile}`}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className={label}>{board.title}</p>
                <p className="kit-display mt-2 text-5xl tabular-nums sm:text-6xl">{board.total.value}</p>
              </div>
              <p className="text-sm font-semibold text-ember-1">{board.total.delta}</p>
            </div>
            <ul className="mt-6 flex flex-col gap-3.5">
              {board.spaces.map((space, i) => (
                <li key={space.label}>
                  <p className="flex justify-between text-sm">
                    <span className="font-semibold">{space.label}</span>
                    <span className="tabular-nums text-muted">{space.value}</span>
                  </p>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-foreground/10">
                    <div className={`kit-bar h-full rounded-full ${i === 0 ? "ember-gradient" : "bg-foreground/35"}`} style={{ width: `${space.share * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {[board.wait, board.forecast].map((card) => (
              <div key={card.label} className={`flex flex-col justify-between p-5 sm:p-6 ${tile}`}>
                <p className={label}>{card.label}</p>
                <p className="kit-display ember-text mt-3 text-4xl">{card.value}</p>
                <p className="mt-2 text-sm text-foreground/75">{card.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export function HotelsDirection() {
  return (
    <section id={direction.id} className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-28 lg:px-10">
        <KitHeading eyebrow={direction.eyebrow} title={<Accent text={direction.title} />} />
        <Board />
        <FeatureColumns items={direction.features} />
      </div>
    </section>
  );
}

export function HotelsInfrastructure() {
  return (
    <section id={infrastructure.id} className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24 lg:px-10">
      <Reveal className="relative mx-auto w-full max-w-6xl">
        <Glow />
        <div className="g-glass g-glass-hero p-g-pad">
          <div className="kit-glass-inner g-plate grid gap-8 px-6 py-10 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:px-12 lg:py-14">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-ember-1">
                <span aria-hidden className="ember-gradient size-1.5 rounded-full" />
                {infrastructure.eyebrow}
              </p>
              <h2 className="kit-display mt-4 text-balance text-4xl sm:text-5xl lg:text-6xl"><Accent text={infrastructure.title} /></h2>
              <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted">{infrastructure.text}</p>
            </div>
            <ul className="grid grid-cols-2 gap-3">
              {infrastructure.items.map((item) => (
                <li key={item} className={`px-4 py-5 text-center text-sm font-bold ${tile}`}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
