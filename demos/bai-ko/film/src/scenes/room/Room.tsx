import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { phone, salle } from "../../captures";
import { bk } from "../../brand/tokens";
import { Device, DEVICES, mixPose, pose } from "../../kit/Device";
import { useLayout } from "../../kit/layout";
import { CLAMP, springs, useSpring } from "../../kit/motion";
import { Counter, Reveal, TICK_ROLL } from "../../kit/type";
import { beat, DROP } from "../../timeline";
import { Chip, Kicker, neon, statement, STATEMENT } from "../styles";
import { Cachet, CACHET, QR_EYE, Viewfinder } from "./Cachet";

/*
 * Scenes 2–4: the room, in Baï-Kō's own photo of it — every table waiting on
 * the same person (table 15's minutes climbing with the room's clock, to the
 * order's 12:41), table 7 just seated; then table 7's Cachet, a phone rises
 * over it and scans it on the drop, holds the link it found, drops away, and
 * the camera flies into the code: table 7 orders the minute it sits down.
 */
export const ROOM = beat(-12);
/** The tables' states pop in, one per beat. */
const CHIPS = [beat(-11), beat(-10), beat(-9)];
/** Table 15's wait, minute by minute: one per beat, then the line. */
export const WAIT_TICKS = [beat(-10), beat(-9), beat(-8), beat(-7)];
const FIRST_WAIT = 4;
const [HOUR, ORDER_MINUTE] = phone.order.at.split(":").map(Number);
/** The room's clock opens where the title's stops and reaches the order's minute on the wait's last tick. */
export const ROOM_CLOCK = { hour: HOUR, minute: ORDER_MINUTE - WAIT_TICKS.length };
const LINE = beat(-8);
const CACHET_CUT = beat(-4);
/** The Cachet named above it, this many frames after its cut, this far above its top edge in px; gone over the dive's first frames. */
const CACHET_NAME = { delay: 6, gap: 70, out: 4 };
export const PHONE_UP = beat(-3);
/** Where the scanning phone stands, from the frame's center: over the Cachet's lower half, the detected link still in frame on the scan. */
const PHONE_AT = { landscape: "60px 220px", portrait: "40px 380px" };
/** The phone holds the link it found this many frames after the scan, then drops. */
const LINK_HOLD = 10;
/** When the camera dives into the code's eye, how far, in how long: done on the order's first frame. */
const DIVE_AT = DROP + 6;
const DIVE_ZOOM = 260;
const DIVE_FRAMES = 12;
/** How much of the night lies over the room's photo, under the chips, and how far out of focus it stands behind them, in px. */
const ROOM_VEIL = 0.25;
const ROOM_BLUR = 1;
/**
 * How close the room's photo stands at the cut, and at the Cachet's: the
 * title's backdrop drifts up to the first. In the wide frame the photo is
 * already enlarged to fill it: it barely moves.
 */
export const ROOM_PUSH = { landscape: { from: 1.02, to: 1.08 }, portrait: { from: 1.04, to: 1.16 } };
/** After the room tablet, the room again: two beats, every table answered. */
export const FREED = beat(39);
/** Its chips turn over one after another, this many frames apart, each over FLIP.frames. */
const FLIP = { stagger: 3, frames: 8 };

/** The tables' chips, where their tables stand in the photo: in the wide frame, right of the line; in the tall one, above it. */
const CHIP_AT = {
  landscape: [{ x: 0.72, y: 0.3 }, { x: 0.8, y: 0.52 }, { x: 0.7, y: 0.74 }],
  portrait: [{ x: 0.5, y: 0.3 }, { x: 0.5, y: 0.42 }, { x: 0.5, y: 0.54 }],
};
/** Tables 15, 3 and 7, each in its own colour in both scenes. */
const TONES = [bk.gold, bk.cyan, bk.pink];
/** The chips the room opens on, then the same tables once served from their phones. */
const WAITING = ["Table 15 · veut commander", "Table 3 · attend l’addition", `Table ${phone.table} · vient de s’asseoir`];
const ANSWERED = ["Table 15 · commande envoyée", "Table 3 · payée à table", `Table ${phone.table} · servie ${salle.clock}`];


/** Table 15's wait, in a pill: the odometer rolls a minute on each tick. */
const Wait = ({ minutes, tick, size }: { minutes: number; tick?: number; size: number }) => (
  <div
    style={{
      display: "flex",
      alignItems: "baseline",
      gap: "0.2em",
      padding: `${size * 0.12}px ${size * 0.5}px`,
      borderRadius: 999,
      border: `1.5px solid ${bk.white}`,
      background: "rgb(10 10 12 / 0.72)",
      fontFamily: statement.fontFamily,
      fontSize: size,
      lineHeight: 1.1,
      color: bk.white,
    }}
  >
    {tick === undefined ? <span>{minutes}</span> : <Counter key={tick} from={minutes - 1} to={minutes} delay={tick} duration={TICK_ROLL} />}
    <span>min</span>
  </div>
);

