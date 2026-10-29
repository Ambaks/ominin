import { useContext, useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { LookContext } from "../look.ts";
import { progress } from "../motion.ts";
import { parts } from "./headline.tsx";

/*
 * Le titre des points : les mots montent un à un, puis le passage [[ ]] tient
 * sur une ligne, dans un pavé braise de toute la largeur qui se pose de
 * gauche à droite avant que ses mots ne montent ; un reflet le traverse
 * ensuite à intervalle régulier. Le corps se règle pour
 * que le pavé et le mot le plus long tiennent dans la largeur.
 */

/** Corps maximal, en px de la toile. */
const MAX_SIZE = 130;
/** Corps des mesures, en px. */
const PROBE_SIZE = 100;
/** Part de la largeur que prend le passage le plus long : le pavé garde de l'air. */
const FIT = 0.94;
const STAGGER = 3;
const RISE = 14;
const WIPE = 8;
const SHEEN_EVERY = 45;
const SHEEN = 24;

/* La montée du hero des landings (kit-rise) : le mot arrive flou et transparent,
 * se pose net ; aucun cache, donc jamais de mot rogné. */
function Word({ text, at, frame }: { text: string; at: number; frame: number }) {
  const rise = progress(frame, at, RISE);
  return (
    <span
      className="inline-block"
      style={{ opacity: progress(frame, at, RISE * 0.6), transform: `translateY(${(1 - rise) * 0.45}em)`, filter: `blur(${(1 - rise) * 6}px)` }}
    >
      {text}
    </span>
  );
}

/** width : largeur du pavé ; inset : retrait du texte, celui des cartes. */
export function PointsTitle({ title, start, frame, width, inset }: { title: string; start: number; frame: number; width: number; inset: number }) {
  const probe = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(MAX_SIZE);
  const [handle] = useState(() => delayRender("Corps du titre des points"));
  const pieces = parts(title);
  const look = useContext(LookContext);

  /* Mesure une fois Geist chargée (src/fonts.ts ne l'ajoute qu'une fois prête). */
  useLayoutEffect(() => {
    let raf = 0;
    const fit = () => {
      if (![...document.fonts].some((face) => face.family.replaceAll('"', "") === "Geist" && face.weight === "800")) {
        raf = requestAnimationFrame(fit);
        return;
      }
      const widest = Math.max(...[...probe.current!.children].map((child) => (child as HTMLElement).offsetWidth));
      setSize(Math.min(MAX_SIZE, ((width - 2 * inset) * PROBE_SIZE * FIT) / widest));
      continueRender(handle);
    };
    fit();
    return () => {
      cancelAnimationFrame(raf);
      continueRender(handle);
    };
  }, [handle, title, width, inset]);

  let clock = start;
  return (
    <h1 className="kit-display relative" style={{ fontSize: size, width }}>
      <div ref={probe} aria-hidden className="kit-display invisible absolute left-0 top-0" style={{ fontSize: PROBE_SIZE }}>
        {pieces.flatMap((part, key) =>
          part.marked
            ? [<span key={key} className="block w-max">{part.words.join(" ")}</span>]
            : part.words.map((text, i) => <span key={`${key}-${i}`} className="block w-max">{text}</span>),
        )}
      </div>
      {pieces.map((part, key) => {
        if (!part.marked) {
          return (
            <p key={key} className="text-balance" style={{ paddingLeft: inset, paddingRight: inset }}>
              {part.words.map((text, i) => {
                const at = clock;
                clock += STAGGER;
                return <span key={i}>{i > 0 && " "}<Word text={text} at={at} frame={frame} /></span>;
              })}
            </p>
          );
        }
        const wipeAt = clock;
        clock += WIPE / 2;
        const passageAt = clock;
        clock += STAGGER;
        const wipe = progress(frame, wipeAt, WIPE);
        const sheenFrom = wipeAt + WIPE + RISE;
        const sheen = frame < sheenFrom ? 0 : progress((frame - sheenFrom) % SHEEN_EVERY, 0, SHEEN);
        return (
          <div
            key={key}
            className={`relative my-[0.08em] overflow-hidden whitespace-nowrap rounded-[0.14em] ${look === "flamme" ? "text-foreground" : "text-background"}`}
            style={{ padding: `0.06em ${inset}px 0.1em`, clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0 round 0.14em)` }}
          >
            {/* Flamme : pavé crème, comme le surligné du plateau. Lin : départ tiré vers --ember-2, l'encre crème y reste lisible. */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  look === "flamme"
                    ? "var(--background)"
                    : `linear-gradient(100deg, ${look === "lin" ? "color-mix(in oklab, var(--ember-1), var(--ember-2) 65%)" : "var(--ember-1)"}, var(--ember-2) 55%, var(--ember-3))`,
              }}
            />
            <div
              className="absolute inset-y-0 w-[40%] bg-linear-to-r from-transparent via-white/35 to-transparent"
              style={{ transform: `translateX(${-120 + sheen * 370}%) skewX(-18deg)` }}
            />
            {/* Le passage monte d'un bloc : jamais deux mots à deux hauteurs dans le pavé. */}
            <span className="relative">
              <Word text={part.words.join(" ")} at={passageAt} frame={frame} />
            </span>
          </div>
        );
      })}
    </h1>
  );
}
