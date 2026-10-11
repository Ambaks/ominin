import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig, type SpringConfig } from "remotion";
import { fonts } from "../brand/fonts";
import { emberGradient, om } from "../brand/tokens";
import { springs } from "../kit/motion";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const OUT = Easing.bezier(0.2, 0.8, 0.2, 1);

/** 0 → 1 from frame a to frame b, fast-out. */
export const ramp = (frame: number, a: number, b: number, easing = OUT) => interpolate(frame, [a, b], [0, 1], { ...clamp, easing });

/** 0 → 1 spring from film frame `at`. */
export const useIn = (at: number, config: Partial<SpringConfig> = springs.smooth) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config });
};

const EXIT = 8;

/** Rises in at `at`, leaves at `until` with a short drop; keeps its place in the layout while hidden. */
export const Appear = ({
  at,
  until,
  rise = 26,
  pop = false,
  style,
  children,
}: {
  at: number;
  until?: number;
  rise?: number;
  /** Scales up as it lands, for chips and cards. */
  pop?: boolean;
  style?: CSSProperties;
  children: ReactNode;
}) => {
  const frame = useCurrentFrame();
  const t = useIn(at, pop ? springs.snappy : springs.smooth);
  const out = until === undefined ? 0 : ramp(frame, until, until + EXIT, Easing.in(Easing.cubic));
  const shown = frame >= at && out < 1;
  return (
    <div
      style={{
        ...style,
        visibility: shown ? undefined : "hidden",
        opacity: Math.min(1, t * 1.4) * (1 - out),
        transform: `translateY(${(1 - t) * rise + out * 14}px)${pop ? ` scale(${0.86 + 0.14 * t})` : ""}`,
      }}
    >
      {children}
    </div>
  );
};

/** The dark stage with an ember glow behind the subject, at (x %, y %). */
export const Backdrop = ({ x = 50, y = 50, glow = 1 }: { x?: number; y?: number; glow?: number }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 50% 60% at ${x}% ${y}%, rgb(226 118 75 / ${0.15 * glow}), transparent 72%), radial-gradient(ellipse 85% 85% at 50% 50%, ${om.ink} 45%, ${om.deep})`,
    }}
  />
);

export const Accent = ({ children }: { children: ReactNode }) => (
  <span
    style={{
      backgroundImage: emberGradient(),
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      paddingBottom: "0.1em",
    }}
  >
    {children}
  </span>
);

/** A chapter's label: number, name and an optional status tag. */
export const Kicker = ({ n, label, tag, size = 26 }: { n?: string; label: string; tag?: string; size?: number }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 16,
      fontFamily: fonts.sans,
      fontWeight: 600,
      fontSize: size,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: om.ember[0],
    }}
  >
    {n && <span style={{ border: `2px solid ${om.ember[1]}`, borderRadius: 999, padding: "3px 14px", letterSpacing: "0.04em" }}>{n}</span>}
    {label}
    {tag && (
      <span style={{ background: emberGradient(), color: om.ink, borderRadius: 999, padding: "6px 18px", fontSize: 28, letterSpacing: "0.08em" }}>
        {tag}
      </span>
    )}
  </div>
);

export const Pill = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 24px",
      borderRadius: 999,
      background: om.raised,
      border: `1.5px solid ${om.line}`,
      fontFamily: fonts.sans,
      fontWeight: 500,
      fontSize: 28,
      color: om.cream,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

export const Check = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** A loyalty card filling up: one stamp per visit, the last one landing with a glow. */
export const Stamps = ({ from, count, size, gap }: { from: number; count: number; size: number; gap: number }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", gap }}>
      {Array.from({ length: count }, (_, i) => {
        const t = ramp(frame, from + i * 3, from + 6 + i * 3);
        const last = i === count - 1;
        return (
          <div
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              border: `3px solid ${t > 0.5 ? "transparent" : om.line}`,
              background: t > 0 ? emberGradient(135) : "transparent",
              opacity: 0.35 + 0.65 * t,
              transform: `scale(${0.8 + 0.2 * t + (last ? 0.12 * Math.sin(Math.PI * t) : 0)})`,
              boxShadow: last && t > 0.5 ? "0 0 40px rgb(226 118 75 / 0.6)" : undefined,
            }}
          >
            {t > 0.5 && <Check size={size * 0.5} color={om.ink} />}
          </div>
        );
      })}
    </div>
  );
};

/** French money: 15,40 € with a narrow no-break space. */
export const euros = (value: number) => `${value.toFixed(2).replace(".", ",")} €`;
