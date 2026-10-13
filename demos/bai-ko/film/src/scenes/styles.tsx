import type { CSSProperties } from "react";
import { AbsoluteFill } from "remotion";
import { fonts } from "../brand/fonts";
import { bk, PINK_RGB } from "../brand/tokens";
import { useLayout } from "../kit/layout";
import { springs, useSpring } from "../kit/motion";
import { Reveal } from "../kit/type";

/** Size of the film's statements, in Bebas Neue: one size throughout. */
export const STATEMENT = { landscape: 128, portrait: 112 };
/** Size of the film's claims, alone on their own background: the payment and the offer's three claims. */
export const CLAIM = { landscape: 210, portrait: 160 };

/** A statement's type: Bebas Neue, the site's section titles, on one tight leading. */
export const statement: CSSProperties = {
  fontFamily: fonts.display,
  fontWeight: 400,
  lineHeight: 0.98,
  letterSpacing: "0.01em",
  color: bk.white,
};

/** The pink neon of the site's Korean section names: a pale core, a pink tube, a pink halo. */
export const neon: CSSProperties = {
  fontFamily: fonts.display,
  fontWeight: 400,
  letterSpacing: "0.02em",
  lineHeight: 1.05,
  color: "#FFE6EF",
  WebkitTextStroke: `0.025em ${bk.pink}`,
  paintOrder: "stroke fill",
  textShadow: `0 0 0.08em rgb(${PINK_RGB} / 0.9), 0 0 0.4em rgb(${PINK_RGB} / 0.55)`,
};

/** The brand's pink bullet, then a line of tracked capitals. */
export const Kicker = ({ children, delay = 0, size: given }: { children: string; delay?: number; size?: number }) => {
  const { pick } = useLayout();
  const size = given ?? pick(26, 28);
  const dot = useSpring(delay, springs.snappy);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.7 }}>
      <div
        style={{
          width: size * 0.62,
          height: size * 0.62,
          borderRadius: "50%",
          background: bk.pink,
          boxShadow: `0 0 18px rgb(${PINK_RGB} / 0.6)`,
          scale: String(dot),
        }}
      />
      <Reveal
        split="word"
        delay={delay + 2}
        stagger={2}
        style={{
          fontFamily: fonts.sans,
          fontWeight: 700,
          fontSize: size,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: bk.white,
          lineHeight: 1,
          marginRight: "-0.24em",
        }}
      >
        {children}
      </Reveal>
    </div>
  );
};

/**
 * The night behind the words at the top of the tall frame: solid down to
 * `solid`, gone by `clear` (fractions of the height). A shot that comes in
 * close runs up under it, never through the words.
 */
export const TextBand = ({ solid, clear }: { solid: number; clear: number }) => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, ${bk.black} ${solid * 100}%, transparent ${clear * 100}%)` }} />
);

/** A small pill of tracked capitals: a table's state, a figure's source. */
export const Chip = ({ children, tone = bk.pink, size = 24, style }: { children: string; tone?: string; size?: number; style?: CSSProperties }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: size * 0.5,
      padding: `${size * 0.45}px ${size * 0.8}px`,
      borderRadius: 999,
      border: `1.5px solid ${tone}`,
      background: "rgb(10 10 12 / 0.72)",
      boxShadow: `0 0 ${size * 0.6}px ${tone}55`,
      fontFamily: fonts.sans,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: tone,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);
