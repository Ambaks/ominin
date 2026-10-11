import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fonts } from "../brand/fonts";
import { om } from "../brand/tokens";
import { useLayout } from "../kit/layout";
import { springs } from "../kit/motion";
import { beat, DROP } from "../timeline";
import { Accent, Appear, Backdrop, clamp, ramp, useIn } from "./common";

/** The clock jumps two minutes on each tick: the wait, in time-lapse. */
export const CLOCK_TICKS = [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1].map(beat);
const CLOCK_START = 30;
const MINUTES_PER_TICK = 2;

const ASK = beat(-9.5);
export const GIVE_UP = beat(-6);
const NEVER = beat(-3);

const LINES = [
  { at: beat(-10), text: <>Personne ne sait quand c’est prêt.</> },
  { at: GIVE_UP, text: <>Un client abandonne…</> },
  { at: NEVER, text: <Accent>et il ne reviendra pas.</Accent> },
];

const QUEUE = { landscape: 7, portrait: 5 };
/** Each figure’s height, so the line reads as people rather than pins. */
const HEIGHTS = [1, 0.92, 1.06, 0.95, 1.02, 0.9, 1.04];
const BODY = 162;

/** The queue's geometry: in portrait the line runs to the frame's edge, its last figure (the one who leaves) still whole. */
const useQueue = () => {
  const { pick } = useLayout();
  return {
    count: pick(QUEUE.landscape, QUEUE.portrait),
    /** Figure size: the phone cut's queue is shorter and larger. */
    k: pick(1.3, 1.35),
    first: pick(500, 300),
    step: pick(180, 165),
    ground: pick(770, 1200),
    counter: pick({ left: 150, width: 230 }, { left: 24, width: 200 }),
  };
};

export const Hook = () => {
  const frame = useCurrentFrame();
  const { pick } = useLayout();
  const { ground, count } = useQueue();
  const ticks = CLOCK_TICKS.filter((at) => frame >= at).length;
  const minute = CLOCK_START + ticks * MINUTES_PER_TICK;
  const tickPop = useIn(CLOCK_TICKS[Math.max(0, ticks - 1)], springs.snappy);
  const dusk = interpolate(frame, [NEVER, DROP], [0, 0.55], clamp);

  return (
    <AbsoluteFill>
      <Backdrop x={pick(42, 50)} y={pick(58, 52)} glow={0.8} />
      <AbsoluteFill style={{ scale: String(1 + frame / 4000) }}>
        <div
          style={{
            position: "absolute",
            top: pick(70, 330),
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 30,
            fontFamily: fonts.display,
            fontWeight: 600,
            fontSize: pick(150, 170),
            lineHeight: 1,
            color: om.cream,
            fontVariantNumeric: "tabular-nums",
            transform: `scale(${1 + 0.05 * (1 - tickPop) * (ticks > 0 ? 1 : 0)})`,
          }}
        >
          <ClockFace minute={minute} />
          12:{String(minute).padStart(2, "0")}
        </div>
        <Counter />
        {Array.from({ length: count }, (_, i) => (
          <Person key={i} index={i} />
        ))}
        <Bubble />
        <LostCustomer />
        <div style={{ position: "absolute", top: ground + pick(40, 140), left: 60, right: 60, height: 260 }}>
          {LINES.map((line, i) => (
            <Appear
              key={i}
              at={line.at}
              until={LINES[i + 1] ? LINES[i + 1].at - 7 : undefined}
              style={{
                position: "absolute",
                inset: 0,
                textAlign: "center",
                fontFamily: fonts.display,
                fontWeight: 500,
                fontSize: pick(108, 86),
                lineHeight: 1.1,
                textWrap: "balance",
                color: om.cream,
              }}
            >
              {line.text}
            </Appear>
          ))}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#000", opacity: dusk }} />
    </AbsoluteFill>
  );
};

