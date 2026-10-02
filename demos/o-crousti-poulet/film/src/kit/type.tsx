import { Children, Fragment, type CSSProperties, type ReactNode } from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ocp } from "../brand/tokens";
import { springs, useSpring } from "./motion";

type RevealProps = {
  /**
   * The units, each behind its own mask: a string is split by `split`,
   * otherwise every child is a unit. Stack units as lines with a column
   * flex `style`.
   */
  children: ReactNode;
  split?: "word" | "char";
  delay?: number;
  stagger?: number;
  /** Frame at which the units slide out through the top of their masks. */
  exitAt?: number;
  /**
   * The film's statements: each unit (a line) rises a little and fades in,
   * unmasked. Without it, a unit rises from behind its own mask — the
   * board's handwriting, the small capitals.
   */
  fade?: boolean;
  style?: CSSProperties;
};

// The mask overhangs the glyph box so accents, descenders, a Highlight bar
// and the neon's halo are never cut, less below so a rising line shows
// little under its baseline; the rise starts below the mask's bottom edge.
const OVERHANG = { top: 0.5, bottom: 0.3, x: 0.5 };
const TRAVEL = 170;

// Units leave by fading and dropping a little, quickly and all but together:
// sliding back through the mask left half-words on screen.
const EXIT_FRAMES = 7;
const EXIT_DROP = 16;

/** A fading line: how far it rises, over how many frames, on a fast-out curve. */
const FADE = { rise: 24, frames: 10, easing: Easing.bezier(0.2, 0.8, 0.2, 1) };

