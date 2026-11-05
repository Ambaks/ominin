import { KitBars, KitBento } from "@/components/landing-kit/bento";
import { KitHeading } from "@/components/landing-kit/heading";
import { Reveal } from "@/components/landing-kit/reveal";
import { folio, guest, stay } from "@/lib/hotels-landing-data";

/* La note de chambre, le client reconnu, puis tout le séjour depuis le même QR. */

function Numbered({ id, eyebrow, title, subtitle, points }: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  points: readonly { title: string; text: string }[];
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10">
        <KitHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />
        <ol className="mt-14 grid gap-4 md:grid-cols-3">
          {points.map((point, i) => (
            <Reveal key={point.title} as="li" delay={i * 100} className="g-glass flex p-g-pad">
              <div className="g-plate flex-1 p-6 md:p-7">
                <p className="kit-display ember-text text-5xl">0{i + 1}</p>
                <h3 className="mt-6 text-lg font-bold leading-snug">{point.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{point.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function HotelsFolio() {
  return <Numbered {...folio} />;
}

export function HotelsGuest() {
  return <Numbered {...guest} />;
}

export function HotelsStay() {
  const [first, ...rest] = stay.features;
  return (
    <KitBento
      id={stay.id}
      eyebrow={stay.eyebrow}
      title={stay.title}
      items={[{ ...first, wide: true }, ...rest]}
      glass
      lead={<KitBars rows={stay.occupancy} />}
    />
  );
}
