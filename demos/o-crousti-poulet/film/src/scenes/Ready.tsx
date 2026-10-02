import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { phone } from "../captures";
import { fonts } from "../brand/fonts";
import { ocp } from "../brand/tokens";
import { Stage } from "../kit/atmosphere";
import { Camera } from "../kit/Camera";
import { Device, DEVICES, outline, pose } from "../kit/Device";
import { useLayout } from "../kit/layout";
import { springs, useTrack } from "../kit/motion";
import { Highlight, Reveal } from "../kit/type";
import { beat } from "../timeline";
import { PhoneScreen, SheetShot } from "./phone/screens";
import { euros, MENU_SOLO, TAIL } from "./street/Street";
import { Coin, COIN_RADIUS, Figure, GREY, GROUND, LEAVER, Pavement, PEOPLE, personScale, personTone, personX, Shopfront } from "./street/world";
import { ClockChip, STATEMENT } from "./styles";

/*
 * Scene 11: the customer's phone buzzes — « C'est prêt ! » — then back to
 * the street's queue: the one who gave up stays this time, phone in hand,
 * lights up on the beat, and the sale rolls back to him.
 */
export const READY = beat(49);
export const BUZZ = beat(50);
/** The vibration's two pulses, in frames from BUZZ. */
const PULSES = [
  [0, 13],
  [18, 31],
];
/** The buzz: side to side, this many frames each way, this far, with a slight turn. */
const BUZZ_SHAKE = { frames: 2, degrees: 1.5, px: 6 };
/** The phone's outline pulsing out three times from the buzz, clear of its edge: where it starts, how much it grows, over how long, how far apart, how much rounder. */
const RING = { count: 3, from: 0.06, grow: 0.24, frames: 14, gap: 6, round: 16 };
/** The ticket's promised time, kept: the clock chip, back beside the phone as it buzzes. */
const CHIP = { size: 44, x: 230, y: 360 };
const CALLBACK = beat(52);
const LIGHT_UP = beat(53);
/** The coin rolls back in, landing on this frame. */
export const COIN_BACK = beat(53) + 12;
const ROLL_FRAMES = 16;
/** The time the ticket promised: « vers 12:41 ». */
const READY_AT = "12:41";

export const Ready = ({ from }: { from: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait, pick } = useLayout();
  const at = (abs: number) => abs - from;
  const t = frame - at(BUZZ);
  const buzzing = PULSES.some(([start, end]) => t >= start && t < end);
  const shake = buzzing ? (Math.floor(t / BUZZ_SHAKE.frames) % 2 === 0 ? 1 : -1) : 0;
  const chip = spring({ frame: t + 4, fps, config: springs.snappy });
  const ring = (start: number) => interpolate(t - start, [0, RING.frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const size = pick(1250, 1300);
  const rest = pick(pose({ x: 0, y: 150, rotateX: 6, rotateY: -12, rotateZ: 3 }), pose({ y: 420, rotateX: 8, rotateY: -6, rotateZ: 2 }));
  const phonePose = useTrack([
    { at: 0, value: pick(pose({ x: 380, y: 700, rotateX: 26, rotateY: -26, rotateZ: 8 }), pose({ y: 1100, rotateX: 24, rotateZ: 5 })) },
    { at: 0, value: rest, config: springs.heavy },
  ]);
  const body = outline(DEVICES.phone, size);

  if (frame >= at(CALLBACK)) return <Callback from={from} />;

  return (
    <Stage>
      {/* Outlines of the phone, placed and tilted as it is, pulse out from it. */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          translate: `${phonePose.x + shake * BUZZ_SHAKE.px}px ${phonePose.y}px`,
          transform: `perspective(${body.height * 3}px) rotateX(${phonePose.rotateX}deg) rotateY(${phonePose.rotateY}deg) rotateZ(${phonePose.rotateZ + shake * BUZZ_SHAKE.degrees}deg)`,
        }}
      >
        {Array.from({ length: RING.count }, (_, i) => i * RING.gap).map((start) => (
          <div
            key={start}
            style={{
              position: "absolute",
              width: body.width,
              height: body.height,
              borderRadius: body.radius + RING.round,
              border: `3px solid ${ocp.yellow}`,
              opacity: (1 - ring(start)) * (t >= start ? 0.9 : 0),
              scale: String(1 + RING.from + ring(start) * RING.grow),
            }}
          />
        ))}
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ rotate: `${shake * BUZZ_SHAKE.degrees}deg`, translate: `${shake * BUZZ_SHAKE.px}px 0` }}>
          <Device model={DEVICES.phone} size={size} pose={phonePose} float={6}>
            <PhoneScreen time={READY_AT}>
              <SheetShot src={phone.ticket.ready} top={phone.ticket.sheetTop} />
            </PhoneScreen>
          </Device>
        </div>
      </AbsoluteFill>
      {!portrait && (
        <div style={{ position: "absolute", left: CHIP.x, top: CHIP.y, opacity: Math.min(1, chip), scale: String(0.8 + 0.2 * chip) }}>
          <ClockChip size={CHIP.size} glow={1}>
            {READY_AT}
          </ClockChip>
        </div>
      )}
    </Stage>
  );
};

