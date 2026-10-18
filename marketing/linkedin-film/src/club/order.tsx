import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DEVICES, Device, pose } from "../kit/Device";
import { useLayout } from "../kit/layout";
import { springs } from "../kit/motion";
import { Tap } from "../kit/Tap";
import { clamp, useIn } from "../scenes/common";
import { BAR_CHOICE } from "./copy";
import { Caption, SoonTag } from "./parts";
import { BarSheet, MenuScreen, PaySheet, ScanScreen, TicketScreen } from "./screens";
import { Beams, Crowd, Haze, pulse, Room, useFloorRows } from "./stage";
import { beats, SCENE } from "./timeline";

/*
 * The order, on her phone, from the floor: scan, pick the drinks, pick the
 * bar, pay, back to dancing: four beats a step, every tap on a beat. In
 * 16:9 the phone whips across the frame from one step to the next, the
 * caption on its other side.
 */
export const ORDER = {
  lock: beats(1),
  link: beats(1.5),
  openTap: beats(2.5),
  menu: beats(4),
  adds: [beats(5), beats(6)],
  orderTap: beats(7),
  bar: beats(8),
  pickTap: beats(10),
  pay: beats(12),
  payTap: beats(13.5),
  paid: beats(14),
  ticket: beats(16),
};

/** Tap points, in the phone's screen px. */
const TAPS = {
  open: { x: 196, y: 712 },
  add: [
    { x: 343, y: 382 },
    { x: 343, y: 482 },
  ],
  order: { x: 196, y: 790 },
  pick: { x: 196, y: 620 },
  pay: { x: 196, y: 672 },
};

/** Every tap of the scene, in scene frames: the soundtrack cues them. */
export const ORDER_TAPS = [ORDER.openTap, ...ORDER.adds, ORDER.orderTap, ORDER.pickTap, ORDER.payTap];

type Step = { at: number; title: string; sub?: string; soon?: boolean };

const STEPS: Step[] = [
  { at: 0, title: "Scannez, où que vous soyez." },
  { at: ORDER.menu, title: "Choisissez vos verres." },
  { at: ORDER.bar, title: "Choisissez votre bar.", soon: BAR_CHOICE === "soon" },
  { at: ORDER.pay, title: "Payez en un geste." },
  { at: ORDER.ticket, title: "Retournez danser." },
];

/** How far off centre the phone sits in 16:9, as a share of the width. */
const SIDE = 0.24;
/** A caption waits for the phone to land on its side before rising. */
const CAPTION_DELAY = 2;

export const Order = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height, portrait, pick } = useLayout();
  const enter = useIn(0, springs.push);
  const size = pick(height * 0.86, height * 0.64);
  const rows = useFloorRows(0.7);
  const length = SCENE.dance - SCENE.order;
  const screen =
    frame < ORDER.menu ? (
      <ScanScreen lock={ORDER.lock} link={ORDER.link} />
    ) : frame < ORDER.ticket ? (
      <>
        <MenuScreen adds={ORDER.adds} />
        {frame >= ORDER.bar && frame < ORDER.pay && <BarSheet at={ORDER.bar} pick={ORDER.pickTap} />}
        {frame >= ORDER.pay && <PaySheet at={ORDER.pay} paid={ORDER.paid} />}
      </>
    ) : (
      <TicketScreen at={ORDER.ticket} />
    );
  // Each new step swings the phone to the other side (16:9) and turns it a little.
  const swing = STEPS.slice(1).reduce((sum, step, i) => sum + (i % 2 ? 1 : -1) * 2 * spring({ frame: frame - step.at, fps, config: springs.push }), 1);
  const x = portrait ? 0 : swing * width * SIDE;
  const turn = portrait ? 0 : -swing * 12;
  return (
    <Room>
      <Haze strength={1} />
      <Beams energy={0.9 + 0.3 * pulse(frame)} />
      <AbsoluteFill style={{ opacity: 0.7, filter: "blur(3px)" }}>
        <Crowd rows={rows} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: pick("rgb(4 4 8 / 0.45)", "linear-gradient(180deg, rgb(4 4 8 / 0.9) 25%, rgb(4 4 8 / 0.25))") }} />
      {/* A violet halo behind the phone, following it across the frame. */}
      <AbsoluteFill style={{ background: `radial-gradient(circle ${size * 0.45}px at calc(50% + ${x}px) ${pick("50%", "62%")}, rgb(142 91 255 / ${0.28 + 0.12 * pulse(frame)}), transparent 70%)` }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: pick("center", "flex-end"), paddingBottom: pick(0, height * 0.05) }}>
        <Device model={DEVICES.phone} size={size} float={4} pose={pose({ x, y: (1 - enter) * height, rotateY: turn + pick(0, -6), rotateX: 4, rotateZ: pick(swing, 1) })}>
          {screen}
          {frame < ORDER.menu && <Tap {...TAPS.open} at={ORDER.openTap} />}
          {ORDER.adds.map((at, i) => (
            <Tap key={at} {...TAPS.add[i]} at={at} />
          ))}
          <Tap {...TAPS.order} at={ORDER.orderTap} />
          <Tap {...TAPS.pick} at={ORDER.pickTap} />
          <Tap {...TAPS.pay} at={ORDER.payTap} />
        </Device>
      </AbsoluteFill>
      {STEPS.map((step, i) => {
        const next = STEPS[i + 1]?.at ?? length;
        // The caption takes the side the phone is leaving free.
        const left = i % 2 === 0;
        return (
          <Caption
            key={step.title}
            at={step.at + CAPTION_DELAY}
            until={i < STEPS.length - 1 ? next - 6 : undefined}
            kick={
              <>
                {i + 1}/{STEPS.length}
                {step.soon && (
                  <>
                    {"  "}
                    <SoonTag size={pick(26, 30)} />
                  </>
                )}
              </>
            }
            title={step.title}
            sub={step.sub}
            size={pick(104, 92)}
            style={pick(
              { left: left ? 130 : width * 0.42, right: left ? width * 0.42 : 130, top: height * 0.34 },
              { left: 70, right: 70, top: height * 0.13 },
            )}
          />
        );
      })}
      <AbsoluteFill style={{ background: "#000", opacity: interpolate(frame, [length - 8, length], [0, 0.7], clamp) }} />
    </Room>
  );
};
