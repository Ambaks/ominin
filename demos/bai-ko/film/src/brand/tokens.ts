import profile from "../../../profile.json";

/** Thermal paper, as the kitchen printer feeds it: cream, a touch darker at its edges. */
export const thermalPaper = "linear-gradient(90deg, #E9E5DB, #F7F4EC 12%, #FBF9F3 50%, #F4F1E8 88%, #E6E2D7)";

// Baï-Kō: the site's own tokens (bai-ko.com :root, read 2026-10-12), as the
// client profile records them and the menu's theme uses them
// (frontend/app/globals.css, .theme-bai-ko).
export const bk = {
  pink: profile.design.primary_color,
  black: profile.design.secondary_color,
  violet: profile.design.accent_color,
  cyan: "#3CE4FF",
  gold: "#F0B754",
  white: "#EEEEF5",
  muted: "#A6A6BC",
  surface: "#141419",
} as const;

/** A #RRGGBB colour as "r g b", for glows and translucent edges. */
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(" ");

export const PINK_RGB = rgb(bk.pink);
export const VIOLET_RGB = rgb(bk.violet);
export const CYAN_RGB = rgb(bk.cyan);

// Ominin: the ember gradient and the night of its screens (globals.css
// :root, --background) and the vertical ramp sampled on frontend/public/logo.png.
export const ominin = {
  url: "https://ominin.com",
  ember: ["#F0B35B", "#E2764B", "#C94F5E"],
  night: "#0C0A08",
  logo: ["#FFD65A", "#FFA662", "#FF97A8"],
} as const;
