import { loadFont as loadBebasNeue } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadDmSans } from "@remotion/google-fonts/DMSans";
import { loadVariableFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadPlexMono } from "@remotion/google-fonts/IBMPlexMono";
import { cancelRender } from "remotion";

/*
 * Each loadFont() holds a delayRender() until its file is in document.fonts,
 * so no frame is captured in a fallback face. A font that still fails after
 * its retries cancels the render at once instead of stalling on the timeout.
 * latin-ext: the « ō » of Baï-Kō.
 */
const latin = { subsets: ["latin" as const, "latin-ext" as const] };

const bebas = loadBebasNeue("normal", { ...latin, weights: ["400"] });
const dmSans = loadDmSans("normal", { ...latin, weights: ["500", "600", "700", "800"] });
// Variable, like the app's next/font instance: the wordmark keeps its optical size axis.
const fraunces = loadFraunces("normal", { subsets: ["latin"] });
const plexMono = loadPlexMono("normal", { subsets: ["latin"], weights: ["500", "700"] });

Promise.all([bebas, dmSans, fraunces, plexMono].map((font) => font.waitUntilDone())).catch(cancelRender);

export const fonts = {
  /** Titles, claims and big numbers: Bebas Neue, the site's section titles and prices. */
  display: bebas.fontFamily,
  /** Running text: DM Sans, the site's text face. */
  sans: dmSans.fontFamily,
  /** Ominin wordmark. */
  fraunces: fraunces.fontFamily,
  /** The kitchen printer's fixed-pitch characters. */
  mono: plexMono.fontFamily,
};