/** Their room, in their own photo: in the wide frame on its neon signs, the cheese pull and the tables behind; in the tall one on the loaded table, its cans and the tables behind it. */
const ROOM_PHOTO = { src: "photos/room-corn-cheese.jpg", focus: { landscape: "50% 35%", portrait: "50% 60%" } };

/** Their room, cover, drifting closer by `push`, under a veil of the night (0–1) and out of focus by `blur` px. */
export const RoomPhoto = ({ push, veil, blur = 0 }: { push: number; veil: number; blur?: number }) => {
  const { pick } = useLayout();
  const focus = pick(ROOM_PHOTO.focus.landscape, ROOM_PHOTO.focus.portrait);
  return (
    <AbsoluteFill>
      <Img
        src={staticFile(ROOM_PHOTO.src)}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: focus, scale: String(push), transformOrigin: focus, filter: blur > 0 ? `blur(${blur}px)` : undefined }}
      />
      <AbsoluteFill style={{ background: `rgb(10 10 12 / ${veil})` }} />
    </AbsoluteFill>
  );
};

/** The room's clock, small, in the title's type: it runs on with table 15's wait. */
const Clock = ({ minute, tick, size }: { minute: number; tick?: number; size: number }) => (
  <div style={{ display: "flex", ...statement, fontSize: size, lineHeight: 1 }}>
    <span>{`${ROOM_CLOCK.hour}:`}</span>
    {tick === undefined ? <span>{minute}</span> : <Counter key={tick} from={minute - 1} to={minute} delay={tick} duration={TICK_ROLL} />}
    <span style={{ color: bk.pink }}>.</span>
  </div>
);

export const Room = ({ from }: { from: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height, portrait, pick } = useLayout();
  const at = (abs: number) => abs - from;
  const local = (abs: number) => frame - at(abs);

  const push = pick(ROOM_PUSH.landscape, ROOM_PUSH.portrait);
  const drift = interpolate(frame, [0, at(CACHET_CUT)], [push.from, push.to], CLAMP);
  const pops = CHIPS.map((chip) => spring({ frame: local(chip), fps, config: springs.snappy }));
  const passed = WAIT_TICKS.filter((tick) => local(tick) >= 0);
  const minutes = FIRST_WAIT + passed.length;
  const lastTick = passed.at(-1);
  const tick = lastTick === undefined ? undefined : at(lastTick);
  const onCachet = local(CACHET_CUT) >= 0;

  // The Cachet: cut in on its beat, then the dive into its code's eye.
  const cachetScale = pick(1.35, 1.55);
  const cachetIn = useSpring(at(CACHET_CUT), springs.smooth, 10);
  const dive = interpolate(local(DIVE_AT), [0, DIVE_FRAMES], [0, 1], { ...CLAMP, easing: Easing.in(Easing.cubic) });
  const zoom = Math.exp(Math.log(DIVE_ZOOM) * dive);
  const phoneIn = useSpring(at(PHONE_UP), springs.heavy);
  const phoneOut = useSpring(at(DROP + LINK_HOLD), springs.smooth, 10);
  const scanned = useSpring(at(DROP), springs.snappy);
  const phoneSize = pick(780, 900);
  const phonePose = mixPose(pose({ y: 1100, rotateX: 40, rotateY: -30, rotateZ: 12 }), pick(pose({ rotateX: 8, rotateY: -16, rotateZ: 4 }), pose({ rotateX: 10, rotateY: -6, rotateZ: 2 })), phoneIn);

  // The tables' states are the room's picture. Table 15 waits to order, its minutes climbing;
  // table 7, last, has only just sat down.
  const places = pick(CHIP_AT.landscape, CHIP_AT.portrait);

  if (onCachet) {
    const eye = { x: (QR_EYE.x - CACHET.w / 2) * cachetScale, y: (QR_EYE.y - CACHET.h / 2) * cachetScale };
    return (
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 60% at 50% 45%, #241826, #0A0A0C 70%)" }}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              opacity: cachetIn,
              translate: `0 ${(1 - cachetIn) * 40}px`,
              transformOrigin: `calc(50% + ${eye.x}px) calc(50% + ${eye.y}px)`,
              scale: String(zoom),
            }}
          >
            {/* Squared up as the phone rises over it, by the scan: the dive starts from it straight. */}
            <div style={{ rotate: `${interpolate(frame, [at(PHONE_UP), at(DROP)], [-4, 0], { ...CLAMP, easing: Easing.inOut(Easing.cubic) })}deg` }}>
              <Cachet scale={cachetScale} />
            </div>
          </div>
        </AbsoluteFill>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", translate: pick(PHONE_AT.landscape, PHONE_AT.portrait), opacity: phoneIn > 0.001 ? 1 : 0 }}>
          <div style={{ translate: `0 ${phoneOut * 1500}px` }}>
            <Device model={DEVICES.phone} size={phoneSize} pose={phonePose} float={phoneIn * 6}>
              <Viewfinder scanned={scanned} />
            </Device>
          </div>
        </AbsoluteFill>
        {/* Named once, the table's card: it gives way as the camera dives. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: height / 2 - (CACHET.h * cachetScale) / 2 - CACHET_NAME.gap,
            translate: "0 -100%",
            display: "flex",
            justifyContent: "center",
            opacity: interpolate(local(DIVE_AT), [0, CACHET_NAME.out], [1, 0], CLAMP),
          }}
        >
          <Kicker delay={at(CACHET_CUT) + CACHET_NAME.delay}>{`Le Cachet de la table ${phone.table}`}</Kicker>
        </div>
        {/* The eye's black fills the frame as the dive ends. */}
        <AbsoluteFill style={{ background: bk.black, opacity: interpolate(dive, [0.8, 1], [0, 1], CLAMP) }} />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: bk.black }}>
      <RoomPhoto push={drift} veil={ROOM_VEIL} blur={ROOM_BLUR} />
      <TowardsWords />
      {WAITING.map((text, i) => (
        <div
          key={text}
          style={{
            position: "absolute",
            left: places[i].x * width,
            top: places[i].y * height,
            translate: "-50% -50%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            opacity: Math.min(1, pops[i] * 1.5),
            scale: String(0.85 + pops[i] * 0.15),
          }}
        >
          <Chip tone={TONES[i]} size={pick(26, 30)}>
            {text}
          </Chip>
          {i === 0 && <Wait minutes={minutes} tick={tick} size={pick(40, 44)} />}
        </div>
      ))}
      <div style={{ position: "absolute", ...pick({ left: 150, top: 110 }, { left: 0, right: 0, top: 170 }), display: "flex", justifyContent: "center" }}>
        <Clock minute={ROOM_CLOCK.minute + passed.length} tick={tick} size={pick(96, 104)} />
      </div>
      <AbsoluteFill
        style={{
          alignItems: portrait ? "center" : "flex-start",
          justifyContent: portrait ? "flex-end" : "center",
          padding: pick("0 0 0 150px", "0 60px 220px"),
        }}
      >
        <Reveal fade delay={at(LINE)} stagger={3} style={{ ...statement, fontSize: pick(STATEMENT.landscape, STATEMENT.portrait), display: "flex", flexDirection: "column", alignItems: portrait ? "center" : "flex-start", textAlign: portrait ? "center" : "left" }}>
          {["Chaque table attend", <span style={neon}>la même personne.</span>]}
        </Reveal>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** The room's photo darker towards the words, so they read on any photo. */
