import type { CSSProperties } from "react";
import { MONOGRAM, WORDMARK } from "./big-smash-marks";
import { fonts } from "./fonts";
import { bs, ominin } from "./tokens";

/** The « BIG » monogram of the packaging, vector, at any height and colour. */
export const Monogram = ({ height, color = bs.white, style }: { height: number; color?: string; style?: CSSProperties }) => {
  const [, , w, h] = MONOGRAM.viewBox.split(" ").map(Number);
  return (
    <svg viewBox={MONOGRAM.viewBox} width={(height * w) / h} height={height} style={{ display: "block", ...style }}>
      <path d={MONOGRAM.path} fill={color} />
    </svg>
  );
};

/** The wordmark, as the shop fascias and the site's header carry it: `size` is its height. */
export const Lockup = ({ size, color = bs.white }: { size: number; color?: string }) => {
  const { width, height } = WORDMARK.viewBox;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={(size * width) / height} height={size} style={{ display: "block" }}>
      <path d={WORDMARK.path} fill={color} />
    </svg>
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
