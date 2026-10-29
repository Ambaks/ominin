import { useId, useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, interpolate } from "remotion";

/*
 * Le chiffre en compteur : un rouleau par chiffre, qui tourne comme un
 * odomètre (le rouleau des dizaines suit la retenue des unités), flou de
 * bougé selon sa vitesse, fondu en haut et en bas de sa fenêtre. Un rouleau de
 * tête n'existe pas tant que le compte ne l'atteint pas : il s'ouvre à la
 * retenue et pousse le nombre (2 → 12). Le reste de la valeur (signe,
 * séparateurs, unité) est posé tel quel : à l'arrivée, on lit exactement la
 * chaîne donnée. Un zéro se compte à rebours, depuis 9. Une fois posé, un
 * reflet de braise éclaircie traverse le chiffre (sheen, 0 → 1).
 */

/** Hauteur d'une case de rouleau, en em. */
const CELL = 1.1;
/** Corps de l'unité, en em du chiffre. */
const UNIT = 0.46;
/** Flou de bougé : écart-type par case parcourue en une image, en px. */
const BLUR_PER_CELL = 0.18;
const BLUR_MAX = 16;
/** Demi-largeur du reflet, en % de la largeur du chiffre. */
const SHEEN_HALF = 14;
/** Corps des mesures, en px. */
const PROBE = 100;
const STRIP = Array.from({ length: 11 }, (_, i) => i % 10);

export type FigureValue = {
  prefix: string;
  number: string;
  suffix: string;
  /** Les chiffres seuls, lus comme un entier : « 2,5 » → 25. */
  target: number;
  from: number;
  places: number;
};

export function parseValue(value: string): FigureValue {
  const [, prefix, number, suffix] = value.match(/^(\D*?)(\d(?:[\d\s.,]*\d)?)(.*)$/)!;
  const digits = number.replace(/\D/g, "");
  const target = Number(digits);
  return {
    prefix: prefix.trim(),
    number,
    suffix: suffix.trim(),
    target,
    from: target === 0 ? 10 ** digits.length - 1 : 0,
    places: digits.length,
  };
}

/* Position continue du rouleau de rang place : il ne bouge que pendant la retenue. */
function reel(count: number, place: number) {
  const unit = 10 ** place;
  const whole = Math.floor(count / unit);
  return whole + Math.max(0, count - whole * unit - (unit - 1));
}

const wrap = (position: number) => ((position % 10) + 10) % 10;

/** Chasse des chiffres 0 à 9, en em, avant la mesure. */
const DEFAULT_WIDTHS = Array<number>(10).fill(0.6);

/**
 * count : la valeur comptée, entre from et target ; previous : celle de
 * l'image d'avant, pour le flou ; settle : décalage du rouleau des unités en
 * cases, son rebond à l'arrêt ; widths : chasse de chaque chiffre, en em.
 * Chaque rouleau prend la chasse du chiffre qu'il montre : « 18 » se lit
 * serré comme un texte composé, pas en colonnes.
 */
