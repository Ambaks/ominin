import Image from "next/image";
import type { Shot, Slide } from "@/lib/commercial/decks";
import { screenSizes } from "@/lib/pitch/kit";
import { ghostButton } from "@/components/commercial/space/ui";

/*
 * Les diapositives d'un deck (lib/commercial/decks.ts), pensées d'abord pour
 * un téléphone tenu en hauteur : les captures au-dessus du titre, côte à côte
 * dès que l'écran s'élargit (tablette, téléphone en paysage).
 */

export function DeckSlide({ slide }: { slide: Slide }) {
  if (slide.type === "demo") {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-5">
        <Eyebrow>La démo</Eyebrow>
        <h2 className="font-display text-3xl font-medium leading-tight tracking-tight md:text-4xl">Essayez-la vous-même.</h2>
        <p className="text-muted">{"Une vraie carte, sur données de démonstration : rien n’est encaissé."}</p>
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
        <p className="text-xs text-faint">{"La démo s’ouvre en ligne : il faut du réseau."}</p>
      </div>
    );
  }

  if (slide.type === "cover") {
    return (
      <div className="flex flex-col items-center gap-5 landscape:flex-row landscape:gap-10">
        <ShotFrame shot={slide.shot} height="h-[48dvh]" />
        <div className="flex w-full min-w-0 flex-1 flex-col gap-3">
          <Eyebrow>{slide.eyebrow}</Eyebrow>
          <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-tight md:text-6xl">
            {slide.title} <span className="ember-text">{slide.accent}</span>
          </h1>
        </div>
      </div>
    );
  }

  if (slide.type === "shot") {
    // Une capture d'écran large (comptoir, salle) prend toute la largeur ; des téléphones se partagent la rangée.
    const wide = slide.shots.some((shot) => shot.screen && shot.screen !== "phone");
    return (
      <div className="flex flex-col items-center gap-5 landscape:flex-row landscape:gap-10">
        <div className={`flex shrink-0 justify-center gap-3 ${wide ? "w-full landscape:w-3/5" : ""}`}>
          {slide.shots.map((shot) => (
            <ShotFrame key={shot.src} shot={shot} height={wide ? undefined : slide.shots.length > 1 ? "h-[40dvh]" : "h-[54dvh]"} />
          ))}
        </div>
        <div className="flex w-full min-w-0 flex-1 flex-col items-center gap-3 text-center landscape:items-start landscape:text-left">
          <h2 className="font-display text-3xl font-medium leading-tight tracking-tight md:text-5xl">{slide.title}</h2>
          <Keywords words={slide.keywords} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Eyebrow>{slide.eyebrow}</Eyebrow>
      {slide.figure && <p className="ember-text font-display text-8xl font-semibold leading-none tracking-tight md:text-9xl">{slide.figure}</p>}
      <h2 className="font-display text-3xl font-medium leading-tight tracking-tight md:text-5xl">{slide.title}</h2>
      {slide.numbered ? (
        <ol className="flex flex-col gap-3">
          {slide.keywords.map((word, i) => (
            <li key={word} className="flex items-center gap-3 text-lg font-medium">
              <span className="ember-gradient flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-background tabular-nums">{i + 1}</span>
              {word}
            </li>
          ))}
        </ol>
      ) : (
        <Keywords words={slide.keywords} />
      )}
      {slide.note && <p className="text-xs text-faint">{slide.note}</p>}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-faint">{children}</p>;
}

function Keywords({ words }: { words: string[] }) {
  return (
    <ul className="flex flex-wrap justify-center gap-2 landscape:justify-start">
      {words.map((word) => (
        <li key={word} className="rounded-full border border-hairline bg-surface px-3.5 py-1.5 text-sm font-medium md:text-base">
          {word}
        </li>
      ))}
    </ul>
  );
}

/** height : la hauteur d'un téléphone à l'écran ; sans elle, la capture suit la largeur. */
function ShotFrame({ shot, height }: { shot: Shot; height?: string }) {
  const size = screenSizes[shot.screen ?? "phone"];
  return (
    <figure className={`flex min-w-0 flex-col items-center gap-2 ${height ? "" : "w-full"}`}>
      <Image
        src={shot.src}
        alt={shot.alt}
        width={size.width}
        height={size.height}
        unoptimized
        className={`${height ? `${height} w-auto landscape:h-[62dvh]` : "h-auto w-full"} rounded-[22px] border border-hairline object-cover object-top shadow-lg`}
      />
      <figcaption className="text-[11px] text-faint">{shot.caption}</figcaption>
    </figure>
  );
}
