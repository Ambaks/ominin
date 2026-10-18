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
import { SCENE } from "./timeline";

/*
 * The order, on her phone, from the floor: scan, pick the drinks, pick the
 * bar, pay, back to dancing. Frames are the scene's own. In 16:9 the phone
 * crosses the frame from one step to the next, the caption on its other side.
 */
export const ORDER = {
  lock: 34,
  link: 44,
  openTap: 62,
  menu: 70,
  adds: [108, 136],
  orderTap: 172,
  bar: 186,
  pickTap: 228,
  pay: 262,
  payTap: 296,
  paid: 300,
  ticket: 326,
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
  { at: 0, title: "Scannez le QR code", sub: "Où que vous soyez dans le club." },
  { at: ORDER.menu, title: "Choisissez vos verres", sub: "La carte du club, sur votre téléphone." },
  { at: ORDER.bar, title: "Choisissez votre bar", sub: "Central, Rooftop ou VIP.", soon: BAR_CHOICE === "soon" },
  { at: ORDER.pay, title: "Payez en un geste" },
  { at: ORDER.ticket, title: "Retournez danser", sub: "Téléphone en poche : on vous prévient." },
];

/** How far off centre the phone sits in 16:9, as a share of the width. */
const SIDE = 0.24;
/** A caption waits for the phone to land on its side before rising. */
const CAPTION_DELAY = 16;

export const Order = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height, portrait, pick } = useLayout();
  const enter = useIn(0, springs.heavy);
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
  const swing = STEPS.slice(1).reduce((sum, step, i) => sum + (i % 2 ? 1 : -1) * 2 * spring({ frame: frame - step.at, fps, config: springs.heavy }), 1);
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
            at={step.at + (i ? CAPTION_DELAY : 4)}
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
            size={pick(92, 84)}
            style={pick(
              { left: left ? 130 : width * 0.58, right: left ? width * 0.58 : 130, top: height * 0.32 },
              { left: 70, right: 70, top: height * 0.13 },
            )}
          />
        );
      })}
      <AbsoluteFill style={{ background: "#000", opacity: interpolate(frame, [length - 8, length], [0, 0.7], clamp) }} />
    </Room>
  );
};
