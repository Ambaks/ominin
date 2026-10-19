import profile from "../../../profile.json";

// Big Smash: the measured red and black come from the client profile (the
// site's --base--rouge and the shop frontages); the others from the live
// theme (frontend/app/globals.css, .theme-big-smash) and the pitch
// (frontend/components/pitch/brands/big-smash.css).
/** Thermal paper, as the kitchen printer feeds it: cream, a touch darker at its edges. */
export const thermalPaper = "linear-gradient(90deg, #E9E5DB, #F7F4EC 12%, #FBF9F3 50%, #F4F1E8 88%, #E6E2D7)";

export const bs = {
  red: profile.design.primary_color,
  black: profile.design.secondary_color,
  deep: profile.design.accent_color,
  light: "#FF8473",
  white: "#F6F6F6",
  muted: "#B4B4B4",
  surface: "#1C1C1C",
} as const;

/** The red as r g b, for glows and translucent edges. */
export const RED_RGB = "215 34 21";

// Ominin: the ember gradient of the landing (globals.css :root) and the
// vertical ramp sampled on frontend/public/logo.png.
export const ominin = {
  /** What the window's QR code opens (siteUrl in frontend/lib/site.ts). */
  url: "https://ominin.com",
  ink: "#0C0A08",
  cream: "#F3ECE1",
  ember: ["#F0B35B", "#E2764B", "#C94F5E"],
  logo: ["#FFD65A", "#FFA662", "#FF97A8"],
} as const;
