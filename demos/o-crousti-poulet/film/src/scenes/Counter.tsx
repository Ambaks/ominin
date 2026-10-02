import { AbsoluteFill, Img, useCurrentFrame } from "remotion";
import { capture, counter } from "../captures";
import { fonts } from "../brand/fonts";
import { ocp } from "../brand/tokens";
import { Stage } from "../kit/atmosphere";
import { aim, Device, DEVICES, pose, type Pose } from "../kit/Device";
import { useLayout } from "../kit/layout";
import { HOLD_DRIFT, springs, useTrack } from "../kit/motion";
import { Tap } from "../kit/Tap";
import { Reveal } from "../kit/type";
import { beat } from "../timeline";
import { STATEMENT } from "./styles";

/**
 * Scene 10: the counter tablet — the camera pushes in on the same order,
 * N° 39, one tap marks it ready, and the shot ends on its header turned
 * « Prête », low enough that the card's next button stays out of frame.
 */
export const COUNTER = beat(44);
export const READY_TAP = beat(46);
/** How close the camera comes on the whole tablet, the card's button, then its header. */
const PUSH = { whole: 0.92, button: 1.6, header: 2.2 };
/** The touch ring, larger than the phone's: the tablet's screen is drawn smaller. */
const TAP_SCALE = 1.6;
/** Frames after the tap the card shows its new state, at once: no two labels on screen together. */
const SWAP = 3;

export const Counter = ({ from }: { from: number }) => {
  const frame = useCurrentFrame();
  const { pick } = useLayout();
  const at = (abs: number) => abs - from;
  const size = pick(1400, 1000);
  const middle = (box: { x: number; y: number; width: number; height: number }) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  const tap = middle(counter.tap);
  const done = frame >= at(READY_TAP) + SWAP;

  // The tablet whole and centered, easing closer; then, still centered,
  // on the card's button, low enough for the line above it.
  const whole = (push: number) => pose({ y: pick(0, 240), scale: push, rotateX: 6, rotateY: pick(14, 5), rotateZ: -1.5 });
  const tabletPose = useTrack<Pose>([
    { at: 0, value: { ...whole(PUSH.whole), y: whole(PUSH.whole).y + 90, rotateX: 12, rotateY: pick(20, 8), rotateZ: -2 } },
    { at: 0, value: whole(PUSH.whole), config: springs.heavy },
    { at: 4, value: whole(PUSH.whole * HOLD_DRIFT), duration: at(READY_TAP) - 20 },
    {
      // Settled on the button before it is tapped.
      at: at(READY_TAP) - 26,
      value: pose({ ...aim(DEVICES.tablet, size, tap, pick({ x: 0, y: 400 }, { x: 0, y: 360 }), PUSH.button), rotateX: 4, rotateY: pick(6, 4), rotateZ: -1 }),
      config: springs.push,
    },
    {
      at: at(READY_TAP) + 8,
      value: pose({ ...aim(DEVICES.tablet, size, middle(counter.header), pick({ x: 0, y: 70 }, { x: 0, y: 260 }), PUSH.header), rotateX: 3, rotateY: 3 }),
      config: springs.heavy,
    },
  ]);

  return (
    <Stage>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Device model={DEVICES.tablet} size={size} pose={tabletPose}>
          <Img src={capture(done ? counter.after : counter.before)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
          <Tap {...tap} at={at(READY_TAP)} scale={TAP_SCALE} />
        </Device>
      </AbsoluteFill>
      {/* Centered above the card, for once: the line over the gesture. */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: pick(44, 200) }}>
        <Reveal
          fade
          delay={at(READY_TAP) - 2}
          style={{ fontFamily: fonts.poppins, fontWeight: 800, fontSize: pick(STATEMENT.landscape, STATEMENT.portrait), letterSpacing: "-0.03em", color: ocp.white }}
        >
          Un geste.
        </Reveal>
      </AbsoluteFill>
    </Stage>
  );
};
