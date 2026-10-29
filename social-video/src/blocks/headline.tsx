import { useCurrentFrame } from "remotion";
import { progress } from "../motion.ts";

/* Le titre du hero des landings, image par image : chaque mot monte flou
 * et se pose net, opaque en quatre images (jamais de mot coupé ni gris
 * longtemps), et le pavé braise se pose sur le passage encadré de [[ ]]
 * pendant que ses mots, foncés, montent dessus. */

const WORD_STAGGER = 3;
const WORD_RISE = 14;
const WORD_FADE = 4;
const WORD_BLUR = 6;
const MARK_WIPE = 10;

/** Les morceaux du titre, dans l'ordre : chacun sa liste de mots. */
export function parts(title: string): { words: string[]; marked: boolean }[] {
  return title
    .split(/(\[\[.+?\]\])/)
    .map((part) => ({
      marked: part.startsWith("[["),
      words: part.replace(/^\[\[|\]\]$/g, "").split(/\s+/).filter(Boolean),
    }))
    .filter((part) => part.words.length);
}

/** size : corps du titre, en rem de la toile. */
export function Headline({ title, start, size }: { title: string; start: number; size: number }) {
  const frame = useCurrentFrame();
  let index = 0;

  const word = (text: string, at: number) => {
    const rise = progress(frame, at, WORD_RISE);
    const shown = progress(frame, at, WORD_FADE);
    return (
      <span
        style={{
          display: "inline-block",
          opacity: shown,
          filter: `blur(${(1 - rise) * WORD_BLUR}px)`,
          transform: `translateY(${(1 - rise) * 0.3}em)`,
        }}
      >
        {text}
      </span>
    );
  };

  return (
    <h1 className="kit-display" style={{ fontSize: `${size}rem` }}>
      {parts(title).map((part, key) => {
        if (!part.marked) {
          return <span key={key}>{part.words.map((text, i) => <span key={i}>{word(text, start + index++ * WORD_STAGGER)} </span>)}</span>;
        }
        const markAt = start + index * WORD_STAGGER;
        const rendered = part.words.map((text, i) => (
          <span key={i}>
            {i > 0 && " "}
            {word(text, markAt + 2 + i * WORD_STAGGER)}
          </span>
        ));
        index += part.words.length;
        return (
          <span key={key}>
            <span className="kit-mark" style={{ "--mark": progress(frame, markAt, MARK_WIPE) } as React.CSSProperties}>
              {rendered}
            </span>{" "}
          </span>
        );
      })}
    </h1>
  );
}
