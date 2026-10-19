import type { RenderScene } from "./types.ts";

/* Format d'un Reel : vertical 9:16, 30 images par seconde, écran final de
 * 2,5 s. Séparé de Reel.tsx, qui ne se charge que dans le navigateur du
 * rendu : scripts/render.ts en a besoin pour caler les scènes. */
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const OUTRO_FRAMES = 2.5 * FPS;

export function reelDuration(scenes: RenderScene[]): number {
  return scenes.reduce((total, scene) => total + scene.frames, 0) + OUTRO_FRAMES;
}