const ClockFace = ({ minute }: { minute: number }) => {
  const angle = (minute / 60) * 360;
  return (
    <svg width={110} height={110} viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="17" fill="none" stroke={om.ember[1]} strokeWidth="3" />
      <path d="M20 20 L20 9" stroke={om.cream} strokeWidth="3" strokeLinecap="round" transform={`rotate(${angle} 20 20)`} />
      <path d="M20 20 L27 20" stroke={om.cream} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};

const Counter = () => {
  const t = useIn(0);
  const { pick } = useLayout();
  const { ground, counter } = useQueue();
  return (
    <div style={{ position: "absolute", left: counter.left, top: ground - 250, width: counter.width, opacity: t }}>
      <div
        style={{
          fontFamily: fonts.sans,
          fontWeight: 600,
          fontSize: pick(34, 26),
          letterSpacing: pick("0.16em", "0.08em"),
          textTransform: "uppercase",
          color: om.muted,
          marginBottom: 14,
          textAlign: "center",
        }}
      >
        Comptoir
      </div>
      <div style={{ height: 220, borderRadius: "22px 22px 0 0", background: om.raised, border: `2px solid ${om.line}`, borderBottom: "none" }} />
    </div>
  );
};

/** The leaver's walk: how far he has gone, 0 → 1. */
const useWalk = () => ramp(useCurrentFrame(), GIVE_UP + 4, GIVE_UP + 40);
const WALK = 620;

const Person = ({ index }: { index: number }) => {
  const frame = useCurrentFrame();
  const { first, step: gap, ground, count, k } = useQueue();
  const enter = useIn(index * 2, springs.smooth);
  const leaver = index === count - 1;
  const walked = useWalk();
  const walk = leaver ? walked : 0;
  const turned = leaver && frame >= GIVE_UP;
  const sway = Math.sin(frame / 14 + index * 1.7) * 3;
  const step = walk > 0 && walk < 1 ? Math.abs(Math.sin(frame / 3)) * 10 : 0;
  const x = first + index * gap + (1 - enter) * 900 + walk * WALK;
  const color = turned ? om.ember[1] : om.cream;
  return (
    <div
      style={{
        position: "absolute",
        left: x - 45,
        top: ground - 68 - BODY * HEIGHTS[index] - step,
        width: 90,
        opacity: (index === 2 ? 1 : 0.86) * (1 - walk * 0.9),
        rotate: `${sway * 0.4}deg`,
        scale: String(k),
        transformOrigin: "50% 100%",
      }}
    >
      <div style={{ width: 58, height: 58, borderRadius: "50%", background: color, margin: "0 auto 10px" }} />
      <div style={{ width: 90, height: BODY * HEIGHTS[index], borderRadius: "45px 45px 12px 12px", background: color }} />
    </div>
  );
};

/** « −1 client » rises where the leaver stood. */
const LostCustomer = () => {
  const { first, step, ground, count, k } = useQueue();
  const { pick } = useLayout();
  const t = useIn(GIVE_UP + 8, springs.snappy);
  const frame = useCurrentFrame();
  const out = ramp(frame, NEVER - 4, NEVER + 6);
  return (
    <div
      style={{
        position: "absolute",
        left: first + (count - 1) * step - pick(110, 230),
        top: ground - 330 * k - 40 - 30 * t,
        opacity: t * (1 - out),
        fontFamily: fonts.sans,
        fontWeight: 700,
        fontSize: pick(80, 64),
        color: om.ember[0],
        whiteSpace: "nowrap",
      }}
    >
      −1 client
    </div>
  );
};

const Bubble = () => {
  const frame = useCurrentFrame();
  const { pick } = useLayout();
  const { first, step, ground, k } = useQueue();
  const t = useIn(ASK + 2, springs.snappy);
  const out = ramp(frame, GIVE_UP - 4, GIVE_UP + 4);
  return (
    <div
      style={{
        position: "absolute",
        left: first + 2 * step - 30 * k - pick(0, 60),
        top: ground - 330 * k - 80,
        opacity: t * (1 - out),
        transform: `scale(${0.6 + 0.4 * t})`,
        transformOrigin: "0% 100%",
        padding: "18px 32px",
        borderRadius: "30px 30px 30px 6px",
        background: om.cream,
        color: om.ink,
        fontFamily: fonts.sans,
        fontWeight: 600,
        fontSize: 50,
        whiteSpace: "nowrap",
      }}
    >
      C’est prêt quand&#8239;?
    </div>
  );
};
