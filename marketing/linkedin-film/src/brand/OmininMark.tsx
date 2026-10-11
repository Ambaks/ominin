import { fonts } from "./fonts";
import { emberGradient, om } from "./tokens";

/** Ominin's chevrons (frontend/public/logo.png, redrawn) and wordmark; `size` is the wordmark's height. */
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
          <stop offset="0" stopColor={om.logo[0]} />
          <stop offset="0.48" stopColor={om.logo[1]} />
          <stop offset="1" stopColor={om.logo[2]} />
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
        fontFamily: fonts.brand,
        fontWeight: 600,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: "-0.01em",
        backgroundImage: emberGradient(),
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
