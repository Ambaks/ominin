import type { CSSProperties, ReactNode } from "react";
import { fonts } from "../brand/fonts";
import { useLayout } from "../kit/layout";
import { Appear } from "../scenes/common";
import { SOON_TAG } from "./copy";
import { dance, Figure, type FigureProps, type Moves } from "./stage";
import { club, silverText } from "./tokens";

/** Silver type, as the club's signage. */
export const Silver = ({ children }: { children: ReactNode }) => (
  <span style={{ backgroundImage: silverText, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", paddingBottom: "0.08em" }}>{children}</span>
);

export const headline = (size: number): CSSProperties => ({
  fontFamily: fonts.display,
  fontWeight: 700,
  fontSize: size,
  lineHeight: 1.04,
  letterSpacing: "-0.035em",
  color: club.silver,
  margin: 0,
  textWrap: "balance",
});

export const kicker = (size: number, color: string = club.cyan): CSSProperties => ({
  fontFamily: fonts.sans,
  fontWeight: 600,
  fontSize: size,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color,
  margin: 0,
});

/** « Bientôt », on the step the product doesn't do yet. */
export const SoonTag = ({ size }: { size: number }) => (
  <span style={{ ...kicker(size * 0.8, club.night), display: "inline-block", padding: `${size * 0.25}px ${size * 0.6}px`, borderRadius: 999, background: club.cyan, letterSpacing: "0.14em", verticalAlign: "middle" }}>
    {SOON_TAG}
  </span>
);

/**
 * A caption block: a kicker, a statement, a line under it. Rises in at
 * `at`, leaves at `until`; its box is placed by `style`.
 */
export const Caption = ({
  at,
  until,
  kick,
  title,
  sub,
  size,
  style,
}: {
  at: number;
  until?: number;
  kick?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  size: number;
  style?: CSSProperties;
}) => (
  <div style={{ position: "absolute", ...style }}>
    {kick && (
      <Appear at={at} until={until}>
        <p style={kicker(size * 0.3)}>{kick}</p>
      </Appear>
    )}
    <Appear at={at + 3} until={until}>
      <p style={{ ...headline(size), marginTop: kick ? size * 0.28 : 0 }}>{title}</p>
    </Appear>
    {sub && (
      <Appear at={at + 7} until={until}>
        <p style={{ fontFamily: fonts.sans, fontWeight: 500, fontSize: size * 0.4, lineHeight: 1.35, color: club.muted, margin: `${size * 0.3}px 0 0`, letterSpacing: "-0.01em" }}>{sub}</p>
      </Appear>
    )}
  </div>
);

/** Her: a ponytail and a violet edge light, so she reads in any crowd. */
export const Hero = (props: Omit<FigureProps, "hair" | "rim" | "rimWidth" | "fill" | "glow">) => (
  <Figure {...props} hair="ponytail" fill="#0E0D16" rim={club.violet} rimWidth={4} glow="rgb(142 91 255 / 0.7)" />
);

/** Her two friends, dancing next to her; `frame` drives them. */
export const Friends = ({ frame, x, y, scale, gap, energy = 1, holding }: { frame: number; x: number; y: number; scale: number; gap: number; energy?: number; holding?: ReactNode }) => (
  <>
    <Figure x={x - gap} y={y + 6} scale={scale * 0.97} moves={dance(frame + 4, 0, energy)} hair="long" rim="rgb(67 217 255 / 0.55)" rimWidth={3} holding={holding} />
    <Figure x={x + gap} y={y + 4} scale={scale * 1.04} moves={dance(frame + 9, 3, energy)} hair="short" facing={-1} rim="rgb(67 217 255 / 0.55)" rimWidth={3} holding={holding} />
  </>
);

/** A full-frame svg layer for figures. */
export const People = ({ children }: { children: ReactNode }) => {
  const { width, height } = useLayout();
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {children}
    </svg>
  );
};

/** Standing in line: breathing, weight shifts, now and then a raised arm to catch a bartender. */
export const waiting = (frame: number, seed: number, wave = false): Moves => {
  const shift = Math.sin((frame + seed * 17) / 40);
  const breath = Math.sin((frame + seed * 11) / 22) * 1.5;
  const waving = wave && Math.sin((frame + seed * 31) / 30) > 0.55;
  return {
    left: 10 + shift * 4,
    right: waving ? 165 + Math.sin(frame / 2.5) * 10 : 12 - shift * 4,
    leftBend: 25,
    rightBend: waving ? 10 : 25,
    bob: breath,
    lean: shift * 2.5,
  };
};
