import type { CSSProperties, ReactNode } from "react";
import { KitHeading } from "@/components/landing-kit/heading";
import { Reveal } from "@/components/landing-kit/reveal";
import { folio, guest, stay, type HotelPhoto } from "@/lib/hotels-landing-data";
import { Accent, Check, FeatureColumns, LiveDot, Photo, Points, Ring } from "./ui";

/* La note de chambre, le séjour en direct depuis le même QR, puis le client reconnu. */

const tile = "rounded-2xl bg-white/[0.07] ring-1 ring-white/10";
const label = "text-[11px] font-semibold uppercase tracking-[0.2em] text-muted";

/** Panneau photo arrondi : la photo derrière, le verre posé dessus. */
function PhotoPanel({
  photo,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  className,
  children,
}: {
  photo: HotelPhoto;
  sizes?: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <Reveal className={`hotels-night relative overflow-hidden rounded-[2.25rem] ${className}`}>
      <div className="absolute inset-0 -z-10" aria-hidden>
        <Photo name={photo} sizes={sizes} />
        <div className="hotels-scrim-panel absolute inset-0" />
      </div>
      {children}
    </Reveal>
  );
}

function Slate() {
  const { slate } = folio;
  return (
    <div className="g-glass w-full max-w-md p-g-pad">
      <div className="g-plate p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="kit-display text-2xl">{slate.title}</p>
          <LiveDot />
        </div>
        <p className="mt-1 text-xs text-muted">{slate.guest}</p>
        <ul className="mt-4 flex flex-col">
          {slate.lines.map((line) => (
            <li key={line.space} className="grid grid-cols-[1fr_auto] gap-x-3 border-t border-hairline py-2.5 text-sm">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ember-1">
                {line.space} <span className="text-faint">· {line.time}</span>
              </span>
              <span className="row-span-2 self-center tabular-nums">{line.price}</span>
              <span className="truncate text-foreground/80">{line.item}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between border-t border-hairline pt-3">
          <span className="text-sm font-semibold">{slate.total.label}</span>
          <span className="kit-display ember-text text-3xl tabular-nums">{slate.total.value}</span>
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted">
          <Check className="size-4" />
          {slate.status}
        </p>
      </div>
    </div>
  );
}

export function HotelsFolio() {
  return (
    <section id={folio.id} className="scroll-mt-20">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-28 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:px-10">
        <PhotoPanel photo="suite" className="order-2 flex min-h-[34rem] items-end justify-center p-4 sm:p-8 lg:order-1 lg:min-h-[44rem]">
          <Slate />
        </PhotoPanel>
        <div className="order-1 lg:order-2">
          <KitHeading eyebrow={folio.eyebrow} title={<Accent text={folio.title} />} subtitle={folio.subtitle} />
          <Points points={folio.points} />
        </div>
      </div>
    </section>
  );
}

/* Le séjour : ce que voit le client depuis le QR de sa chambre. */

function Occupancy() {
  const { live } = stay;
  return (
    <div className="g-glass p-g-pad sm:col-span-2">
      <div className="g-plate h-full p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="kit-display text-2xl sm:text-3xl">{live.title}</p>
          <span className="flex items-center gap-2 text-xs font-semibold tabular-nums text-muted">
            <LiveDot />
            {live.time}
          </span>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {live.spaces.map((space) => (
            <li key={space.label} className={`flex flex-col items-center px-3 py-5 text-center ${tile}`}>
              <div className="relative">
                <Ring share={space.share} className="size-16 sm:size-20" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className={`font-bold tabular-nums ${space.unit ? "text-xl" : "text-xs"}`}>{space.value}</span>
                  {space.unit && <span className="ml-0.5 text-[11px] text-muted">{space.unit}</span>}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold">{space.label}</p>
              <p className="text-xs text-muted">{space.hint}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Curve() {
  const { curve } = stay.live;
  return (
    <div className="g-glass p-g-pad">
      <div className="g-plate flex h-full flex-col p-5 sm:p-6">
        <p className={label}>{curve.title}</p>
        <p className="kit-display ember-text mt-2 text-3xl">{curve.best}</p>
        <div className="mt-auto flex h-34 items-end gap-1.5 pt-6" aria-hidden>
          {curve.shares.map((share, i) => (
            <span
              key={curve.hours[i]}
              className={`hotels-col flex-1 rounded-t-md ${
                i === curve.calm ? "ember-gradient" : i === curve.now ? "bg-white/45" : "bg-white/15"
              }`}
              style={{ height: `${share * 100}%`, "--col-i": i } as CSSProperties}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] tabular-nums text-faint">
          <span>{curve.hours[0]}</span>
          <span>{curve.hours[curve.now]}</span>
          <span>{curve.hours.at(-1)}</span>
        </div>
      </div>
    </div>
  );
}

function Booking() {
  const { booking } = stay.live;
  return (
    <div className="g-glass p-g-pad">
      <div className="g-plate h-full p-5 sm:p-6">
        <p className={label}>{booking.title}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {booking.slots.map((slot, i) => (
            <span
              key={slot}
              className={`rounded-full px-3.5 py-2 text-sm font-semibold tabular-nums ${i === 0 ? "ember-gradient text-background" : "bg-white/[0.07] text-muted ring-1 ring-white/10"}`}
            >
              {slot}
            </span>
          ))}
        </div>
        <p className="mt-5 flex items-center gap-2 text-sm font-semibold">
          <Check />
          {booking.done} · {booking.slots[0]}
        </p>
      </div>
    </div>
  );
}

function Requests() {
  const { requests } = stay.live;
  return (
    <div className="g-glass p-g-pad sm:col-span-2">
      <div className="g-plate h-full p-5 sm:p-6">
        <p className={label}>{requests.title}</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {requests.items.map((item) => (
            <li key={item.label} className={`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 py-3 text-sm ${tile}`}>
              <span className="font-semibold">{item.label}</span>
              <span className="shrink-0 text-xs text-ember-1">{item.state}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function HotelsStay() {
  return (
    <section id={stay.id} className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-28 lg:px-10">
        <KitHeading eyebrow={stay.eyebrow} title={<Accent text={stay.title} />} />
        <PhotoPanel photo="deck" sizes="(min-width: 1152px) 1152px, 100vw" className="mt-14 p-3 pt-40 sm:p-8 sm:pt-56 lg:p-12 lg:pt-72">
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3" aria-hidden>
            <Occupancy />
            <Curve />
            <Booking />
            <Requests />
          </div>
        </PhotoPanel>
        <FeatureColumns items={stay.features} />
      </div>
    </section>
  );
}

/* Le client reconnu : trois cartes posées sur la terrasse. */

function GuestCards() {
  const { welcome, usual, moment } = guest.cards;
  return (
    <div className="flex w-full max-w-sm flex-col gap-3" aria-hidden>
      <div className="hotels-float g-glass p-g-pad" style={{ "--float-tilt": "-1deg" } as CSSProperties}>
        <div className="g-plate p-5">
          <p className={label}>{welcome.kicker}</p>
          <p className="kit-display mt-2 text-3xl">{welcome.title}</p>
          <p className="mt-1.5 text-sm text-foreground/75">{welcome.text}</p>
        </div>
      </div>
      <div className="hotels-float g-glass ml-6 p-g-pad sm:ml-10" style={{ "--float-tilt": "1deg", "--float-delay": "-2.5s" } as CSSProperties}>
        <div className="g-plate flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className={label}>{usual.kicker}</p>
            <p className="mt-1.5 font-bold">{usual.item}</p>
            <p className="text-xs text-muted">
              {usual.detail} · {usual.price}
            </p>
          </div>
          <span className="ember-gradient shrink-0 rounded-full px-3.5 py-2 text-xs font-bold text-background">{usual.cta}</span>
        </div>
      </div>
      <div className="hotels-float g-glass p-g-pad" style={{ "--float-tilt": "-0.5deg", "--float-delay": "-5s" } as CSSProperties}>
        <div className="g-plate p-4">
          <p className={label}>{moment.kicker}</p>
          <p className="mt-1.5 text-sm font-semibold">{moment.text}</p>
        </div>
      </div>
    </div>
  );
}

export function HotelsGuest() {
  return (
    <section id={guest.id} className="scroll-mt-20">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-28 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16 lg:px-10">
        <div>
          <KitHeading eyebrow={guest.eyebrow} title={<Accent text={guest.title} />} />
          <Points points={guest.points} />
        </div>
        <PhotoPanel photo="terrace" className="flex min-h-[34rem] items-center justify-center p-4 sm:p-8 lg:min-h-[44rem]">
          <GuestCards />
        </PhotoPanel>
      </div>
    </section>
  );
}
