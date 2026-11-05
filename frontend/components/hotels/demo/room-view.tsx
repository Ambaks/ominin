"use client";

import { useEffect, useState } from "react";
import { GlassButton, Segmented, Sheet } from "@/components/gestion/ui";
import { Accent, LiveDot, Photo, Ring } from "@/components/hotels/ui";
import {
  bookables,
  folio,
  guest,
  guestText,
  qrPoints,
  requestActivity,
  requestKinds,
  room,
  roomLabel,
  spaces,
  type Bookable,
  type LivePlace,
  type RequestKind,
  type SpaceId,
} from "@/lib/hotels-demo-data";
import { formatPrice } from "@/lib/menu/format";
import { hotelsPrefix } from "@/lib/site";
import { CartButton, CarteList, CheckoutSheet, useCart } from "./carte";
import { clock, useDemo } from "./store";
import { Choice, DemoFooter, Facts, Hero, Icon, SectionTitle, Tracking, label } from "./ui";

const roomQr = qrPoints[0].id;
const fromRoom = { origin: roomQr, where: roomLabel(guest.room), guest: guest.name, detail: roomLabel(guest.room) };

/*
 * Le QR de la table de nuit : l'accueil du séjour. Le room service, la
 * fréquentation en direct, les demandes, les réservations, les cartes des
 * espaces et le bon à savoir. L'ouvrir fait reconnaître le client partout
 * ailleurs dans l'hôtel.
 */

function RoomService() {
  const { roomService } = room;
  const cart = useCart(roomService.categories);
  const [view, setView] = useState<"carte" | "commande" | null>(null);
  return (
    <section>
      <div className="hotels-night relative flex min-h-[28rem] flex-col justify-end overflow-hidden rounded-[2rem] p-2">
        <div className="absolute inset-0 -z-10" aria-hidden>
          <Photo name={roomService.photo} sizes="(min-width: 640px) 30rem, 100vw" />
        </div>
        <div className="g-glass p-g-pad">
          <div className="g-plate p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-ember-1">{roomService.eyebrow}</p>
            <h2 className="kit-display mt-2 text-[2.1rem]">
              <Accent text={roomService.title} />
            </h2>
            <p className="mt-2 text-sm text-foreground/80">{roomService.text}</p>
            <GlassButton variant="primary" className="mt-4" onClick={() => setView("carte")}>
              {roomService.cta}
              <Icon name="chevron" />
            </GlassButton>
          </div>
        </div>
      </div>
      {view === "carte" && (
        <Sheet
          title={roomService.sheetTitle}
          description={roomService.text}
          size="wide"
          onClose={() => setView(null)}
          footer={cart.count > 0 && <CartButton cart={cart} onClick={() => setView("commande")} />}
        >
          <CarteList categories={roomService.categories} cart={cart} />
        </Sheet>
      )}
      {view === "commande" && (
        <CheckoutSheet cart={cart} context={{ kind: "room", origin: roomQr }} onBack={() => setView("carte")} onClose={() => setView(null)} />
      )}
    </section>
  );
}

