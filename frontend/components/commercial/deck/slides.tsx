import Image from "next/image";
import type { Shot, Slide } from "@/lib/commercial/decks";
import { screenSizes } from "@/lib/pitch/kit";
import { ghostButton } from "@/components/commercial/space/ui";

/*
 * Les diapositives d'un deck (lib/commercial/decks.ts), pensées d'abord pour
 * un téléphone tenu en hauteur : la capture au-dessus du texte, côte à côte
 * dès que l'écran s'élargit (tablette, téléphone en paysage).
 */

export function DeckSlide({ slide }: { slide: Slide }) {
  if (slide.type === "demo") {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-5">
        <Eyebrow>La démo</Eyebrow>
        <h2 className="font-display text-3xl font-medium leading-tight tracking-tight md:text-4xl">Essayez-la vous-même.</h2>
        <p className="text-muted">{"Une vraie carte, sur données de démonstration : rien n’est encaissé."}</p>
        <ul className="flex flex-col gap-2.5">
          {slide.demos.map((demo) => (
            <li key={demo.url}>
              <a href={demo.url} target="_blank" rel="noopener" className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface p-4">
                <span className="min-w-0">
                  <span className="block font-medium">{demo.label}</span>
                  <span className="block text-sm text-muted">{demo.hint}</span>
                </span>
                <span className={ghostButton}>Ouvrir</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs text-faint">{"La démo s’ouvre en ligne : il faut du réseau."}</p>
      </div>
    );
  }

  const shot = slide.shot;
  const body =
    slide.type === "cover" ? (
      <div className="flex flex-col gap-4">
        <Eyebrow>{slide.eyebrow}</Eyebrow>
        <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-tight md:text-6xl">
          {slide.title} <span className="ember-text">{slide.accent}</span>
        </h1>
        <p className="text-lg text-muted md:text-xl">{slide.lead}</p>
      </div>
    ) : (
      <div className="flex flex-col gap-4">
        <Eyebrow>{slide.eyebrow}</Eyebrow>
        {slide.figure && <p className="ember-text font-display text-7xl font-semibold leading-none tracking-tight md:text-8xl">{slide.figure}</p>}
        <h2 className="font-display text-2xl font-medium leading-tight tracking-tight md:text-4xl">{slide.title}</h2>
        <ol className="flex flex-col gap-2.5">
          {slide.points.map((point, i) => (
            <li key={point.title} className="flex gap-3">
              {slide.numbered ? (
                <span className="ember-gradient flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-background tabular-nums">{i + 1}</span>
              ) : (
                <span aria-hidden className="ember-gradient mt-2 size-2 shrink-0 rounded-full" />
              )}
              <span>
                <span className="block font-medium">{point.title}</span>
                <span className="block text-sm text-muted md:text-base">{point.text}</span>
              </span>
            </li>
          ))}
        </ol>
        {slide.note && <p className="text-xs text-faint">{slide.note}</p>}
      </div>
    );

  if (!shot) return <div className="mx-auto max-w-2xl">{body}</div>;
  return (
    <div className="flex flex-col items-center gap-4 landscape:flex-row landscape:items-center landscape:gap-10">
      <ShotFrame shot={shot} large={slide.type === "cover"} />
      <div className="w-full min-w-0 flex-1">{body}</div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-faint">{children}</p>;
}

/** large : la couverture, où la capture a la place de grandir. */
function ShotFrame({ shot, large }: { shot: Shot; large: boolean }) {
  return (
    <figure className="flex shrink-0 flex-col items-center gap-2">
      <Image
        src={shot.src}
        alt={shot.alt}
        width={screenSizes.phone.width}
        height={screenSizes.phone.height}
        unoptimized
        className={`${large ? "h-[40dvh]" : "h-[24dvh]"} w-auto rounded-[22px] border border-hairline object-cover object-top shadow-lg landscape:h-[62dvh]`}
      />
      <figcaption className="text-[11px] text-faint">{shot.caption}</figcaption>
    </figure>
  );
}
