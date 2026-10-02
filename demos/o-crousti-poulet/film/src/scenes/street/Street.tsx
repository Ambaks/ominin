import { AbsoluteFill, Easing, interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fonts } from "../../brand/fonts";
import { ocp } from "../../brand/tokens";
import { Camera, type Shot } from "../../kit/Camera";
import { Device, DEVICES, mixPose, pose } from "../../kit/Device";
import { useLayout } from "../../kit/layout";
import { springs, useSpring, type Key } from "../../kit/motion";
import { Reveal } from "../../kit/type";
import { beat, DROP } from "../../timeline";
import { neon, STATEMENT } from "../styles";
import { Viewfinder } from "./Viewfinder";
import {
  Coin,
  COIN_RADIUS,
  Figure,
  FIGURE_HEIGHT,
  GREY,
  GROUND,
  LEAVER,
  Pavement,
  PEOPLE,
  personScale,
  personTone,
  personX,
  QR_EYE,
  Shopfront,
  STICKER,
} from "./world";

/*
 * Scenes 2–4, one continuous street: the queue grows along the pavement
 * (« Ça défile. »), the last one in line gives up (« Et parfois… ça
 * repart. »), then the camera whips to the window's QR code, a phone rises
 * over it and scans it on the drop, drops away, and the camera flies into
 * the code.
 */
export const STREET = beat(-12);
const SLAM = beat(-9);
const GIVE_UP = beat(-7);
export const WHIP = beat(-2);
/** « Et parfois… ça repart. » leaves this many frames before the whip, over these frames, blurring this far. */
const LINE_OUT = { lead: 4, frames: 6, blur: 12 };
const PRESENT = 6;
export const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
/** The one who leaves sets off, and the coin leaps out, on this beat. */
export const COIN = beat(-5);
/** How far into the QR's eye the camera dives (its black square far wider than the frame), in how long. */
const DIVE_ZOOM = 400;
const DIVE_FRAMES = 12;
/** From the first step to out of frame. */
const WALK_FRAMES = 58;
/** The Menu Solo, the carte's first menu, in euros: the sale that walks away. */
export const MENU_SOLO = 6.9;
/** The tail of the queue, where the last one gives up. */
export const TAIL = { landscape: { x: 3850, y: 830, zoom: 1.2 }, portrait: { x: 3850, y: 880, zoom: 0.95 } };

