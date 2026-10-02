import { staticFile } from "remotion";
import manifest from "../public/captures/manifest.json";

/*
 * The demo, as scripts/capture.mjs photographed it: files, and the
 * geometry the scenes animate on (tap targets, scroll offsets, sheet
 * edges), all in the device's CSS px.
 */
export const { phone, counter, network } = manifest;

export const capture = (src: string) => staticFile(src);