/** Staggered reveal, masked or fading (see `fade`). */
export const Reveal = ({ children, split, delay = 0, stagger = 3, exitAt, fade = false, style }: RevealProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const units =
    typeof children === "string" && split
      ? children.split(split === "word" ? " " : "")
      : Children.toArray(children);

  return (
    <div style={style}>
      {units.map((unit, i) => {
        const start = frame - delay - i * stagger;
        const enter = fade
          ? interpolate(start, [0, FADE.frames], [0, 1], { easing: FADE.easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          : spring({ frame: start, fps, config: springs.smooth });
        const exit =
          exitAt === undefined
            ? 0
            : interpolate(frame - exitAt - i, [0, EXIT_FRAMES], [0, 1], {
                easing: Easing.in(Easing.cubic),
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
        if (fade) {
          return (
            <Fragment key={i}>
              {split === "word" && i > 0 && " "}
              <span
                style={{
                  display: "inline-block",
                  opacity: enter * (1 - exit),
                  transform: `translateY(${(1 - enter) * FADE.rise + exit * EXIT_DROP}px)`,
                  visibility: enter < 0.001 || exit > 0.999 ? "hidden" : undefined,
                }}
              >
                {unit}
              </span>
            </Fragment>
          );
        }
        return (
          <Fragment key={i}>
            {split === "word" && i > 0 && " "}
            <span
              style={{
                display: "inline-block",
                // Landed, the unit is no longer masked: nothing of it is ever boxed in.
                overflow: enter < 0.999 ? "hidden" : "visible",
                verticalAlign: "top",
                padding: `${OVERHANG.top}em ${OVERHANG.x}em ${OVERHANG.bottom}em`,
                margin: `-${OVERHANG.top}em -${OVERHANG.x}em -${OVERHANG.bottom}em`,
                // Faded in as it rises: no stray glyph tops at the mask's edge.
                opacity: Math.min(1, enter * 1.6) * (1 - exit),
                transform: `translateY(${exit * EXIT_DROP}px)`,
                visibility: enter < 0.001 || exit > 0.999 ? "hidden" : undefined,
              }}
            >
              <span style={{ display: "inline-block", transform: `translateY(${(1 - enter) * TRAVEL}%)` }}>
                {unit}
              </span>
            </span>
          </Fragment>
        );
      })}
    </div>
  );
};

type CounterProps = {
  from?: number;
  to: number;
  decimals?: number;
  delay?: number;
  /** Frames the roll takes. */
  duration?: number;
};

const STRIP = Array.from({ length: 30 }, (_, i) => i % 10);
const format = (value: number, decimals: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);

/**
 * Odometer: every digit rolls from its old value to its new one. Low digits
 * make at most one extra turn, so a big jump reads as motion, not a blur.
 * Leading digits that do not exist yet open and close their slot.
 */
export const Counter = ({ from = 0, to, decimals = 0, delay = 0, duration }: CounterProps) => {
  const t = useSpring(delay, springs.smooth, duration);
  const scale = 10 ** decimals;
  const a = Math.round(from * scale);
  const b = Math.round(to * scale);
  const up = b >= a;
  const text = format(Math.abs(b) >= Math.abs(a) ? to : from, decimals);
  let place = text.replace(/\D/g, "").length;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", fontVariantNumeric: "tabular-nums" }}>
      {[...text].map((char, i) => {
        if (!/\d/.test(char)) return <span key={i}>{char}</span>;
        const k = --place;
        const unit = 10 ** k;
        const digitA = Math.floor(Math.abs(a) / unit) % 10;
        const digitB = Math.floor(Math.abs(b) / unit) % 10;
        const turns = Math.min(1, Math.floor(Math.abs(b - a) / (unit * 10)));
        const steps = ((((up ? digitB - digitA : digitA - digitB) % 10) + 10) % 10) + turns * 10;
        const position = digitA + (up ? steps : -steps) * t + (up ? 0 : 20);
        const isLeading = (v: number) => k >= decimals + 1 && Math.abs(v) < unit;
        const shownA = isLeading(a) ? 0 : 1;
        const shownB = isLeading(b) ? 0 : 1;
        // A slot opens on the first step away from zero, closes on the last one back.
        const shown =
          shownA === shownB
            ? shownA
            : shownB > shownA
              ? Math.min(1, steps * t)
              : Math.min(1, steps * (1 - t));
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              height: "1.15em",
              lineHeight: "1.15em",
              overflow: "hidden",
              maxWidth: `${shown}em`,
              opacity: shown,
              maskImage: "linear-gradient(transparent, black 14%, black 86%, transparent)",
            }}
          >
            <span style={{ display: "block", transform: `translateY(${-position * 1.15}em)` }}>
              {STRIP.map((digit, j) => (
                <span key={j} style={{ display: "block", textAlign: "center" }}>
                  {digit}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
};


const PAD = "0.15em";
// About as much bar above the letters as below their baseline; the
// descenders still sit inside it.
const BAR = { top: 0.04, bottom: 0.1 };

/**
 * The brand-yellow marker: a bar sweeps under the words and inverts them as
 * it passes, with the slanted leading edge of a felt tip.
 */
export const Highlight = ({ children, delay = 0 }: { children: ReactNode; delay?: number }) => {
  const p = useSpring(delay);
  const x = interpolate(p, [0, 1], [0, 100]);
  return (
    // The bar's padding hangs over on both sides: the words keep their spacing before it is drawn.
    <span style={{ position: "relative", display: "inline-block", padding: `0 ${PAD}`, margin: `0 -${PAD}` }}>
      {children}
      <span
        aria-hidden
        style={{
          position: "absolute",
          // The bar reaches below the baseline to take the descenders in.
          inset: `-${BAR.top}em 0 -${BAR.bottom}em`,
          padding: `${BAR.top}em ${PAD} 0`,
          background: ocp.yellow,
          color: ocp.black,
          // The felt tip's slant, gone once the bar is drawn.
          clipPath: `polygon(0 0, calc(${x}% + ${Math.sin(p * Math.PI) * 0.35}em) 0, ${x}% 100%, 0 100%)`,
        }}
      >
        {children}
      </span>
    </span>
  );
};
