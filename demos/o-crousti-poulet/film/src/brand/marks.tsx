import type { CSSProperties } from "react";
import { COQ_PATH, COQ_VIEWBOX } from "./coq-path";
import { fonts } from "./fonts";
import { ocp, ominin } from "./tokens";

/** The rooster of the O'Crousti logo, vector, at any size and color. */
const Coq = ({ height, color = ocp.white, style }: { height: number; color?: string; style?: CSSProperties }) => (
  <svg
    viewBox={`0 0 ${COQ_VIEWBOX.width} ${COQ_VIEWBOX.height}`}
    width={(height * COQ_VIEWBOX.width) / COQ_VIEWBOX.height}
    height={height}
    style={{ display: "block", overflow: "visible", ...style }}
  >
    <path d={COQ_PATH} fill={color} />
  </svg>
);

/*
 * The lit shop sign, in the proportions the menu theme measured on it
 * (globals.css .theme-o-crousti-poulet .hero-*): the rooster perched on
 * "Crousti", the two-tone name on one line, then the long yellow rule that
 * ends on ORIGINAL. Every length follows the name's size.
 */
const COQ_HEIGHT = 1.3125;
const COQ_OFFSET = -0.935;

export const Lockup = ({ size, coq = true }: { size: number; coq?: boolean }) => {
  const glow = (rgb: string, alpha: number) => `0 0 0.45em rgb(${rgb} / ${alpha})`;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {coq && (
        <Coq
          height={size * COQ_HEIGHT}
          style={{ translate: `${size * COQ_OFFSET}px 0`, marginBottom: -size * 0.1 }}
        />
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gridTemplateAreas: '"name name" "rule tag"',
          alignItems: "center",
          gap: `${size * 0.075}px ${size * 0.094}px`,
        }}
      >
        <div
          style={{
            gridArea: "name",
            display: "flex",
            columnGap: "0.21em",
            fontFamily: fonts.didact,
            fontSize: size,
            lineHeight: 0.98,
            letterSpacing: "-0.015em",
            color: "#fff",
            WebkitTextStroke: "0.03em currentColor",
            paintOrder: "stroke fill",
            textShadow: glow("255 255 255", 0.16),
            whiteSpace: "nowrap",
          }}
        >
          <span>
            <span style={{ color: ocp.yellow, textShadow: glow("247 238 33", 0.3) }}>O’</span>Crousti
          </span>
          <span style={{ color: ocp.yellow, textShadow: glow("247 238 33", 0.3) }}>Poulet</span>
        </div>
        <div
          style={{
            gridArea: "rule",
            alignSelf: "end",
            marginBottom: size * 0.054,
            height: Math.max(5, size * 0.12),
            borderRadius: 2,
            background: ocp.yellow,
            boxShadow: `0 0 ${size * 0.11}px rgb(247 238 33 / 0.4)`,
          }}
        />
        <div
          style={{
            gridArea: "tag",
            fontFamily: fonts.poppins,
            fontWeight: 800,
            fontSize: size * 0.3,
            letterSpacing: "0.03em",
            lineHeight: 1,
            color: "#fff",
          }}
        >
          ORIGINAL
        </div>
      </div>
    </div>
  );
};

/** Ominin's chevrons (frontend/public/logo.png, redrawn) and wordmark. */
export const OmininMark = ({ size }: { size: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.42 }}>
    <svg
      viewBox="116 107 280 300"
      height={size * 0.98}
      width={(size * 0.98 * 280) / 300}
      style={{ overflow: "visible", filter: `drop-shadow(0 0 ${size * 0.12}px rgb(255 166 98 / 0.45))` }}
    >
      <defs>
        <linearGradient id="ominin-chevrons" x1="0" y1="107" x2="0" y2="407" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={ominin.logo[0]} />
          <stop offset="0.48" stopColor={ominin.logo[1]} />
          <stop offset="1" stopColor={ominin.logo[2]} />
        </linearGradient>
      </defs>
      {[0, 63, 126].map((dy) => (
        <path
          key={dy}
          d={`M256 ${107 + dy} L396 ${247 + dy} V${281 + dy} L256 ${141 + dy} L116 ${281 + dy} V${247 + dy} Z`}
          fill="url(#ominin-chevrons)"
        />
      ))}
    </svg>
    <span
      style={{
        fontFamily: fonts.fraunces,
        fontWeight: 600,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: "-0.01em",
        backgroundImage: `linear-gradient(100deg, ${ominin.ember[0]}, ${ominin.ember[1]} 55%, ${ominin.ember[2]})`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        paddingBottom: "0.08em",
      }}
    >
      Ominin
    </span>
  </div>
);
