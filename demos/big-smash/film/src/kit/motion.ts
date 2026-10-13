import { interpolate, spring, useCurrentFrame, useVideoConfig, type SpringConfig } from "remotion";

export const springs = {
  /** Critically damped: type, UI, anything that must land without a wobble. */
  smooth: { damping: 200 },
  /** Quick, ~3 % overshoot (damping ratio 0.73): presses, pops. */
  snappy: { mass: 0.8, damping: 18, stiffness: 190 },
  /** A held object with weight, ~1 s to settle, no bounce (ratio 0.94): the phone. */
  heavy: { mass: 1.5, damping: 17, stiffness: 55 },
  /** A camera push onto a detail: settled in about a third of a second (ratio 0.87). */
  push: { damping: 30, stiffness: 300 },
} satisfies Record<string, Partial<SpringConfig>>;

/** 0 → 1 spring that starts `delay` frames into the current sequence. */
export const useSpring = (
  delay = 0,
  config: Partial<SpringConfig> = springs.smooth,
  durationInFrames?: number,
) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config, durationInFrames });
};

export const mix = (from: number, to: number, t: number) => from + (to - from) * t;

/** How much closer the camera drifts over a held shot: no hold stands still. */
export const HOLD_DRIFT = 1.08;

export type Key<T extends Record<string, number>> = {
  /** Frame (of the current sequence) the move to `value` starts on. */
  at: number;
  value: T;
  config?: Partial<SpringConfig>;
  duration?: number;
  /** An eased move over `duration` frames instead of a spring: for a move that must accelerate. */
  easing?: (t: number) => number;
};

/**
 * Chained spring moves: each key eases from the previous key's value to its
 * own, and moves that overlap add up, like hands on a camera. The first key
 * is the starting value (its `at` is ignored).
 */
export const track = <T extends Record<string, number>>(frame: number, fps: number, keys: Key<T>[]): T => {
  const out: Record<string, number> = { ...keys[0].value };
  for (let i = 1; i < keys.length; i++) {
    const { at, value, config = springs.smooth, duration, easing } = keys[i];
    const t = easing
      ? interpolate(frame - at, [0, duration ?? 1], [0, 1], { easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      : spring({ frame: frame - at, fps, config, durationInFrames: duration });
    for (const name of Object.keys(out)) out[name] += (value[name] - keys[i - 1].value[name]) * t;
  }
  return out as T;
};

export const useTrack = <T extends Record<string, number>>(keys: Key<T>[]): T => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return track(frame, fps, keys);
};
