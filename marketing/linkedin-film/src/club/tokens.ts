/*
 * The club film's look: near-black, polished silver for type and the star,
 * two neon gels for the lights (violet and cyan) and the warm amber of a
 * backlit bar. The phone shows L'Étoile's menu, our fictional club: black and
 * silver, as on menu.ominin.com/demo/club.
 */
export const club = {
  night: "#040408",
  deep: "#000000",
  surface: "#101016",
  raised: "#1A1A22",
  line: "rgb(255 255 255 / 0.12)",
  silver: "#E6E9EE",
  muted: "rgb(230 233 238 / 0.8)",
  faint: "rgb(230 233 238 / 0.4)",
  violet: "#8E5BFF",
  cyan: "#43D9FF",
  amber: "#FFB45E",
  ready: "#7FE0A8",
  /** The wait gone wrong: the clock past a quarter of an hour, the lost drink. */
  alert: "#FF7A8A",
  /** Silhouettes: a touch lifted from the night, so they read against it. */
  body: "#0B0B12",
} as const;

/** Silver type: bright at the top, a cooler grey at the foot, never dull. */
export const silverText = "linear-gradient(180deg, #FFFFFF 20%, #C9CDD4 95%)";

export const silverGradient = (angle = 100) => `linear-gradient(${angle}deg, #FFFFFF, #C9CDD4 45%, #8A8F98 75%, #E6E9EE)`;

/** The menu on the phone: L'Étoile's dark theme. */
export const etoile = {
  paper: "#07070A",
  card: "#121217",
  line: "rgb(255 255 255 / 0.09)",
  ink: "#F2F3F5",
  muted: "rgb(242 243 245 / 0.6)",
  silver: "#C9CDD4",
  gold: "#D9B46A",
} as const;
