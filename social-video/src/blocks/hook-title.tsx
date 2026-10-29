import { Fragment, type ReactNode } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { progress } from "../motion.ts";
import { parts } from "./headline.tsx";
import { SAFE } from "./stage.tsx";

/*
 * Le titre de l'accroche : chaque mot monte en un fondu bref ; le pavé
 * braise balaie le passage [[ ]], ses mots montent dessus, foncés, puis un reflet le traverse jusqu'à la fin. Le passage tient sur
 * une ligne pour que le pavé l'épouse : le corps se règle sur le plus long
 * morceau insécable.
 */

/* Corps maximal, en rem : un titre court ne tourne pas à l'affiche. */
const MAX_SIZE = 4.4;
/* Avance moyenne d'un signe en Geist 800 serrée, en em, comptée large :
 * le passage marqué ne déborde jamais de la colonne. */
const CHAR = 0.47;
/* Entrée d'un mot : temps en images, montée en em. Le fondu, bref, ne
 * laisse jamais de mot gris ni rogné. */
const WORD = { stagger: 3, fade: 4, rise: 12, lift: 0.25 };
/* Pavé : balayage et retard de ses mots en images ; marge, débords haut et
 * bas, rayon et écart à la ligne du dessus en em du titre. */
const MARK = { wipe: 8, lag: 3, padX: 0.2, top: 0.04, bottom: 0.02, radius: 0.16, gap: 0.16 };
/* Reflet sur le pavé posé, en images. */
const SHEEN = { delay: 10, sweep: 20, every: 60 };

export function HookTitle({ title, start }: { title: string; start: number }) {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const pieces = parts(title);

  const widest = Math.max(
    ...pieces.flatMap((part) =>
      part.marked ? [part.words.join(" ").length + (2 * MARK.padX) / CHAR] : part.words.map((text) => text.length),
    ),
  );
  const column = width - SAFE.left - SAFE.right;

  const word = (text: string, at: number) => (
    <span
      className="inline-block"
      style={{ opacity: progress(frame, at, WORD.fade), transform: `translateY(${(1 - progress(frame, at, WORD.rise)) * WORD.lift}em)` }}
    >
      {text}
    </span>
  );
  const line = (words: string[], at: (i: number) => number): ReactNode =>
    words.map((text, i) => <Fragment key={i}>{i > 0 && " "}{word(text, at(i))}</Fragment>);

  let index = 0;
  const rendered = pieces.map((part, key) => {
    const first = start + index * WORD.stagger;
    index += part.words.length;
    if (!part.marked) return <Fragment key={key}>{line(part.words, (i) => first + i * WORD.stagger)} </Fragment>;

    const wipe = progress(frame, first, MARK.wipe);
    const since = frame - (first + MARK.wipe + SHEEN.delay);
    const sheen = since < 0 ? 2 : (since % SHEEN.every) / SHEEN.sweep;
    return (
      <Fragment key={key}>
        <span
          className="relative isolate inline-block whitespace-nowrap text-background"
          style={{ padding: `0 ${MARK.padX}em`, marginTop: `${MARK.gap}em` }}
        >
          <span
            aria-hidden
            className="ember-gradient absolute inset-x-0 -z-10 overflow-hidden"
            style={{
              top: `-${MARK.top}em`,
              bottom: `-${MARK.bottom}em`,
              borderRadius: `${MARK.radius}em`,
              clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0 round ${MARK.radius}em)`,
            }}
          >
            <span
              className="absolute inset-y-0 w-[40%] -skew-x-12"
              style={{ left: `${-50 + sheen * 170}%`, background: "linear-gradient(90deg, transparent, rgb(255 255 255 / 0.45), transparent)" }}
            />
          </span>
          {line(part.words, (i) => first + MARK.lag + i * WORD.stagger)}
        </span>{" "}
      </Fragment>
    );
  });

  return (
    <h1 className="kit-display" style={{ lineHeight: 0.95, fontSize: `min(${MAX_SIZE}rem, ${column / (widest * CHAR)}px)` }}>
      {rendered}
    </h1>
  );
}
