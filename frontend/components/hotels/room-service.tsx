import { ScrollStory } from "@/components/landing-kit/scroll-story";
import { mock, roomService } from "@/lib/hotels-landing-data";
import { Accent, Check, Photo } from "./ui";

/*
 * La chambre au défilement, sur sa photo qui reste collée derrière : la
 * chambre 214 scanne, commande son petit-déjeuner, demande des serviettes,
 * signe sur sa chambre.
 */

const { screens } = roomService;
const chip = "rounded-full px-3 py-1.5 text-xs font-semibold";
const chipOn = "ember-gradient text-background";
const chipOff = "bg-white/[0.07] text-muted ring-1 ring-white/10";
const row = "rounded-xl bg-white/[0.07] ring-1 ring-white/10";

function Scan() {
  return (
    <div className="flex flex-col items-center gap-3 pt-2 text-center">
      <div className="relative grid size-32 grid-cols-5 grid-rows-5 gap-1 rounded-2xl bg-white p-3" aria-hidden>
        {Array.from({ length: 25 }, (_, i) => (
          <span key={i} className={`rounded-[2px] ${[0, 1, 5, 6, 3, 4, 8, 9, 15, 16, 20, 21, 12, 18, 13, 7, 22, 24].includes(i) ? "bg-[#171f27]" : ""}`} />
        ))}
        <span className="absolute inset-x-3 top-1/2 h-0.5 animate-pulse bg-ember-2 motion-reduce:animate-none" />
      </div>
      <p className="kit-display text-3xl">{mock.room}</p>
      <p className="text-xs text-muted">{screens.scan.caption}</p>
    </div>
  );
}

function Order() {
  const { order } = screens;
  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-24 overflow-hidden rounded-xl">
        <Photo name="breakfast" sizes="240px" />
      </div>
      <div className="flex gap-1.5 overflow-hidden text-[11px] font-semibold">
        {order.categories.map((category, i) => (
          <span key={category} className={`whitespace-nowrap rounded-full px-2.5 py-1 ${i === 0 ? chipOn : chipOff}`}>
            {category}
          </span>
        ))}
      </div>
      {order.lines.map((line) => (
        <div key={line.name} className={`flex items-center justify-between gap-2 px-3 py-2 text-sm ${row}`}>
          <span className="min-w-0">
            <span className="block truncate font-semibold leading-snug">{line.name}</span>
            <span className="block truncate text-xs text-muted">{line.detail}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-xs tabular-nums text-muted">{line.price}</span>
            <span className="ember-gradient flex size-6 items-center justify-center rounded-full text-sm font-bold text-background">+</span>
          </span>
        </div>
      ))}
      <div className={`flex items-center justify-between px-3 py-2 text-xs ${row}`}>
        <span className="text-muted">{order.slot.label}</span>
        <span className="font-semibold tabular-nums">{order.slot.value}</span>
      </div>
    </div>
  );
}

function Requests() {
  const { requests } = screens;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {requests.options.map((option, i) => (
          <span key={option} className={`${chip} text-center ${i === 0 ? chipOn : chipOff}`}>
            {option}
          </span>
        ))}
      </div>
      <div className={`px-4 py-5 text-center ${row}`}>
        <p className="text-xs text-muted">{requests.status.label}</p>
        <p className="kit-display ember-text mt-1 text-4xl">{requests.status.value}</p>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="ember-gradient h-full w-2/3 rounded-full" />
        </div>
        <p className="mt-3 text-[11px] text-faint">{requests.status.detail}</p>
      </div>
    </div>
  );
}

function Folio() {
  const { folio } = screens;
  return (
    <div className="flex flex-col gap-3">
      <ul className={`flex flex-col gap-1.5 px-3 py-2.5 text-xs ${row}`}>
        {folio.lines.map((line) => (
          <li key={line.name} className="flex justify-between gap-2">
            <span className="min-w-0 leading-snug">1 × {line.name}</span>
            <span className="shrink-0 tabular-nums text-muted">{line.price}</span>
          </li>
        ))}
        <li className="mt-1 flex justify-between border-t border-hairline pt-1.5 font-semibold">
          <span>{mock.room}</span>
          <span className="tabular-nums">{folio.total}</span>
        </li>
      </ul>
      <div className="flex flex-col gap-2 lg:flex-row">
        {folio.choices.map((choice, i) => (
          <span key={choice} className={`${chip} flex-1 whitespace-nowrap px-2 text-center ${i === 0 ? chipOn : chipOff}`}>
            {choice}
          </span>
        ))}
      </div>
      <div className="g-glass g-glass-pill flex items-center justify-center gap-2 py-2.5 text-sm font-bold">
        <Check />
        {folio.done}
      </div>
    </div>
  );
}

export function HotelsRoomService() {
  return (
    <div className="hotels-night relative">
      <div className="hotels-fade-y absolute inset-0 -z-10" aria-hidden>
        <div className="sticky top-0 h-svh overflow-hidden">
          <Photo name="room" sizes="100vw" />
          <div className="hotels-scrim-wash absolute inset-0" />
        </div>
      </div>
      <ScrollStory
        id={roomService.id}
        eyebrow={roomService.eyebrow}
        title={<Accent text={roomService.title} />}
        steps={roomService.steps}
        screens={[<Scan key="scan" />, <Order key="order" />, <Requests key="requests" />, <Folio key="folio" />]}
        header={
          <div className="flex items-center justify-between gap-3 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            <span className="truncate">{mock.hotel}</span>
            <span>{mock.room}</span>
          </div>
        }
        glass
      />
    </div>
  );
}
