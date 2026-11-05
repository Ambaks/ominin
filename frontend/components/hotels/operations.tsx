import { KitBars, KitBento } from "@/components/landing-kit/bento";
import { KitHeading } from "@/components/landing-kit/heading";
import { Reveal } from "@/components/landing-kit/reveal";
import { direction, infrastructure, team } from "@/lib/hotels-landing-data";

/* Côté hôtel : l'équipe, la direction, et l'infrastructure qui reste en place. */

export function HotelsTeam() {
  return (
    <section id={team.id} className="scroll-mt-20">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_1.4fr] lg:px-10">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <KitHeading eyebrow={team.eyebrow} title={team.title} subtitle={team.subtitle} />
        </div>
        <ol className="grid gap-4 sm:grid-cols-2">
          {team.items.map((item, i) => (
            <Reveal key={item.title} as="li" delay={(i % 2) * 100} className="g-glass flex p-g-pad">
              <div className="g-plate flex-1 p-6">
                <p className="kit-display text-4xl text-faint">0{i + 1}</p>
                <h3 className="mt-5 text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function HotelsDirection() {
  const [first, ...rest] = direction.features;
  return (
    <KitBento
      id={direction.id}
      eyebrow={direction.eyebrow}
      title={direction.title}
      items={[{ ...first, wide: true }, ...rest]}
      glass
      lead={<KitBars rows={direction.peaks} />}
    />
  );
}

export function HotelsInfrastructure() {
  return (
    <section id={infrastructure.id} className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24 lg:px-10">
      <Reveal className="g-glass g-glass-hero mx-auto w-full max-w-6xl p-g-pad">
        <div className="kit-glass-inner g-plate grid gap-8 px-6 py-10 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:px-12 lg:py-14">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-ember-1">
              <span aria-hidden className="ember-gradient size-1.5 rounded-full" />
              {infrastructure.eyebrow}
            </p>
            <h2 className="kit-display mt-4 text-balance text-3xl sm:text-4xl lg:text-5xl">{infrastructure.title}</h2>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted">{infrastructure.text}</p>
          </div>
          <ul className="grid grid-cols-2 gap-3">
            {infrastructure.items.map((item) => (
              <li key={item} className="rounded-g-card border border-hairline bg-background/60 px-4 py-5 text-center text-sm font-bold">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
