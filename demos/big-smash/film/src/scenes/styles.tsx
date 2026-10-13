import type { CSSProperties, ReactNode } from "react";
import { fonts } from "../brand/fonts";
import { bs, RED_RGB } from "../brand/tokens";
import { useLayout } from "../kit/layout";
import { springs, useSpring } from "../kit/motion";
import { Reveal } from "../kit/type";

/** Size of the film's statements, from the order to the counter: one size throughout. */
export const STATEMENT = { landscape: 92, portrait: 84 };
/** Size of the film's claims, alone on their own background: the payment and the three promises. */
export const CLAIM = { landscape: 140, portrait: 112 };

/** Big Smash's neon (their « BIG SPICY ÉDITION » campaign): heavy capitals, white core, red tube, red halo. */
export const neon: CSSProperties = {
  fontFamily: fonts.black,
  textTransform: "uppercase",
  letterSpacing: "0.01em",
  lineHeight: 1.15,
  color: "#FFF6F4",
  WebkitTextStroke: `0.04em ${bs.red}`,
  paintOrder: "stroke fill",
  textShadow: `0 0 0.45em rgb(${RED_RGB} / 0.55)`,
};

/**
 * The film's clock: red ▸▸ (◂◂ rewound), then the time in Big Shoulders, on a
 * pill once it has shrunk to a chip (`pill`, 0 → 1), its edge lit by `glow`.
 */
export const ClockChip = ({ size, pill = 1, glow = 0, rewind = false, children }: { size: number; pill?: number; glow?: number; rewind?: boolean; children: ReactNode }) => (
  <div
    style={{
      position: "relative",
      display: "flex",
      alignItems: "center",
      gap: size * 0.35,
      padding: `${size * 0.3}px ${size * 0.55}px`,
      marginLeft: -size * 0.55 * (1 - pill),
      fontFamily: fonts.numeral,
      fontSize: size,
      lineHeight: 1,
      color: bs.white,
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 999,
        background: bs.surface,
        boxShadow: `inset 0 0 0 1.5px rgb(215 34 21 / ${0.25 + glow * 0.6})`,
        opacity: pill,
      }}
    />
    <svg width={size * 0.75} height={size * 0.5} viewBox="0 0 30 20" fill={bs.red} style={{ position: "relative", scale: rewind ? "-1 1" : undefined }}>
      <path d="M0 0 L14 10 L0 20 Z M15 0 L29 10 L15 20 Z" />
    </svg>
    <span style={{ position: "relative", color: glow > 0.5 ? bs.red : bs.white }}>{children}</span>
  </div>
);

/** The brand's red bullet, then a line of tracked capitals. */
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
          background: bs.red,
          boxShadow: "0 0 18px rgb(215 34 21 / 0.45)",
          scale: String(dot),
        }}
      />
      <Reveal
        split="word"
        delay={delay + 2}
        stagger={2}
        style={{
          fontFamily: fonts.archivo,
          fontWeight: 800,
          fontSize: size,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: bs.white,
          lineHeight: 1,
          marginRight: "-0.24em",
        }}
      >
        {children}
      </Reveal>
    </div>
  );
};