function LiveSheet({ place, onClose }: { place: LivePlace; onClose: () => void }) {
  const { curve } = place;
  return (
    <Sheet title={place.label} description={place.hours} onClose={onClose}>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <LiveDot />
        {guestText.reading(place)}
      </p>
      <h3 className={`${label} mt-6`}>{room.live.conditions}</h3>
      <Facts items={place.facts} />
      <h3 className={`${label} mt-8`}>{room.live.day}</h3>
      <p className="kit-display ember-text mt-2 text-3xl">{room.live.calmest(curve.hours[curve.calm])}</p>
      <div className="mt-5 flex h-36 items-end gap-1.5" aria-hidden>
        {curve.shares.map((share, i) => (
          <span
            key={curve.hours[i]}
            className={`flex-1 rounded-t-md ${i === curve.calm ? "ember-gradient" : i === curve.now ? "bg-foreground/45" : "bg-foreground/15"}`}
            style={{ height: `${Math.max(share, 0.02) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] tabular-nums text-faint">
        <span>{curve.hours[0]}</span>
        <span className="font-semibold text-foreground/70">{room.live.now}</span>
        <span>{curve.hours.at(-1)}</span>
      </div>
    </Sheet>
  );
}

function Live() {
  const { places } = useDemo();
  const [open, setOpen] = useState<string | null>(null);
  const place = places.find((p) => p.id === open);
  return (
    <section>
      <SectionTitle eyebrow={room.live.eyebrow} title={room.live.title} hint={room.live.hint} />
      <div className="grid grid-cols-2 gap-3">
        {places.map((place) => (
          <button key={place.id} type="button" onClick={() => setOpen(place.id)} className="hd-row g-press flex flex-col items-center px-3 py-5 text-center">
            <span className="relative">
              <Ring share={place.share} className="size-18" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className={`font-bold tabular-nums ${place.unit ? "text-lg" : "text-[11px]"}`}>{place.value}</span>
                {place.unit && <span className="ml-0.5 text-[11px] text-muted">{place.unit}</span>}
              </span>
            </span>
            <span className="mt-3 text-sm font-semibold">{place.label}</span>
            <span className="text-xs text-muted">{place.hint}</span>
            <span className="mt-3 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums text-ember-1 ring-1 ring-hairline">{place.glance}</span>
          </button>
        ))}
      </div>
      {place && <LiveSheet place={place} onClose={() => setOpen(null)} />}
    </section>
  );
}

function RequestSheet({ kind, onClose }: { kind: RequestKind & { ask: NonNullable<RequestKind["ask"]> }; onClose: () => void }) {
  const { track } = useDemo();
  const [choice, setChoice] = useState(kind.ask.options[0]);
  return (
    <Sheet
      title={kind.label}
      description={kind.hint}
      onClose={onClose}
      footer={
        <GlassButton
          variant="primary"
          onClick={() => {
            track({ ...fromRoom, ...requestActivity(kind, choice) });
            onClose();
          }}
        >
          {room.requests.send}
        </GlassButton>
      }
    >
      <fieldset>
        <legend className={label}>{kind.ask.label}</legend>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {kind.ask.options.map((option) => (
            <Choice key={option} on={choice === option} onClick={() => setChoice(option)}>
              {option}
            </Choice>
          ))}
        </div>
      </fieldset>
    </Sheet>
  );
}

function Requests() {
  const { track } = useDemo();
  const [open, setOpen] = useState<RequestKind | null>(null);
  return (
    <section>
      <SectionTitle eyebrow={room.requests.eyebrow} title={room.requests.title} />
      <ul className="grid grid-cols-2 gap-3">
        {requestKinds.map((kind) => (
          <li key={kind.id}>
            <button
              type="button"
              onClick={() => (kind.ask ? setOpen(kind) : track({ ...fromRoom, ...requestActivity(kind) }))}
              className="hd-row g-press flex h-full w-full flex-col items-start gap-3 p-4 text-left"
            >
              <Icon name={kind.icon} className="size-6 text-ember-1" />
              <span>
                <span className="block text-sm font-semibold">{kind.label}</span>
                <span className="block text-xs text-muted">{kind.hint}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open?.ask && <RequestSheet kind={{ ...open, ask: open.ask }} onClose={() => setOpen(null)} />}
    </section>
  );
}

function BookingSheet({ bookable, onClose }: { bookable: Bookable; onClose: () => void }) {
  const { track, charge, activity } = useDemo();
  const { bookings } = room;
  const [day, setDay] = useState<string>("0");
  const [slot, setSlot] = useState<string | null>(null);
  const dayLabel = bookings.days[Number(day)];
  return (
    <Sheet
      title={bookable.label}
      description={bookable.detail}
      onClose={onClose}
      footer={
        <GlassButton
          variant="primary"
          disabled={!slot}
          onClick={() => {
            if (!slot) return;
            track({
              ...fromRoom,
              kind: "reservation",
              team: bookable.team,
              title: bookable.label,
              detail: guestText.slot(dayLabel, slot),
              steps: [bookings.done],
              actions: [],
              booking: { id: bookable.id, day: Number(day), time: slot },
            });
            if (bookable.price > 0) charge({ space: bookable.place, when: folio.today(clock()), item: guestText.booked(bookable.label, dayLabel, slot), amount: bookable.price });
            onClose();
          }}
        >
          {slot ? bookings.cta(slot) : bookings.pick}
        </GlassButton>
      }
    >
      <Segmented
        label={bookings.eyebrow}
        glass={false}
        options={bookings.days.map((d, i) => ({ value: String(i), label: d }))}
        value={day}
        onChange={(value) => (setDay(value), setSlot(null))}
      />
      <div className="mt-5 grid grid-cols-3 gap-2">
        {bookable.slots[Number(day)].map(([time, free]) => (
          <Choice
            key={time}
            on={slot === time}
            disabled={!free || activity.some((a) => a.booking?.id === bookable.id && a.booking.day === Number(day) && a.booking.time === time)}
            onClick={() => setSlot(time)}
            className="px-2 tabular-nums"
          >
            {time}
          </Choice>
        ))}
      </div>
      <p className="mt-5 text-sm text-muted">{bookable.price > 0 ? guestText.bookingPrice(formatPrice(bookable.price)) : bookings.free}</p>
    </Sheet>
  );
}

function Bookings() {
  const [open, setOpen] = useState<Bookable | null>(null);
  return (
    <section>
      <SectionTitle eyebrow={room.bookings.eyebrow} title={room.bookings.title} />
      <ul className="flex flex-col gap-3">
        {bookables.map((bookable) => (
          <li key={bookable.id}>
            <button type="button" onClick={() => setOpen(bookable)} className="hd-row g-press flex w-full items-center gap-4 p-3 text-left">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-xl">
                <Photo name={bookable.photo} sizes="64px" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug">{bookable.label}</span>
                <span className="block text-xs text-muted">{bookable.detail}</span>
                <span className="mt-1 block text-xs font-semibold text-ember-1">{bookable.price > 0 ? formatPrice(bookable.price) : room.bookings.free}</span>
              </span>
              <Icon name="chevron" className="size-4 text-muted" />
            </button>
          </li>
        ))}
      </ul>
      {open && <BookingSheet bookable={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function SpaceSheet({ id, onClose }: { id: SpaceId; onClose: () => void }) {
  const space = spaces[id];
  const qr = qrPoints.find((point) => point.kind === "space" && point.space === id);
  return (
    <Sheet title={space.name} description={space.hours} size="wide" onClose={onClose}>
      <p className="hd-row mb-5 p-4 text-sm text-muted">{room.spacesSection.orderHint}</p>
      <CarteList categories={space.categories} />
      {qr && (
        <GlassButton href={`${hotelsPrefix}/demo/${qr.id}`} className="mt-4">
          <Icon name="qr" />
          {room.spacesSection.demoScan(qr.label)}
        </GlassButton>
      )}
    </Sheet>
  );
}

function Spaces() {
  const [open, setOpen] = useState<SpaceId | null>(null);
  return (
    <section>
      <SectionTitle eyebrow={room.spacesSection.eyebrow} title={room.spacesSection.title} />
      <ul className="hd-scroller -mx-4 flex scroll-px-4 gap-3 overflow-x-auto px-4 pb-2">
        {(Object.keys(spaces) as SpaceId[]).map((id) => {
          const space = spaces[id];
          return (
            <li key={id} className="shrink-0">
              <button
                type="button"
                onClick={() => setOpen(id)}
                className="hotels-night hotels-zoom relative flex h-[19rem] w-[15rem] flex-col justify-end overflow-hidden rounded-[1.75rem] p-2 text-left"
              >
                <span className="absolute inset-0 -z-10" aria-hidden>
                  <Photo name={space.photo} sizes="240px" />
                  <span className="hotels-scrim-card absolute inset-0" />
                </span>
                <span className="g-glass block p-g-pad">
                  <span className="g-plate block px-3.5 py-3">
                    <span className="kit-display block text-2xl">{space.name}</span>
                    <span className="mt-0.5 block text-xs text-muted">{space.hours}</span>
                    <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-ember-1">
                      {room.spacesSection.cta}
                      <Icon name="chevron" className="size-3.5" />
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {open && <SpaceSheet id={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Info() {
  const { info } = room;
  const [copied, setCopied] = useState(false);
  return (
    <section>
      <SectionTitle eyebrow={info.eyebrow} title={info.title} />
      <div className="hd-row flex items-center gap-4 p-4">
        <Icon name="wifi" className="size-6 text-ember-1" />
        <div className="min-w-0 flex-1">
          <p className={label}>{info.wifi.label}</p>
          <p className="mt-1 truncate text-sm font-semibold">{info.wifi.network}</p>
          <p className="truncate font-mono text-sm text-muted">{info.wifi.password}</p>
        </div>
        <GlassButton
          aria-label={info.wifi.copy}
          onClick={() => {
            navigator.clipboard?.writeText(info.wifi.password).then(() => setCopied(true), () => {});
          }}
        >
          <Icon name={copied ? "check" : "copy"} />
          {copied ? info.wifi.copied : info.wifi.copyShort}
        </GlassButton>
      </div>
      <div className="mt-3 flex flex-col">
        {info.items.map((item) => (
          <details key={item.title} className="hd-details group border-b border-hairline">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 font-semibold">
              {item.title}
              <Icon name="chevron" className="size-4 text-muted transition-transform group-open:rotate-90" />
            </summary>
            <p className="pb-4 text-sm leading-relaxed text-muted">{item.text}</p>
          </details>
        ))}
      </div>
      <h3 className="kit-display mt-10 text-2xl">{info.addresses.title}</h3>
      <ul className="mt-3 flex flex-col">
        {info.addresses.items.map((place) => (
          <li key={place.name} className="border-t border-hairline py-4 first:border-t-0">
            <p className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">{place.name}</span>
              <span className="shrink-0 text-xs text-ember-1">{place.hint}</span>
            </p>
            <p className="mt-1 text-sm text-muted">{place.text}</p>
          </li>
        ))}
      </ul>
      <p className="hd-row mt-6 flex items-center gap-3 p-4 text-sm">
        <Icon name="phone" className="size-5 text-ember-1" />
        <span>
          <span className="block font-semibold">{info.reception.label}</span>
          <span className="text-muted">{info.reception.text}</span>
        </span>
      </p>
    </section>
  );
}

export function RoomView() {
  const { loaded, recognised, recognise } = useDemo();
  useEffect(() => {
    if (loaded && !recognised) recognise();
  }, [loaded, recognised, recognise]);
  return (
    <>
      <Hero photo={room.hero.photo} title={<>{room.hero.greeting}<br /><Accent text={room.hero.name} /></>} subtitle={guestText.stay(guest.room, guest.stay)} />
      <div className="flex flex-col gap-14">
        <Tracking />
        <RoomService />
        <Live />
        <Requests />
        <Bookings />
        <Spaces />
        <Info />
      </div>
      <DemoFooter />
    </>
  );
}
