import { KitHeading } from "@/components/landing-kit/heading";
import { Reveal } from "@/components/landing-kit/reveal";
import { cachet, spaces, type SpaceIcon } from "@/lib/hotels-landing-data";
import { Accent, Check, LiveDot, Photo } from "./ui";

/*
 * Les espaces de l'hôtel où le QR remplace le tour de salle : une photo par
 * espace, sa légende en verre, ses horaires, et le bon qui vient d'en partir.
 */

const paths: Record<SpaceIcon, string> = {
  pool: "M3 16c1.5 0 1.5 1.5 3 1.5S7.5 16 9 16s1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5 1.5-1.5 3-1.5M8 13V5a2 2 0 0 1 4 0M14 13V5a2 2 0 0 1 4 0M8 9h6",
  sun: "M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z",
  cup: "M5 8h11v6a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8ZM16 10h2a2 2 0 0 1 0 4h-2M7 4v1M10 3v2M13 4v1",
  leaf: "M5 19C5 10 10 5 20 4c-1 10-6 15-15 15ZM5 19l8-8",
};

function Icon({ name }: { name: SpaceIcon }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[name]} />
    </svg>
  );
}

/* Mosaïque : la piscine en grand, puis la plage, et trois espaces en rangée. */
const layout = [
  "sm:col-span-2 lg:col-span-7 h-[30rem] lg:h-[36rem]",
  "lg:col-span-5 h-[30rem] lg:h-[36rem]",
  "lg:col-span-4 h-[28rem]",
  "lg:col-span-4 h-[28rem]",
  "lg:col-span-4 h-[28rem]",
];
const sizes = [
  "(min-width: 1024px) 58vw, 100vw",
  "(min-width: 1024px) 42vw, (min-width: 640px) 50vw, 100vw",
  "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
];

export function HotelsSpaces() {
  return (
    <section id={spaces.id} className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-28 lg:px-10">
        <KitHeading eyebrow={spaces.eyebrow} title={<Accent text={spaces.title} />} subtitle={spaces.subtitle} />
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
          {spaces.items.map((space, i) => (
            <Reveal
              key={space.name}
              as="li"
              delay={(i % 3) * 100}
              className={`hotels-night hotels-zoom relative flex flex-col justify-between overflow-hidden rounded-[2rem] p-3 ${layout[i]}`}
            >
              <div className="absolute inset-0 -z-10">
                <Photo name={space.photo} sizes={sizes[Math.min(i, 2)]} />
                <div className="hotels-scrim-card absolute inset-0" />
              </div>
              <p className="g-glass g-glass-pill flex items-center gap-2 self-end py-2 pl-3 pr-4 text-xs font-semibold">
                <LiveDot />
                <span className="text-foreground">{space.ticket.where}</span>
                <span className="text-muted">· {space.ticket.what}</span>
              </p>
              <div className="g-glass p-g-pad">
                <div className="g-plate p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="kit-display flex items-center gap-2.5 text-[1.9rem] lg:text-[1.65rem] xl:text-[1.9rem]">
                      <span className="text-ember-1">
                        <Icon name={space.icon} />
                      </span>
                      {space.name}
                    </h3>
                    <span className="shrink-0 rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-muted ring-1 ring-white/10">
                      {space.hours}
                    </span>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-foreground/75">{space.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
        <Reveal as="div" className="mt-8 flex flex-wrap justify-center gap-2.5">
          {spaces.gestures.map((gesture) => (
            <span key={gesture} className="g-glass g-glass-pill flex items-center gap-2.5 py-2 pl-2 pr-4 text-sm font-semibold">
              <Check />
              {gesture}
            </span>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* Le cachet : le QR dans les matières de l'hôtel, sous trois arches (repris de la proposition Plage Palace). */
export function HotelsCachet() {
  return (
    <section id={cachet.id} className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10">
        <span aria-hidden className="hotels-sun mb-8" />
        <KitHeading eyebrow={cachet.eyebrow} title={<Accent text={cachet.title} />} subtitle={cachet.subtitle} center />
        {/* Téléphone : les trois arches défilent de côté au lieu de s'empiler. */}
        <ul className="-mx-4 mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:gap-10">
          {cachet.items.map((item, i) => (
            <Reveal key={item.title} as="li" delay={i * 110} className="w-[72%] shrink-0 snap-center sm:w-auto">
              <div className="hotels-arch hotels-zoom relative aspect-[4/5] overflow-hidden ring-1 ring-hairline">
                <Photo name={item.photo} sizes="(min-width: 640px) 33vw, 100vw" />
              </div>
              <h3 className="kit-display mt-6 text-3xl">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
