import { KitHeading } from "@/components/landing-kit/heading";
import { Reveal } from "@/components/landing-kit/reveal";
import { spaces, type SpaceIcon } from "@/lib/hotels-landing-data";

/* Les espaces de l'hôtel où le QR remplace le tour de salle : un cadre de verre par espace, ses horaires, sa carte. */

const paths: Record<SpaceIcon, string> = {
  pool: "M3 16c1.5 0 1.5 1.5 3 1.5S7.5 16 9 16s1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5 1.5-1.5 3-1.5M8 13V5a2 2 0 0 1 4 0M14 13V5a2 2 0 0 1 4 0M8 9h6",
  sun: "M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z",
  cup: "M5 8h11v6a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8ZM16 10h2a2 2 0 0 1 0 4h-2M7 4v1M10 3v2M13 4v1",
  leaf: "M5 19C5 10 10 5 20 4c-1 10-6 15-15 15ZM5 19l8-8",
};

function Icon({ name }: { name: SpaceIcon }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[name]} />
    </svg>
  );
}

export function HotelsSpaces() {
  return (
    <section id={spaces.id} className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10">
        <KitHeading eyebrow={spaces.eyebrow} title={spaces.title} subtitle={spaces.subtitle} />
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.items.map((space, i) => (
            <Reveal key={space.name} as="li" delay={(i % 3) * 100} className="g-glass flex p-g-pad">
              <div className="g-plate flex flex-1 flex-col p-6">
                <div className="flex items-center justify-between">
                  <span className="text-ember-1">
                    <Icon name={space.icon} />
                  </span>
                  <span className="rounded-full border border-hairline px-2.5 py-1 text-[11px] font-semibold tabular-nums text-muted">{space.hours}</span>
                </div>
                <h3 className="kit-display mt-6 text-2xl">{space.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{space.text}</p>
              </div>
            </Reveal>
          ))}
          <Reveal as="li" delay={200} className="ember-gradient flex rounded-g-frame p-6 text-background">
            <ul className="flex flex-col justify-center gap-3">
              {spaces.gestures.map((gesture) => (
                <li key={gesture} className="flex items-center gap-3 text-base font-bold">
                  <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-background/25 text-[11px]">✓</span>
                  {gesture}
                </li>
              ))}
            </ul>
          </Reveal>
        </ul>
      </div>
    </section>
  );
}
