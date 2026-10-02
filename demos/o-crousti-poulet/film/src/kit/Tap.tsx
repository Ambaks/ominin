import { interpolate, useCurrentFrame } from "remotion";
import { ocp } from "../brand/tokens";
import { springs, useSpring } from "./motion";

type TapProps = {
  /** Contact point, in the coordinates of the parent (screen px inside a Phone). */
  x: number;
  y: number;
  /** Frame of the press; cue its sound on the same frame. */
  at: number;
  /** Times the phone's touch ring: a larger screen, drawn smaller, takes a larger one. */
  scale?: number;
};

const APPROACH = 6;
/** About 80 ms held down, then a ripple of about 250 ms. */
const HOLD = 3;
const RIPPLE = 8;
/** The touch ring's diameter, in screen px: it leaves the label it taps readable. */
const RING = 30;

/** A touch: a thin ring lands on the control, presses, lifts and ripples out. */
export const Tap = ({ x, y, at, scale = 1 }: TapProps) => {
  const frame = useCurrentFrame();
  const land = useSpring(at - APPROACH, springs.smooth, APPROACH);
  const press = useSpring(at, springs.snappy, HOLD);
  const lift = useSpring(at + HOLD, springs.smooth, RIPPLE);
  const ripple = interpolate(frame - at - HOLD, [0, RIPPLE], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  if (frame < at - APPROACH || frame > at + HOLD + RIPPLE) return null;

  const size = RING * scale;
  const ring = (style: object) => (
    <div style={{ position: "absolute", left: -size / 2, top: -size / 2, width: size, height: size, borderRadius: "50%", ...style }} />
  );

  return (
    <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0, pointerEvents: "none" }}>
      {ring({
        border: `1.5px solid ${ocp.yellow}`,
        opacity: (1 - ripple) * Math.min(1, lift * 2),
        scale: String(1 + ripple * 1.4),
      })}
      {ring({
        border: "2px solid rgb(255 255 255 / 0.95)",
        background: `rgb(255 255 255 / ${0.12 + press * 0.2})`,
        boxShadow: "0 2px 10px rgb(0 0 0 / 0.35)",
        opacity: land * (1 - lift),
        scale: String(interpolate(land, [0, 1], [1.3, 1]) - press * 0.15),
      })}
    </div>
  );
};
