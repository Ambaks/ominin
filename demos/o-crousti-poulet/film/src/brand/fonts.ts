import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadDidactGothic } from "@remotion/google-fonts/DidactGothic";
import { loadVariableFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadPlexMono } from "@remotion/google-fonts/IBMPlexMono";
import { loadFont as loadPlayball } from "@remotion/google-fonts/Playball";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { cancelRender } from "remotion";

/*
 * Each loadFont() holds a delayRender() until its file is in document.fonts,
 * so no frame is captured in a fallback face. A font that still fails after
 * its retries cancels the render at once instead of stalling on the timeout.
 */
const latin = { subsets: ["latin" as const] };

const poppins = loadPoppins("normal", { ...latin, weights: ["500", "600", "800"] });
const anton = loadAnton("normal", { ...latin, weights: ["400"] });
const playball = loadPlayball("normal", { ...latin, weights: ["400"] });
const didact = loadDidactGothic("normal", { ...latin, weights: ["400"] });
// Variable, like the app's next/font instance: the wordmark keeps its
// optical size axis.
const fraunces = loadFraunces("normal", latin);
const plexMono = loadPlexMono("normal", { ...latin, weights: ["500", "700"] });

Promise.all(
  [poppins, anton, playball, didact, fraunces, plexMono].map((font) => font.waitUntilDone()),
).catch(cancelRender);

export const fonts = {
  /** O'Crousti menu board: items (800), running text (500/600). */
  poppins: poppins.fontFamily,
  /** O'Crousti prices and big numbers. */
  anton: anton.fontFamily,
  /** O'Crousti handwritten board titles. */
  playball: playball.fontFamily,
  /** O'Crousti wordmark (thickened with a stroke, see Lockup). */
  didact: didact.fontFamily,
  /** Ominin wordmark. */
  fraunces: fraunces.fontFamily,
  /** The kitchen printer's fixed-pitch characters. */
  mono: plexMono.fontFamily,
};
