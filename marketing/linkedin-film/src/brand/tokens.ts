// Ominin: the landing's ember gradient (frontend/app/globals.css :root) and
// the ramp sampled on frontend/public/logo.png.
export const om = {
  ink: "#0C0A08",
  deep: "#050403",
  surface: "#17130F",
  raised: "#221C17",
  line: "rgb(243 236 225 / 0.12)",
  cream: "#F3ECE1",
  muted: "rgb(243 236 225 / 0.66)",
  faint: "rgb(243 236 225 / 0.42)",
  ember: ["#F0B35B", "#E2764B", "#C94F5E"],
  logo: ["#FFD65A", "#FFA662", "#FF97A8"],
  ready: "#7FD1A0",
  url: "ominin.com",
} as const;

export const emberGradient = (angle = 100) => `linear-gradient(${angle}deg, ${om.ember[0]}, ${om.ember[1]} 55%, ${om.ember[2]})`;

/** The customer's phone: the QR menu's light theme. */
export const app = {
  paper: "#FBF7F1",
  card: "#FFFFFF",
  ink: "#1A1512",
  muted: "#7A6E64",
  line: "#ECE3D7",
  soft: "#F4ECE1",
  ok: "#2E9D62",
} as const;
