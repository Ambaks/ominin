import { Fragment, useContext } from "react";
import { useCurrentFrame } from "remotion";
import { LookContext } from "../look.ts";
import { progress } from "../motion.ts";
import { parts } from "./headline.tsx";

/*
 * Le titre de l'accroche : chaque mot monte en un fondu bref, puis un masque
 * horizontal écrit d'un geste le passage [[ ]] sur son pavé braise, pavé et
 * mots ensemble ; un reflet le traverse ensuite jusqu'à la fin. Le passage
 * tient sur une ligne pour que le pavé l'épouse. Le corps se règle sur le
 * plus long morceau insécable, puis sur la hauteur disponible.
 */

/* Corps maximal, en px : un titre court ne tourne pas à l'affiche. */
const MAX_SIZE = 194;
/* Avance moyenne d'un signe en Geist 800 serrée, en em, comptée large :
 * le passage marqué ne déborde jamais de la colonne. */
const CHAR = 0.49;
/* Interligne, en part du corps. */
const LINE = 0.88;
/* Entrée d'un mot : temps en images, montée en em. Le fondu, bref, ne
 * laisse jamais de mot gris ni rogné. */
const WORD = { stagger: 3, fade: 3, rise: 10, lift: 0.25 };
/* Pavé : écriture en images ; marge, débords haut et bas, rayon et écart
 * à la ligne du dessus en em du titre. */
const MARK = { wipe: 8, padX: 0.2, top: 0.04, bottom: 0.02, radius: 0.16, gap: 0.12 };
/* Reflet sur le pavé posé, en images. */
const SHEEN = { delay: 4, sweep: 16, every: 40 };

/** Image où le pavé commence à s'écrire, après les mots qui le précèdent. */
export function markStart(title: string, start: number) {
  const pieces = parts(title);
  const before = pieces.slice(0, Math.max(0, pieces.findIndex((part) => part.marked)));
  return start + before.reduce((sum, part) => sum + part.words.length, 0) * WORD.stagger;
}

/* Lignes du titre coupé mot à mot sur perLine signes ; le passage marqué
 * compte pour un bloc. */
function rows(tokens: number[], perLine: number) {
  let lines = 1;
  let used = 0;
  for (const length of tokens) {
    const next = used ? used + 1 + length : length;
    if (used && next > perLine) {
      lines += 1;
      used = length;
    } else used = next;
  }
  return lines;
}

/** column : largeur en px ; budget : hauteur maximale en px. */
export function HookTitle({ title, start, column, budget }: { title: string; start: number; column: number; budget: number }) {
  const frame = useCurrentFrame();
  const flamme = useContext(LookContext) === "flamme";
  const pieces = parts(title);

  const tokens = pieces.flatMap((part) =>
    part.marked ? [part.words.join(" ").length + (2 * MARK.padX) / CHAR] : part.words.map((text) => text.length),
  );
  const fit = Math.min(MAX_SIZE, column / (Math.max(...tokens) * CHAR));
  const size = Math.min(fit, budget / (rows(tokens, column / (fit * CHAR)) * LINE + MARK.gap));

  const word = (text: string, at: number) => (
    <span
      className="inline-block"
      style={{ opacity: progress(frame, at, WORD.fade), transform: `translateY(${(1 - progress(frame, at, WORD.rise)) * WORD.lift}em)` }}
    >
      {text}
    </span>
  );

  let index = 0;
  const rendered = pieces.map((part, key) => {
    const first = start + index * WORD.stagger;
    index += part.words.length;
    if (!part.marked) {
      return <Fragment key={key}>{part.words.map((text, i) => <Fragment key={i}>{word(text, first + i * WORD.stagger)} </Fragment>)}</Fragment>;
    }

    const wipe = progress(frame, first, MARK.wipe);
    const since = frame - (first + MARK.wipe + SHEEN.delay);
    const sheen = since < 0 ? 2 : (since % SHEEN.every) / SHEEN.sweep;
    return (
      <Fragment key={key}>
        {/* Flamme : pavé crème, mots sombres, comme le .kit-mark du site sur cet habillage. */}
        <span
          className={`relative isolate inline-block whitespace-nowrap ${flamme ? "text-foreground" : "text-background"}`}
          style={{
            padding: `0 ${MARK.padX}em`,
            marginTop: `${MARK.gap}em`,
            clipPath: `inset(-0.2em ${(1 - wipe) * 100}% -0.2em -0.2em)`,
          }}
        >
          <span
            aria-hidden
            className={`absolute inset-x-0 -z-10 overflow-hidden ${flamme ? "bg-background" : "ember-gradient"}`}
            style={{ top: `-${MARK.top}em`, bottom: `-${MARK.bottom}em`, borderRadius: `${MARK.radius}em` }}
          >
            <span
              className="absolute inset-y-0 w-[45%] -skew-x-12"
              style={{ left: `${-50 + sheen * 170}%`, background: "linear-gradient(90deg, transparent, rgb(255 255 255 / 0.55), transparent)" }}
            />
          </span>
          {part.words.join(" ")}
        </span>{" "}
      </Fragment>
    );
  });

  return (
    <h1 className="kit-display" style={{ lineHeight: LINE, fontSize: size }}>
      {rendered}
    </h1>
  );
}
