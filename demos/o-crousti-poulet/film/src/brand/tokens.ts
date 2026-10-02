import profile from "../../../profile.json";

// O'Crousti: the three measured colors come from the client profile; the
// others from the live theme (frontend/app/globals.css, .theme-o-crousti-poulet).
/** Thermal paper, as the kitchen printer feeds it: cream, a touch darker at its edges. */
export const thermalPaper = "linear-gradient(90deg, #E9E5DB, #F7F4EC 12%, #FBF9F3 50%, #F4F1E8 88%, #E6E2D7)";

export const ocp = {
  yellow: profile.design.primary_color,
  black: profile.design.secondary_color,
  gold: profile.design.accent_color,
  lemon: "#FFF35C",
  white: "#F7F7F2",
  muted: "#B0B2B6",
  surface: "#1C1D20",
  // The gold of the shop-window swirls (theme footer).
  swirl: "#FFD109",
} as const;

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