export function FigureCount({
  value,
  count,
  previous,
  settle,
  size,
  widths,
  unitShown,
  sheen = 0,
}: {
  value: FigureValue;
  count: number;
  previous: number;
  settle: number;
  size: number;
  widths: number[];
  unitShown: number;
  sheen?: number;
}) {
  const id = `figure${useId().replace(/\W/g, "")}`;
  const widest = Math.max(...widths);
  let place = value.places;
  return (
    <div className="kit-display relative whitespace-nowrap" style={{ fontSize: size, lineHeight: CELL }}>
      {value.prefix}
      {[...value.number].map((char, key) => {
        if (!/\d/.test(char)) return <span key={key}>{char}</span>;
        place -= 1;
        const extra = place === 0 ? settle : 0;
        const position = wrap(reel(count, place) + extra);
        const blur = Math.min(BLUR_MAX, Math.abs(reel(count, place) - reel(previous, place)) * size * CELL * BLUR_PER_CELL);
        const shown = Math.floor(position);
        const unit = 10 ** place;
        const opened = place > 0 && unit <= Math.max(value.target, value.from) ? interpolate(count, [unit - 1, unit], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
        const slot = opened * interpolate(position - shown, [0, 1], [widths[shown % 10], widths[(shown + 1) % 10]]);
        const filter = `${id}-${place}`;
        return (
          <span key={key} className="relative inline-block align-top" style={{ width: `${slot}em`, height: `${CELL}em`, opacity: opened }}>
            <span
              className="absolute inset-y-0 overflow-hidden text-center"
              style={{ left: `${(slot - widest) / 2}em`, width: `${widest}em`, maskImage: "linear-gradient(transparent, #000 14%, #000 86%, transparent)" }}
            >
              {blur > 0.5 && (
                <svg className="absolute size-0">
                  <filter id={filter} x="-10%" y="-20%" width="120%" height="140%">
                    <feGaussianBlur stdDeviation={`0 ${blur}`} />
                  </filter>
                </svg>
              )}
              <span className="block" style={{ transform: `translateY(${-position * CELL}em)`, filter: blur > 0.5 ? `url(#${filter})` : undefined }}>
                {STRIP.map((digit, i) => (
                  <span key={i} className="block">
                    {digit}
                  </span>
                ))}
              </span>
            </span>
          </span>
        );
      })}
      {value.suffix && (
        <span
          className="inline-block"
          style={{ fontSize: `${UNIT}em`, lineHeight: 1, marginLeft: "0.1em", opacity: unitShown, transform: `translateY(${(1 - unitShown) * 0.4}em)`, filter: `blur(${(1 - unitShown) * 6}px)` }}
        >
          {value.suffix}
        </span>
      )}
      {sheen > 0 && sheen < 1 && <Sheen value={value} widths={widths} at={-SHEEN_HALF + sheen * (100 + 2 * SHEEN_HALF)} />}
    </div>
  );
}

/* Le reflet : la valeur posée, recomposée à l'identique par-dessus, peinte
 * d'une bande de braise qui ne prend que sur les lettres. */
function Sheen({ value, widths, at }: { value: FigureValue; widths: number[]; at: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 whitespace-nowrap text-transparent"
      style={{
        backgroundImage: `linear-gradient(100deg, transparent ${at - SHEEN_HALF}%, color-mix(in oklab, var(--ember-1) 65%, var(--surface-raised)) ${at}%, transparent ${at + SHEEN_HALF}%)`,
        backgroundClip: "text",
      }}
    >
      {value.prefix}
      {[...value.number].map((char, key) =>
        /\d/.test(char) ? (
          <span key={key} className="inline-block text-center align-top" style={{ width: `${widths[Number(char)]}em`, height: `${CELL}em` }}>
            {char}
          </span>
        ) : (
          <span key={key}>{char}</span>
        ),
      )}
      {value.suffix && (
        <span className="inline-block" style={{ fontSize: `${UNIT}em`, lineHeight: 1, marginLeft: "0.1em" }}>
          {value.suffix}
        </span>
      )}
    </div>
  );
}

const geistReady = () => [...document.fonts].some((face) => face.family.replaceAll('"', "") === "Geist" && face.weight === "800");

/**
 * La chasse des chiffres, puis le corps du chiffre pour que sa valeur finale
 * tienne dans width ; mesurés une fois Geist chargée.
 */
export function useFigureSize(value: FigureValue, width: number, max: number) {
  const digits = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLDivElement>(null);
  const [widths, setWidths] = useState<number[] | null>(null);
  const [size, setSize] = useState(max);
  const [handle] = useState(() => delayRender("Corps du chiffre"));

  useLayoutEffect(() => {
    let raf = 0;
    const fit = () => {
      if (!geistReady()) {
        raf = requestAnimationFrame(fit);
        return;
      }
      if (!widths) {
        setWidths([...digits.current!.children].map((digit) => (digit as HTMLElement).getBoundingClientRect().width / PROBE));
        return;
      }
      setSize(Math.min(max, (width * PROBE) / probe.current!.getBoundingClientRect().width));
      continueRender(handle);
    };
    fit();
    return () => cancelAnimationFrame(raf);
  }, [handle, widths, width, max]);

  const sizer = (
    <div aria-hidden className="invisible absolute left-0 top-0">
      <div ref={digits} className="kit-display flex" style={{ fontSize: PROBE }}>
        {STRIP.slice(0, 10).map((digit) => (
          <span key={digit}>{digit}</span>
        ))}
      </div>
      <div ref={probe} className="w-max">
        <FigureCount value={value} count={value.target} previous={value.target} settle={0} size={PROBE} widths={widths ?? DEFAULT_WIDTHS} unitShown={1} />
      </div>
    </div>
  );
  return { size, widths: widths ?? DEFAULT_WIDTHS, sizer };
}
