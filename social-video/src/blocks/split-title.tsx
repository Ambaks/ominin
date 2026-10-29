import { Fragment } from "react";
import { useVideoConfig } from "remotion";
import { progress } from "../motion.ts";
import { parts } from "./headline.tsx";
import { SAFE } from "./stage.tsx";

/*
 * Le titre du face-à-face : les mots montent un à un, le pavé braise des
 * landings (kit-mark, que chaque habillage peut repeindre) balaie le passage
 * [[ ]] avant que ses mots ne montent dessus ; un reflet le traverse ensuite
 * jusqu'à la fin. Le passage tient sur une ligne : le corps se règle sur le
 * plus long morceau insécable, sous un plafond qui laisse la place aux deux côtés.
 */

/* Corps maximal, en rem. */
const MAX_SIZE = 3.4;
/* Avance moyenne d'un signe en Geist 800 serrée, en em, comptée large. */
const CHAR = 0.47;
/* Entrée d'un mot : écart et durées en images, montée en em, flou en px. */
const WORD = { stagger: 2, fade: 3, rise: 12, lift: 0.3, blur: 6 };
/* Pavé : balayage et retard de ses mots en images ; marge en em. */
const MARK = { wipe: 8, lag: 3, padX: 0.32 };
/* Reflet sur le pavé posé, en images. */
const SHEEN = { delay: 12, sweep: 20, every: 50 };

export function SplitTitle({ title, frame }: { title: string; frame: number }) {
  const { width } = useVideoConfig();
  const pieces = parts(title);
  const widest = Math.max(...pieces.flatMap((part) => (part.marked ? [part.words.join(" ").length + MARK.padX / CHAR] : part.words.map((text) => text.length))));
  const column = width - SAFE.left - SAFE.right;

  const word = (text: string, at: number) => {
    const rise = progress(frame, at, WORD.rise);
    return (
      <span
        className="inline-block"
        style={{
          opacity: progress(frame, at, WORD.fade),
          transform: `translateY(${(1 - rise) * WORD.lift}em)`,
          filter: `blur(${(1 - rise) * WORD.blur}px)`,
        }}
      >
        {text}
      </span>
    );
  };
  const line = (words: string[], first: number) =>
    words.map((text, i) => <Fragment key={i}>{i > 0 && " "}{word(text, first + i * WORD.stagger)}</Fragment>);

  let index = 0;
  return (
    <h1 className="kit-display" style={{ lineHeight: 0.98, fontSize: `min(${MAX_SIZE}rem, ${column / (widest * CHAR)}px)` }}>
      {pieces.map((part, key) => {
        const first = index * WORD.stagger;
        index += part.words.length;
        if (!part.marked) return <Fragment key={key}>{line(part.words, first)} </Fragment>;
        const since = frame - (first + MARK.wipe + SHEEN.delay);
        const sheen = since < 0 ? -1 : progress(since % SHEEN.every, 0, SHEEN.sweep);
        return (
          <Fragment key={key}>
            <span className="kit-mark whitespace-nowrap" style={{ "--mark": progress(frame, first, MARK.wipe) } as React.CSSProperties}>
              <span aria-hidden className="absolute inset-[0.08em_-0.02em_0.02em] z-[-1] overflow-hidden rounded-[0.12em]">
                <span
                  className="absolute inset-y-0 w-[30%] -skew-x-12 bg-linear-to-r from-transparent via-white/40 to-transparent"
                  style={{ left: `${-40 + sheen * 150}%`, opacity: sheen < 0 ? 0 : 1 }}
                />
              </span>
              {line(part.words, first + MARK.lag)}
            </span>{" "}
          </Fragment>
        );
      })}
    </h1>
  );
}
