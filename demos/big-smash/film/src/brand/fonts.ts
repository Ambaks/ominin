import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadArchivoBlack } from "@remotion/google-fonts/ArchivoBlack";
import { loadFont as loadBigShoulders } from "@remotion/google-fonts/BigShoulders";
import { loadVariableFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadPlexMono } from "@remotion/google-fonts/IBMPlexMono";
import { cancelRender } from "remotion";

/*
 * Each loadFont() holds a delayRender() until its file is in document.fonts,
 * so no frame is captured in a fallback face. A font that still fails after
 * its retries cancels the render at once instead of stalling on the timeout.
 */
const latin = { subsets: ["latin" as const] };

const archivo = loadArchivo("normal", { ...latin, weights: ["500", "600", "700", "800"] });
const archivoBlack = loadArchivoBlack("normal", { ...latin, weights: ["400"] });
const bigShoulders = loadBigShoulders("normal", { ...latin, weights: ["800"] });
// Variable, like the app's next/font instance: the wordmark keeps its
// optical size axis.
const fraunces = loadFraunces("normal", latin);
const plexMono = loadPlexMono("normal", { ...latin, weights: ["500", "700"] });

Promise.all(
  [archivo, archivoBlack, bigShoulders, fraunces, plexMono].map((font) => font.waitUntilDone()),
).catch(cancelRender);

export const fonts = {
  /** Running text and statements: Archivo, the site's Obviously stand-in. */
  archivo: archivo.fontFamily,
  /** The heavy caps of the posters and the neon: Archivo Black. */
  black: archivoBlack.fontFamily,
  /** Big numbers: Big Shoulders, tall and rounded like the wordmark. */
  numeral: bigShoulders.fontFamily,
  /** Ominin wordmark. */
  fraunces: fraunces.fontFamily,
  /** The kitchen printer's fixed-pitch characters. */
  mono: plexMono.fontFamily,
};
