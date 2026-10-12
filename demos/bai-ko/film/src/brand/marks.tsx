import { Img, staticFile } from "remotion";
import { fonts } from "./fonts";
import { ominin, VIOLET_RGB } from "./tokens";

/** The logo of bai-ko.com (bowl, 바이코, « BAÏ-KŌ » in brush capitals), as published: a PNG, never retyped. `size` is its height. */
export const Logo = ({ size, glow = 0 }: { size: number; glow?: number }) => (
  <Img
    src={staticFile("brand/logo.png")}
    style={{ display: "block", height: size, width: "auto", filter: glow > 0 ? `drop-shadow(0 0 ${size * 0.12}px rgb(${VIOLET_RGB} / ${0.45 * glow}))` : undefined }}
  />
);

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
