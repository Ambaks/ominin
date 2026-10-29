import { Easing, interpolate } from "remotion";

/* La courbe des landings (kit-rise, relais du hero). */
export const ease = Easing.bezier(0.2, 0.7, 0.2, 1);

/** Avancement de 0 à 1 entre start et start + duration, figé hors de l'intervalle. */
export function progress(frame: number, start: number, duration: number, easing = ease) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
}

/** Oscillation qui boucle exactement sur period images : la boucle reste sans couture. */
export function wave(frame: number, period: number, phase = 0) {
  return Math.sin(((frame / period) + phase) * 2 * Math.PI);
}
