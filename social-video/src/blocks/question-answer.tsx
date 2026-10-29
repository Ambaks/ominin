import { Fragment, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import { progress } from "../motion.ts";
import { SAFE } from "./stage.tsx";

/*
 * La réponse en titre : les mots montent un à un, le pavé braise se pose
 * net sur le passage [[ ]], tenu sur une ligne avec la ponctuation qui le
 * suit, puis ses mots montent dessus sans flou ; une ombre chaude le décolle
 * du fond ; un reflet le traverse et sa lueur bat jusqu'à
 * la fin. Le corps, mesuré une fois Geist chargée sur une copie invisible,
 * est le plus grand où la réponse tient en largeur et en FIT.lines lignes,
 * un peu moins s'il évite un mot seul sur sa ligne.
 */

/* Corps maximal et pas de la recherche, en px de la toile ; part du corps
 * qu'on accepte de perdre pour ne pas laisser un mot seul sur sa ligne. */
const FIT = { max: 170, step: 2, lines: 3, orphanFloor: 0.8 };
const LINE_HEIGHT = 0.98;
/* Montée d'un mot : fondu et montée en images, décalage en em, flou en px. */
const WORD = { fade: 4, rise: 10, lift: 0.3, blur: 4 };
const SHARP = { fade: 3, rise: 8, lift: 0.12 };
/* Pavé : balayage et retard de ses mots, en images ; à son arrivée il gonfle
 * un instant (avance et durée en images, ampleur). */
const MARK = { wipe: 9, lag: 4, bumpLead: 3, bump: 10, bumpScale: 0.03 };
/* Reflet : attente après le pavé, traversée et retour, en images ; lueur
 * du pavé qui bat ensuite, période en images et rayon en em. */
const SHEEN = { delay: 6, sweep: 20, every: 40 };
const GLOW = { period: 40, radius: 0.4 };

type Piece = { words: string[]; marked: boolean; tail?: string };

/** Les morceaux du titre ; le signe collé après ]] (virgule, point…) suit le pavé. */
function pieces(title: string): Piece[] {
  const out: Piece[] = [];
  for (const chunk of title.split(/(\[\[.+?\]\])/)) {
    if (chunk.startsWith("[[")) {
      out.push({ marked: true, words: chunk.slice(2, -2).split(/\s+/).filter(Boolean) });
      continue;
    }
    const words = chunk.split(/\s+/).filter(Boolean);
    const last = out.at(-1);
    if (last?.marked && words.length && /^\S/.test(chunk)) last.tail = words.shift();
    if (words.length) out.push({ marked: false, words });
  }
  return out;
}

/** Image où le pavé est posé, pour enchaîner dessus. */
export function answerDone(title: string, start: number, stagger: number) {
  let index = 0;
  for (const piece of pieces(title)) {
    if (piece.marked) return start + index * stagger + MARK.wipe;
    index += piece.words.length + (piece.tail ? 1 : 0);
  }
  return start + index * stagger;
}

export function QuestionAnswer({ title, start, stagger }: { title: string; start: number; stagger: number }) {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const column = width - SAFE.left - SAFE.right;
  const probe = useRef<HTMLHeadingElement>(null);
  const [size, setSize] = useState(FIT.max);
  const [handle] = useState(() => delayRender("Corps de la réponse"));

  useLayoutEffect(() => {
    let raf = 0;
    const fit = () => {
      if (![...document.fonts].some((face) => face.family.replaceAll('"', "") === "Geist" && face.weight === "800")) {
        raf = requestAnimationFrame(fit);
        return;
      }
      const copy = probe.current!;
      const words = [...copy.querySelectorAll<HTMLElement>("[data-word]")];
      /* Lignes de la copie au corps donné ; orpheline : une ligne d'un seul mot hors du pavé. */
      const layout = (px: number) => {
        copy.style.fontSize = `${px}px`;
        const rows: HTMLElement[][] = [];
        let last = -Infinity;
        for (const word of words) {
          const top = word.getBoundingClientRect().top;
          if (top - last > px / 2) rows.push([]);
          rows.at(-1)!.push(word);
          last = top;
        }
        return { fits: copy.scrollWidth <= column && rows.length <= FIT.lines, orphan: rows.some((row) => row.length === 1 && !row[0].closest(".kit-mark")) };
      };
      let best = FIT.max;
      while (best > FIT.step && !layout(best).fits) best -= FIT.step;
      let next = best;
      while (next > best * FIT.orphanFloor && layout(next).orphan) next -= FIT.step;
      setSize(layout(next).orphan ? best : next);
      continueRender(handle);
    };
    fit();
    return () => {
      cancelAnimationFrame(raf);
      continueRender(handle);
    };
  }, [handle, title, column]);

  /* still : la copie de mesure, dans son état final. */
  const render = (still: boolean) => {
    /* sharp : sur le pavé déjà net, montée courte et sans flou. */
    const word = (text: string, at: number, sharp = false) => {
      if (still)
        return (
          <span data-word className="inline-block">
            {text}
          </span>
        );
      const { fade, rise: riseFrames, lift } = sharp ? SHARP : WORD;
      const rise = progress(frame, at, riseFrames);
      return (
        <span
          className="inline-block"
          style={{
            opacity: progress(frame, at, fade),
            transform: `translateY(${(1 - rise) * lift}em)`,
            filter: sharp ? undefined : `blur(${(1 - rise) * WORD.blur}px)`,
          }}
        >
          {text}
        </span>
      );
    };
    const line = (words: string[], at: (i: number) => number, sharp = false): ReactNode =>
      words.map((text, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          {word(text, at(i), sharp)}
        </Fragment>
      ));

    let index = 0;
    return pieces(title).map((piece, key) => {
      const first = start + index * stagger;
      index += piece.words.length + (piece.tail ? 1 : 0);
      if (!piece.marked) return <Fragment key={key}>{line(piece.words, (i) => first + i * stagger)} </Fragment>;

      const wiped = still ? 1 : progress(frame, first, MARK.wipe, Easing.bezier(0.6, 0, 0.2, 1));
      const since = still ? 0 : frame - (first + MARK.wipe + SHEEN.delay);
      const sheen = since < 0 ? 0 : progress(since % SHEEN.every, 0, SHEEN.sweep, Easing.inOut(Easing.quad));
      const glow = since < 0 ? 0 : (1 - Math.cos((since / GLOW.period) * 2 * Math.PI)) / 2;
      return (
        <Fragment key={key}>
          <span className="whitespace-nowrap">
            <span
              className="kit-mark"
              style={
                {
                  "--mark": wiped,
                  transformOrigin: "left center",
                  transform: `scale(${1 + (still ? 0 : Math.sin(progress(frame, first + MARK.wipe - MARK.bumpLead, MARK.bump) * Math.PI) * MARK.bumpScale)})`,
                  filter: [
                    `drop-shadow(0 0.1em 0.2em color-mix(in oklab, var(--ember-2) ${wiped * 45}%, transparent))`,
                    `drop-shadow(0 0 ${glow * GLOW.radius}em color-mix(in oklab, var(--ember-2) ${glow * 60}%, transparent))`,
                  ].join(" "),
                } as React.CSSProperties
              }
            >
              <span className="absolute inset-[0.08em_-0.02em_0.02em] z-[-1] overflow-hidden rounded-[0.12em]">
                <span
                  className="absolute inset-y-0 w-[35%] -skew-x-[18deg] bg-linear-to-r from-transparent via-white/50 to-transparent"
                  style={{ left: `${-40 + sheen * 150}%` }}
                />
              </span>
              {line(piece.words, (i) => first + MARK.lag + i * stagger, true)}
            </span>
            {piece.tail && word(piece.tail, first + MARK.lag + piece.words.length * stagger, true)}
          </span>{" "}
        </Fragment>
      );
    });
  };

  return (
    <div className="relative">
      <h1 ref={probe} aria-hidden className="kit-display invisible absolute left-0 top-0 text-balance" style={{ lineHeight: LINE_HEIGHT, width: column }}>
        {render(true)}
      </h1>
      <h1 className="kit-display text-balance" style={{ lineHeight: LINE_HEIGHT, fontSize: size }}>
        {render(false)}
      </h1>
    </div>
  );
}
