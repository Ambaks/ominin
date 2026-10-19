import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { capture, salle } from "../captures";
import { fonts } from "../brand/fonts";
import { bk, ominin } from "../brand/tokens";
import { Stage } from "../kit/atmosphere";
import { aim, Device, DEVICES, pose, type Pose } from "../kit/Device";
import { useLayout } from "../kit/layout";
import { CLAMP, HOLD_DRIFT, springs, useTrack } from "../kit/motion";
import { Tap } from "../kit/Tap";
import { Reveal } from "../kit/type";
import { beat, FPS } from "../timeline";
import { Kicker, statement, STATEMENT } from "./styles";

/**
 * Scene 10: the room's tablet, nine minutes after table 7 ordered — its
 * kimchi already under « Déjà servi » (the side went out first); one tap
 * serves the Dak Bap Spicy, the table leaves the queue, the cards after it
 * slide up, and the camera rises to the header's « Table 7 servie. », the
 * screen around it going dark: no other table's line is read for table 7's.
 */
export const SALLE = beat(31);
export const SERVE_TAP = beat(34);
/** How close the camera comes on the whole tablet, the line's button, then the header's message. */
const PUSH = { whole: 0.92, button: 1.6, served: 3.2 };
/** In the tall frame the camera opens on table 7's card, its middle this far below the frame's center, in px; then on the header's message. */
const TALL = { card: 2.6, cardY: 200, served: 4 };
/** Where the header's message comes to rest, in px from the frame's center: under the words. */
const SERVED_AT = { landscape: { x: 0, y: -40 }, portrait: { x: 0, y: -260 } };
/** The kicker's top, title-safe, in px; the night behind the words: solid, then most of the way, then gone (fractions of the height). */
const TITLE_TOP = { landscape: 70, portrait: 200 };
const BAND = { landscape: [0.26, 0.31, 0.39], portrait: [0.2, 0.24, 0.28] };
/** Frames before the tap the camera starts in on the line's button. */
const TO_BUTTON = 26;
/**
 * In the tall frame, the screen around table 7's card sits in the screen's
 * night, the card shown down to its last line; it comes back over this many
 * frames as the card leaves. The card's corners (rounded-2xl).
 */
const ALONE_OUT = 8;
const CARD_RADIUS = 16;
/** Once the cards have slid up (the app's 600 ms), the screen goes dark around the header's message over this many frames, but this far around it, in screen px. */
const MESSAGE_ALONE = { after: 18, frames: 8, margin: 10 };
/** The touch ring, larger than the phone's: the tablet's screen is drawn smaller. */
const TAP_SCALE = 1.6;
/** Frames after the tap the table leaves the queue, as the touch lifts (Tap: hold 3). */
const SWAP = 4;