/** Others in the line, their phones in hand too, light up after him: [index, frames after him]. */
const OTHERS = [
  [LEAVER - 2, 6],
  [LEAVER - 4, 12],
] as const;
/** Frames the coin takes to come to rest on the ground beside him, this size, this far to his right, ringed in black; he hops as it lands. */
const TAKEN = 10;
const AT_REST = { scale: 0.72, x: 150, ring: 8 };
/** The highlight sweeps « ne repart. » just before he lights up. */
const SWEEP_LEAD = 10;
const TAKEN_HOP = COIN_BACK - LIGHT_UP + TAKEN;

/**
 * The street's queue again, on the shot where the last one gave up: this
 * time he has stayed, his phone says it is ready, he lights up, and the
 * sale he walked away with rolls back to rest beside him.
 */
const Callback = ({ from }: { from: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { pick } = useLayout();
  const at = (abs: number) => abs - from;
  const lightUp = (delay = 0) => spring({ frame: frame - at(LIGHT_UP) - delay, fps, config: springs.snappy });
  const fill = (lit: number) => Math.min(1, lit);
  const hop = (lit: number) => Math.sin(Math.min(1, lit) * Math.PI) * 24;
  // The give-up shot, the line moved right to fill the frame; the tall frame comes closer on the one who stays.
  const tail = pick({ ...TAIL.landscape, x: TAIL.landscape.x - 250 }, { x: personX(LEAVER) - 60, y: GROUND - 260, zoom: 1.3 });
  const shots = [
    { at: 0, value: tail },
    { at: 0, value: { ...tail, zoom: tail.zoom * 1.06 }, duration: at(COIN_BACK) - at(CALLBACK) + 30 },
  ];

  const lit = lightUp();
  // Rolling back in from the right, slowing to his heels, then coming to rest beside him.
  const rollIn = interpolate(frame - at(COIN_BACK) + ROLL_FRAMES, [0, ROLL_FRAMES], [1, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taken = interpolate(frame - at(COIN_BACK) - 2, [0, TAKEN], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const travel = 1400;
  const coinX = personX(LEAVER) + AT_REST.x + rollIn * travel;
  const lift = hop(lit) + hop(lightUp(TAKEN_HOP));

  return (
    <Stage>
      <Camera shots={shots}>
        <Pavement length={personX(PEOPLE) + 2400} />
        <Shopfront />
        {Array.from({ length: PEOPLE }, (_, i) => {
          const breathe = Math.sin((frame / fps) * Math.PI + i * 1.3) * 2;
          const other = OTHERS.find(([index]) => index === i);
          if (i === LEAVER) return null;
          const glow = other ? lightUp(other[1]) : 0;
          return (
            <Figure
              key={i}
              x={personX(i)}
              scale={personScale(i)}
              tone={personTone(i)}
              fill={fill(glow)}
              lift={breathe + (other ? hop(glow) : 0)}
              phone={Boolean(other)}
            />
          );
        })}
        <Figure x={personX(LEAVER)} scale={personScale(LEAVER)} tone={GREY} fill={fill(lit)} lift={lift} phone />
        {frame >= at(COIN_BACK) - ROLL_FRAMES && (
          <Coin
            x={coinX}
            pop={1 - taken * (1 - AT_REST.scale)}
            hop={0}
            turn={(rollIn * travel) / COIN_RADIUS}
            label={euros.format(MENU_SOLO)}
            ring={taken * AT_REST.ring}
          />
        )}
      </Camera>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: pick(120, 330) }}>
        <Reveal
          fade
          delay={at(CALLBACK) + 2}
          stagger={2}
          style={{
            display: "flex",
            flexDirection: pick("row", "column"),
            alignItems: "center",
            columnGap: "0.25em",
            fontFamily: fonts.poppins,
            fontWeight: 800,
            fontSize: pick(STATEMENT.landscape, STATEMENT.portrait),
            letterSpacing: "-0.03em",
            color: ocp.white,
          }}
        >
          {["Personne", <Highlight delay={at(LIGHT_UP) - SWEEP_LEAD}>ne repart.</Highlight>]}
        </Reveal>
      </AbsoluteFill>
    </Stage>
  );
};