export const Street = ({ from }: { from: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { pick } = useLayout();
  const at = (abs: number) => abs - from;
  const local = (abs: number) => frame - at(abs);

  const shots: Key<Shot>[] = [
    { at: 0, value: pick({ x: 1150, y: 700, zoom: 0.8 }, { x: 700, y: 760, zoom: 0.82 }) },
    { at: at(STREET + 9), duration: 80, value: pick({ x: 2500, y: 640, zoom: 0.62 }, { x: 2600, y: 760, zoom: 0.75 }) },
    { at: at(GIVE_UP - 2), duration: 26, value: pick(TAIL.landscape, TAIL.portrait) },
    {
      at: at(WHIP - 2),
      duration: 16,
      value: pick({ x: STICKER.x, y: STICKER.y + 60, zoom: 1.9 }, { x: STICKER.x, y: STICKER.y + 150, zoom: 1.7 }),
    },
    // Centered on the code's eye, then the dive, gathering speed, so the
    // sticker's white goes by in a few frames and the eye's black fills
    // the frame just before the cut.
    { at: at(DROP + 3), duration: 5, value: { x: QR_EYE.x, y: QR_EYE.y, zoom: 2.6 } },
    { at: at(DROP + 6), duration: DIVE_FRAMES, easing: Easing.in(Easing.cubic), value: { x: QR_EYE.x, y: QR_EYE.y, zoom: DIVE_ZOOM } },
  ];

  // The last in line: checks the time, hesitates, greys out, walks off.
  const leaverX = personX(LEAVER);
  const clock = spring({ frame: local(GIVE_UP + 4), fps, config: springs.snappy }) *
    (1 - spring({ frame: local(COIN - 6), fps, config: springs.smooth, durationInFrames: 8 }));
  const hesitate = local(GIVE_UP + 10);
  const lean = hesitate > 0 && hesitate < 22 ? Math.sin((hesitate / 22) * Math.PI * 2) * 7 * Math.sin((hesitate / 22) * Math.PI) : 0;
  const grey = spring({ frame: local(GIVE_UP + 23), fps, config: springs.smooth, durationInFrames: 12 });
  // A walk gathers pace: it eases in, where a spring would bolt.
  const walk = local(COIN);
  const walked = interpolate(walk, [0, WALK_FRAMES], [0, 1500], { easing: Easing.in(Easing.quad), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stride = walk > 0 ? Math.abs(Math.sin(walk * 0.5)) * 12 : 0;

  // The Menu Solo they would have bought: it hops up, shows its price, and
  // rolls away after them.
  const coinPop = spring({ frame: local(COIN), fps, config: springs.snappy });
  const roll = interpolate(local(COIN + 9), [0, WALK_FRAMES - 9], [0, 1700], { easing: Easing.in(Easing.quad), extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const slamText = useSpring(at(SLAM), springs.snappy);
  const lineOut = interpolate(frame - at(WHIP - LINE_OUT.lead), [0, LINE_OUT.frames], [0, 1], { easing: Easing.in(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Held until « Et parfois… » takes its place.
  const slamOut = useSpring(at(GIVE_UP + 8), springs.smooth, 6);
  const phoneIn = useSpring(at(WHIP + 5), springs.heavy);
  const phoneOut = useSpring(at(DROP + 5), springs.smooth, 10);
  const scanned = useSpring(at(DROP), springs.snappy);

  const phoneSize = pick(820, 900);
  const phoneRest = pick(pose({ rotateX: 6, rotateY: -16, rotateZ: 4 }), pose({ rotateX: 10, rotateY: -6, rotateZ: 2 }));
  const phonePose = mixPose(pose({ y: 1100, rotateX: 40, rotateY: -30, rotateZ: 12 }), phoneRest, phoneIn);

  return (
    <AbsoluteFill style={{ background: ocp.black }}>
      <Camera shots={shots}>
        <Pavement length={personX(PEOPLE) + 2400} />
        <Shopfront />
        {Array.from({ length: PEOPLE }, (_, i) => {
          const arrive = i < PRESENT ? 1 : spring({ frame: local(STREET + 3 + (i - PRESENT) * 5), fps, config: springs.snappy });
          const breathe = Math.sin((frame / fps) * Math.PI + i * 1.3) * 2;
          const isLeaver = i === LEAVER;
          return (
            <Figure
              key={i}
              x={personX(i) + (1 - arrive) * 520 + (isLeaver ? walked : 0)}
              scale={personScale(i)}
              tone={isLeaver ? interpolateColors(grey, [0, 1], [personTone(i), GREY]) : personTone(i)}
              lift={breathe + (isLeaver ? stride : 0)}
              lean={isLeaver ? lean : 0}
              opacity={Math.min(1, arrive * 1.5)}
            />
          );
        })}
        <ClockBubble x={leaverX + 90} y={GROUND - FIGURE_HEIGHT * personScale(LEAVER) - 70} scale={clock} spin={frame} />
        <Coin x={leaverX + 150 + walked * 0.35 + roll} pop={coinPop} turn={roll / COIN_RADIUS} label={euros.format(MENU_SOLO)} />
      </Camera>

      <AbsoluteFill style={{ alignItems: "center", paddingTop: pick(96, 300) }}>
        <div
          style={{
            ...neon,
            fontSize: pick(150, 150),
            opacity: slamText * (1 - slamOut),
            scale: String(1.25 - 0.25 * slamText),
          }}
        >
          Ça défile.
        </div>
      </AbsoluteFill>
      {/* « ça repart. » waits for him to set off; the line leaves whole, blurred away by the whip. */}
      <AbsoluteFill style={{ alignItems: "center", paddingTop: pick(120, 330), opacity: 1 - lineOut, filter: `blur(${lineOut * LINE_OUT.blur}px)` }}>
        <Reveal
          fade
          delay={at(GIVE_UP + 14)}
          stagger={COIN - GIVE_UP - 14}
          style={{
            display: "flex",
            justifyContent: "center",
            columnGap: "0.25em",
            fontFamily: fonts.poppins,
            fontWeight: 800,
            fontSize: pick(STATEMENT.landscape, STATEMENT.portrait),
            letterSpacing: "-0.025em",
            color: ocp.white,
            textAlign: "center",
            maxWidth: pick(1600, 900),
          }}
        >
          {["Et parfois…", "ça repart."]}
        </Reveal>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          // Held up over the sticker, as one scans it.
          translate: pick("60px 90px", "30px 200px"),
          opacity: phoneIn > 0.001 ? 1 : 0,
        }}
      >
        <div style={{ translate: `0 ${phoneOut * 1400}px` }}>
          <Device model={DEVICES.phone} size={phoneSize} pose={phonePose} float={phoneIn * 6}>
            <Viewfinder scanned={scanned} />
          </Device>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const BUBBLE = 80;

const ClockBubble = ({ x, y, scale, spin }: { x: number; y: number; scale: number; spin: number }) => (
  <div
    style={{
      position: "absolute",
      left: x - BUBBLE,
      top: y - BUBBLE * 1.4,
      width: BUBBLE * 2,
      height: BUBBLE * 2,
      borderRadius: "50%",
      background: ocp.white,
      scale: String(scale),
      boxShadow: "0 8px 20px rgb(0 0 0 / 0.35)",
    }}
  >
    <svg viewBox="-40 -40 80 80" width={BUBBLE * 2} height={BUBBLE * 2}>
      <circle r={30} fill="none" stroke={ocp.black} strokeWidth={4} />
      <path d="M0 0 V -20" stroke={ocp.black} strokeWidth={5} strokeLinecap="round" transform={`rotate(${spin * 24})`} />
      <path d="M0 0 H 14" stroke={ocp.black} strokeWidth={5} strokeLinecap="round" transform={`rotate(${spin * 2})`} />
    </svg>
  </div>
);