export const Salle = ({ from }: { from: number }) => {
  const frame = useCurrentFrame();
  const { portrait, pick } = useLayout();
  const at = (abs: number) => abs - from;
  const size = pick(1400, 1000);
  const middle = (box: { x: number; y: number; width: number; height: number }) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  const tap = middle(salle.tap);
  const card = { x: salle.card.x + salle.card.width / 2, y: salle.card.y + salle.card.content / 2 };
  const served = middle(salle.served);
  const left = at(SERVE_TAP) + SWAP;
  // The capture held at each step of the app's own animation, from the tap's lift.
  const elapsed = ((frame - left) * 1000) / FPS;
  const screen = frame < left ? salle.before : [...salle.leave].reverse().find((step) => step.at <= elapsed)!.src;
  const band = pick(BAND.landscape, BAND.portrait);
  const alone = portrait ? interpolate(frame - left, [0, ALONE_OUT], [1, 0], CLAMP) : 0;
  const message = interpolate(frame - left - MESSAGE_ALONE.after, [0, MESSAGE_ALONE.frames], [0, 1], CLAMP);
  const { margin } = MESSAGE_ALONE;

  // In the wide frame, the tablet whole, easing closer, then on the line's button; in the tall
  // frame, on table 7's card from the cut. The tablet sits low enough to leave the words a clear
  // band. Served, the camera rises to the header's message.
  const whole = (push: number) => pose({ y: 150, scale: push, rotateX: 6, rotateY: 14, rotateZ: -1.5 });
  const onButton = pose({ ...aim(DEVICES.tablet, size, tap, { x: 0, y: 300 }, PUSH.button), rotateX: 4, rotateY: 6, rotateZ: -1 });
  const onCard = (push: number) => pose({ ...aim(DEVICES.tablet, size, card, { x: 0, y: TALL.cardY }, push), rotateX: 4, rotateY: 4, rotateZ: -1 });
  const onServed = pose({
    ...aim(DEVICES.tablet, size, served, pick(SERVED_AT.landscape, SERVED_AT.portrait), pick(PUSH.served, TALL.served)),
    rotateX: 3,
    rotateY: -3,
  });
  const tabletPose = useTrack<Pose>(
    portrait
      ? [
          { at: 0, value: { ...onCard(TALL.card), y: onCard(TALL.card).y + 90, rotateX: 12 } },
          { at: 0, value: onCard(TALL.card), config: springs.heavy },
          { at: 4, value: onCard(TALL.card * HOLD_DRIFT), duration: at(SERVE_TAP) },
          { at: left, value: onServed, config: springs.heavy },
        ]
      : [
          { at: 0, value: { ...whole(PUSH.whole), y: whole(PUSH.whole).y + 90, rotateX: 12, rotateY: 20, rotateZ: -2 } },
          { at: 0, value: whole(PUSH.whole), config: springs.heavy },
          { at: 4, value: whole(PUSH.whole * HOLD_DRIFT), duration: at(SERVE_TAP - TO_BUTTON) },
          // Settled on the button before it is tapped.
          { at: at(SERVE_TAP - TO_BUTTON), value: onButton, config: springs.push },
          { at: left, value: onServed, config: springs.heavy },
        ],
  );

  return (
    <Stage>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Device model={DEVICES.tablet} size={size} pose={tabletPose}>
          <Img src={capture(screen)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
          {alone > 0 && <Spotlight box={{ ...salle.card, height: salle.card.content }} radius={CARD_RADIUS} opacity={alone} />}
          {message > 0 && (
            <Spotlight
              box={{ x: salle.served.x - margin, y: salle.served.y - margin, width: salle.served.width + margin * 2, height: salle.served.height + margin * 2 }}
              radius={salle.served.height / 2 + margin}
              opacity={message}
            />
          )}
          {/* The touch goes with the card it served. */}
          {frame < left && <Tap {...tap} at={at(SERVE_TAP)} scale={TAP_SCALE} />}
        </Device>
      </AbsoluteFill>
      {/* The tablet, pushed in, fills the frame: a band of the night behind the words keeps them off its screen. */}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${bk.black} ${band[0] * 100}%, rgb(10 10 12 / 0.85) ${band[1] * 100}%, transparent ${band[2] * 100}%)` }} />
      {/* Centered above the screen, for once: whose screen it is from the cut, on what, then the line over the gesture. */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: pick(TITLE_TOP.landscape, TITLE_TOP.portrait) }}>
        <Kicker delay={2}>Côté salle</Kicker>
        <Reveal fade delay={6} style={{ marginTop: 18, fontFamily: fonts.sans, fontWeight: 600, fontSize: pick(30, 32), color: bk.muted }}>
          Sur votre tablette ou votre téléphone
        </Reveal>
        <Reveal fade delay={at(SERVE_TAP) - 2} style={{ ...statement, marginTop: 26, fontSize: pick(STATEMENT.landscape, STATEMENT.portrait) }}>
          Coché d’un geste.
        </Reveal>
      </AbsoluteFill>
    </Stage>
  );
};

/** The tablet's screen in its own night all around `box`, by `opacity`. */
const Spotlight = ({ box, radius, opacity }: { box: { x: number; y: number; width: number; height: number }; radius: number; opacity: number }) => (
  <div
    style={{
      position: "absolute",
      left: box.x,
      top: box.y,
      width: box.width,
      height: box.height,
      borderRadius: radius,
      boxShadow: `0 0 0 ${DEVICES.tablet.viewport.width}px ${ominin.night}`,
      opacity,
    }}
  />
);
