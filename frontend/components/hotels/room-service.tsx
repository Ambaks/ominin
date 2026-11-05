import { ScrollStory } from "@/components/landing-kit/scroll-story";
import { mock, roomService } from "@/lib/hotels-landing-data";

/* Le room service au défilement : la chambre 214 scanne, commande son petit-déjeuner, suit le plateau, signe sur sa chambre. */

const { screens } = roomService;
const chip = "rounded-full border px-3 py-1.5 text-xs font-semibold";

function Scan() {
  return (
    <div className="flex flex-col items-center gap-3 pt-2 text-center">
      <div className="relative grid size-32 grid-cols-5 grid-rows-5 gap-1 rounded-2xl bg-white p-3" aria-hidden>
        {Array.from({ length: 25 }, (_, i) => (
          <span key={i} className={`rounded-[2px] ${[0, 1, 5, 6, 3, 4, 8, 9, 15, 16, 20, 21, 12, 18, 13, 7, 22, 24].includes(i) ? "bg-[#171f27]" : ""}`} />
        ))}
        <span className="absolute inset-x-3 top-1/2 h-0.5 animate-pulse bg-ember-2 motion-reduce:animate-none" />
      </div>
      <p className="kit-display text-2xl">{mock.room}</p>
      <p className="text-xs text-muted">{screens.scan.caption}</p>
    </div>
  );
}

function Order() {
  const { order } = screens;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5 overflow-hidden text-[11px] font-semibold">
        {order.categories.map((category, i) => (
          <span key={category} className={`whitespace-nowrap rounded-full px-2.5 py-1 ${i === 0 ? "ember-gradient text-background" : "border border-hairline text-muted"}`}>
            {category}
          </span>
        ))}
      </div>
      {order.lines.map((line) => (
        <div key={line.name} className="flex items-center justify-between gap-2 rounded-xl border border-hairline bg-background/60 px-3 py-2.5 text-sm">
          <span className="min-w-0">
            <span className="block font-semibold leading-snug">{line.name}</span>
            <span className="block truncate text-xs text-muted">{line.detail}</span>
          </span>
          <span className="ember-gradient flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-background">+</span>
        </div>
      ))}
      <div className="mt-1 flex items-center justify-between rounded-xl bg-surface px-3 py-2.5 text-xs">
        <span className="text-muted">{order.slot.label}</span>
        <span className="font-semibold tabular-nums">{order.slot.value}</span>
      </div>
    </div>
  );
}

function Eta() {
  const { eta } = screens;
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-surface px-4 py-5 text-center">
        <p className="text-xs text-muted">{eta.title}</p>
        <p className="kit-display ember-text mt-1 text-3xl">{eta.value}</p>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-hairline">
          <div className="ember-gradient h-full w-2/3 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {eta.options.map((option, i) => (
          <span key={option} className={`${chip} text-center ${i === 0 ? "ember-gradient border-transparent text-background" : "border-hairline text-muted"}`}>
            {option}
          </span>
        ))}
      </div>
    </div>
  );
}

function Folio() {
  const { folio } = screens;
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-1.5 rounded-xl bg-surface px-3 py-2.5 text-xs">
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
          <span key={choice} className={`${chip} flex-1 whitespace-nowrap px-2 text-center ${i === 0 ? "ember-gradient border-transparent text-background" : "border-hairline text-muted"}`}>
            {choice}
          </span>
        ))}
      </div>
      <div className="ember-gradient rounded-full py-3 text-center text-sm font-bold text-background">{folio.done} ✓</div>
    </div>
  );
}

export function HotelsRoomService() {
  return (
    <ScrollStory
      id={roomService.id}
      eyebrow={roomService.eyebrow}
      title={roomService.title}
      steps={roomService.steps}
      screens={[<Scan key="scan" />, <Order key="order" />, <Eta key="eta" />, <Folio key="folio" />]}
      header={
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">
          <span>{mock.hotel}</span>
          <span>{mock.room}</span>
        </div>
      }
      glass
    />
  );
}