const TowardsWords = () => {
  const { portrait } = useLayout();
  return (
    <AbsoluteFill
      style={{
        background: portrait
          ? "linear-gradient(180deg, rgb(10 10 12 / 0.15) 30%, rgb(10 10 12 / 0.9) 78%)"
          : "linear-gradient(90deg, rgb(10 10 12 / 0.92) 0%, rgb(10 10 12 / 0.55) 42%, rgb(10 10 12 / 0.15) 70%)",
      }}
    />
  );
};

/**
 * The room again, framed as the room scene left it, at the tablet's 12:50:
 * each table's chip turns over to what its phone did — the person they all
 * waited for, free.
 */
export const RoomFreed = () => {
  const frame = useCurrentFrame();
  const { width, height, pick } = useLayout();
  const places = pick(CHIP_AT.landscape, CHIP_AT.portrait);
  const [, minute] = salle.clock.split(":").map(Number);
  return (
    <AbsoluteFill style={{ background: bk.black }}>
      <RoomPhoto push={pick(ROOM_PUSH.landscape, ROOM_PUSH.portrait).to} veil={ROOM_VEIL} blur={ROOM_BLUR} />
      <TowardsWords />
      {ANSWERED.map((text, i) => {
        // Half a turn on its old face, half on the new one.
        const turn = interpolate(frame - i * FLIP.stagger, [0, FLIP.frames], [0, 1], { ...CLAMP, easing: Easing.inOut(Easing.cubic) });
        return (
          <div
            key={text}
            style={{ position: "absolute", left: places[i].x * width, top: places[i].y * height, translate: "-50% -50%", rotate: `x ${Math.abs(1 - turn * 2) * 90 - 90}deg` }}
          >
            <Chip tone={TONES[i]} size={pick(26, 30)}>
              {turn < 0.5 ? WAITING[i] : text}
            </Chip>
          </div>
        );
      })}
      <div style={{ position: "absolute", ...pick({ left: 150, top: 110 }, { left: 0, right: 0, top: 170 }), display: "flex", justifyContent: "center" }}>
        <Clock minute={minute} size={pick(96, 104)} />
      </div>
    </AbsoluteFill>
  );
};

/** The film frames on which each chip stands edge-on, turning over: its sound's. */
export const FLIPS = ANSWERED.map((_, i) => FREED + i * FLIP.stagger + FLIP.frames / 2);
