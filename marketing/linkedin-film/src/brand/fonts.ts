import { loadVariableFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadGeistMono } from "@remotion/google-fonts/GeistMono";
import { cancelRender } from "remotion";

// Each loadFont() holds a delayRender() until its file is ready: no frame is captured in a fallback face.
const latin = { subsets: ["latin" as const] };

const geist = loadGeist("normal", { ...latin, weights: ["400", "500", "600", "700"] });
const geistMono = loadGeistMono("normal", { ...latin, weights: ["500", "700"] });
// Only for the logo's wordmark, as frontend/app/layout.tsx sets it.
const fraunces = loadFraunces("normal", latin);

Promise.all([geist, geistMono, fraunces].map((font) => font.waitUntilDone())).catch(cancelRender);

/** Geist throughout (headlines, figures, text), Geist Mono for the kitchen printer, Fraunces for the wordmark alone. */
export const fonts = { display: geist.fontFamily, sans: geist.fontFamily, mono: geistMono.fontFamily, brand: fraunces.fontFamily };
