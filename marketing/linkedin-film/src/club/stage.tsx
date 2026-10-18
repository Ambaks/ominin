import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { fonts } from "../brand/fonts";
import { useLayout } from "../kit/layout";
import { BEAT } from "./timeline";
import { club } from "./tokens";

/*
 * The club itself, drawn: moving-head beams and haze over a dark room,
 * silhouettes that dance on the beat, a backlit bar. Every piece is a
 * function of the frame, so both cuts and every render agree.
 */

const TAU = Math.PI * 2;

/** 0 → 1 → 0 once per beat, sharp on the beat: what a body does with a kick. */
export const pulse = (frame: number, offset = 0) => {
  const t = (((frame - offset) % BEAT) + BEAT) % BEAT / BEAT;
  return Math.pow(1 - t, 2.2);
};

// ——— Lights —————————————————————————————————————————————————————

type Beam = { x: number; color: string; base: number; swing: number; speed: number; phase: number; spread: number };

const BEAMS: Beam[] = [
  { x: 0.12, color: club.violet, base: 18, swing: 22, speed: 0.021, phase: 0, spread: 0.07 },
  { x: 0.3, color: club.silver, base: -10, swing: 26, speed: 0.017, phase: 1.7, spread: 0.05 },
  { x: 0.5, color: club.cyan, base: 4, swing: 30, speed: 0.025, phase: 3.1, spread: 0.06 },
  { x: 0.7, color: club.silver, base: 12, swing: 24, speed: 0.019, phase: 4.4, spread: 0.05 },
  { x: 0.88, color: club.violet, base: -16, swing: 22, speed: 0.023, phase: 2.3, spread: 0.07 },
];

/**
 * Moving heads hung from the ceiling: cones of light that sweep and cross.
 * `energy` scales their brightness and speed (0.4 in the intro, 1 at the peak).
 */
export const Beams = ({ energy = 1 }: { energy?: number }) => {
  const frame = useCurrentFrame();
  const { width, height } = useLayout();
  const length = height * 1.35;
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", pointerEvents: "none" }}>
      {BEAMS.map((beam, i) => {
        const angle = beam.base + Math.sin(frame * beam.speed * (0.6 + energy * 0.6) + beam.phase) * beam.swing;
        const half = width * beam.spread;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: width * beam.x - half,
              top: -height * 0.06,
              width: half * 2,
              height: length,
              transformOrigin: "50% 0",
              transform: `rotate(${angle}deg)`,
              clipPath: "polygon(47% 0, 53% 0, 100% 100%, 0 100%)",
              background: `linear-gradient(${beam.color}, transparent 82%)`,
              opacity: (0.16 + 0.1 * energy) * (0.85 + 0.15 * Math.sin(frame * 0.3 + i)),
              filter: "blur(10px)",
            }}
          />
        );
      })}
      <Dust />
      {/* The fixtures themselves: small hot points along the truss. */}
      {BEAMS.map((beam, i) => (
        <div
          key={`head${i}`}
          style={{
            position: "absolute",
            left: width * beam.x - 9,
            top: -6,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: `0 0 30px 10px ${beam.color}`,
            opacity: 0.5 + 0.4 * energy,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const SPECKS = 60;

/** Dust in the light: specks drifting slowly down and across, twinkling. */
const Dust = () => {
  const frame = useCurrentFrame();
  const { width, height } = useLayout();
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: SPECKS }, (_, i) => {
        const seedX = (Math.sin(i * 91.7) + 1) / 2;
        const seedY = (Math.sin(i * 47.3) + 1) / 2;
        const x = (seedX * width + Math.sin(frame / 70 + i) * 30 + frame * 0.15) % width;
        const y = (seedY * height * 0.8 + frame * (0.2 + (i % 5) * 0.08)) % (height * 0.8);
        return <circle key={i} cx={x} cy={y} r={1 + (i % 3)} fill="#fff" opacity={0.15 + 0.25 * ((Math.sin(frame / 9 + i) + 1) / 2)} />;
      })}
    </svg>
  );
};

/** Haze lit from above, drifting slowly: the room's depth. */
export const Haze = ({ color = club.violet, strength = 1 }: { color?: string; strength?: number }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 6;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: [
          `radial-gradient(ellipse 60% 40% at ${30 + drift}% 35%, color-mix(in srgb, ${color} ${18 * strength}%, transparent), transparent 70%)`,
          `radial-gradient(ellipse 55% 45% at ${72 - drift}% 45%, color-mix(in srgb, ${club.cyan} ${10 * strength}%, transparent), transparent 70%)`,
          `radial-gradient(ellipse 120% 50% at 50% 100%, rgb(255 255 255 / ${0.08 * strength}), transparent 70%)`,
        ].join(","),
      }}
    />
  );
};

/** Laser fans from the booth: the peak only. */
export const Lasers = ({ opacity = 1 }: { opacity?: number }) => {
  const frame = useCurrentFrame();
  const { width, height } = useLayout();
  const origin = { x: width / 2, y: height * 0.12 };
  const lines = 9;
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0, mixBlendMode: "screen", opacity, pointerEvents: "none" }}>
      {Array.from({ length: lines }, (_, i) => {
        const a = (-70 + (140 * i) / (lines - 1) + Math.sin(frame * 0.05) * 12) * (Math.PI / 180);
        const r = Math.max(width, height) * 1.2;
        return (
          <line
            key={i}
            x1={origin.x}
            y1={origin.y}
            x2={origin.x + Math.sin(a) * r}
            y2={origin.y + Math.cos(a) * r}
            stroke={i % 2 ? club.cyan : club.violet}
            strokeWidth={3.5}
            opacity={0.75}
            filter={`drop-shadow(0 0 6px ${i % 2 ? club.cyan : club.violet})`}
          />
        );
      })}
    </svg>
  );
};

/** The room: black with a faint floor sheen. Children are the lights and people. */
export const Room = ({ children, glow = club.violet }: { children?: ReactNode; glow?: string }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 90% 60% at 50% 30%, color-mix(in srgb, ${glow} 10%, ${club.night}), ${club.night} 60%, ${club.deep})`,
    }}
  >
    {children}
  </AbsoluteFill>
);

// ——— People ————————————————————————————————————————————————————

export type Hair = "short" | "ponytail" | "bun" | "long";

export type Moves = {
  /** Shoulder angles from hanging, in degrees (positive: out and up). */
  left: number;
  right: number;
  /** Elbow bends, in degrees. */
  leftBend: number;
  rightBend: number;
  /** Vertical bounce, px (positive: down). */
  bob: number;
  /** Lean of the whole body, degrees. */
  lean: number;
};

export const STILL: Moves = { left: 8, right: 8, leftBend: 10, rightBend: 10, bob: 0, lean: 0 };

/** Dance styles: the crowd draws from all of them, phase-shifted. */
export const DANCES = 6;
/** The style that holds a lit phone up: the crowd's phone lights. */
const PHONE_UP = 4;

/** One of a few dances, picked by `style`, at the frame's beat. */
export const dance = (frame: number, style: number, energy = 1): Moves => {
  const p = pulse(frame, style * 3);
  const swayPhase = ((frame + style * 11) / (BEAT * 2)) * TAU;
  const sway = Math.sin(swayPhase);
  switch (style % DANCES) {
    case 0: // arms up, hands open
      return { left: 150 + sway * 15 * energy, right: 150 - sway * 15 * energy, leftBend: 20, rightBend: 20, bob: p * 10 * energy, lean: sway * 4 };
    case 1: // one fist pumping
      return { left: 20, right: 120 + p * 40 * energy, leftBend: 70, rightBend: 30 - p * 20, bob: p * 8 * energy, lean: sway * 3 };
    case 2: // elbows in, side to side
      return { left: 40 + sway * 15, right: 40 - sway * 15, leftBend: 110, rightBend: 110, bob: p * 7 * energy, lean: sway * 7 };
    case 3: // hands overhead, clapping on the beat
      return { left: 165 - p * 18 * energy, right: 165 - p * 18 * energy, leftBend: 35, rightBend: 35, bob: p * 9 * energy, lean: 0 };
    case PHONE_UP: // a phone held high, swaying
      return { left: 30 + sway * 10, right: 160 + sway * 8, leftBend: 90, rightBend: 15, bob: p * 6 * energy, lean: sway * 5 };
    default: // arms wide, waving
      return { left: 105 + sway * 25 * energy, right: 105 - sway * 25 * energy, leftBend: 30, rightBend: 30, bob: p * 8 * energy, lean: -sway * 3 };
  }
};

const rad = (deg: number) => (deg * Math.PI) / 180;

/** An arm from the shoulder: angle 0 hangs down, 180 points up; `side` -1 left, +1 right. */
const arm = (sx: number, sy: number, side: number, angle: number, bend: number) => {
  const upper = 36;
  const fore = 33;
  const a = rad(angle);
  const ex = sx + side * Math.sin(a) * upper;
  const ey = sy + Math.cos(a) * upper;
  const b = rad(angle + bend);
  const hx = ex + side * Math.sin(b) * fore;
  const hy = ey + Math.cos(b) * fore;
  return { d: `M${sx} ${sy} L${ex} ${ey} L${hx} ${hy}`, hand: { x: hx, y: hy } };
};

export type FigureProps = {
  x: number;
  y: number;
  scale?: number;
  moves?: Moves;
  hair?: Hair;
  /** Facing: 1 or -1 (mirrors the figure). */
  facing?: 1 | -1;
  fill?: string;
  /** The edge light from the beams; the hero wears a stronger one. */
  rim?: string;
  rimWidth?: number;
  /** Something held in the right hand (a phone, a glass), in figure px around the hand. */
  holding?: ReactNode;
  opacity?: number;
  /** A soft halo in this colour: the hero only (one filter per figure is costly). */
  glow?: string;
};

/** A dancer's silhouette, feet at (x, y), about 200 px tall at scale 1. Draw inside an <svg>. */
export const Figure = ({
  x,
  y,
  scale = 1,
  moves = STILL,
  hair = "short",
  facing = 1,
  fill = club.body,
  rim = "rgb(230 233 238 / 0.35)",
  rimWidth = 2.5,
  holding,
  opacity = 1,
  glow,
}: FigureProps) => {
  const { left, right, leftBend, rightBend, bob, lean } = moves;
  const knee = bob * 0.6;
  const hip = -86 + bob;
  const shoulder = -146 + bob;
  const head = -172 + bob;
  const l = arm(-19, shoulder + 4, -1, left, leftBend);
  const r = arm(19, shoulder + 4, 1, right, rightBend);
  const torso = `M-21 ${shoulder} Q0 ${shoulder - 6} 21 ${shoulder} L15 ${hip} L-15 ${hip} Z`;
  const legs = `M-9 ${hip} L${-12 - knee} ${hip + 44} L-12 0 M9 ${hip} L${12 + knee} ${hip + 44} L12 0`;
  const hairPath = {
    short: null,
    ponytail: `M10 ${head - 12} Q36 ${head - 10} 34 ${head + 14} Q32 ${head + 40} 24 ${head + 46} Q26 ${head + 22} 14 ${head + 4} Z`,
    bun: `M0 ${head - 30} m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0`,
    long: `M-16 ${head - 4} Q-20 ${head + 30} -14 ${head + 40} L14 ${head + 40} Q20 ${head + 30} 16 ${head - 4} Z`,
  }[hair];

  const limbs = (stroke: string, extra: number) => (
    <g fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d={legs} strokeWidth={15 + extra} />
      <path d={l.d} strokeWidth={11 + extra} />
      <path d={r.d} strokeWidth={11 + extra} />
    </g>
  );
  const shape = (paint: string, extra: number) => (
    <g>
      {limbs(paint, extra)}
      <path d={torso} fill={paint} stroke={paint} strokeWidth={extra} strokeLinejoin="round" />
      <circle cx={0} cy={head} r={16 + extra / 2} fill={paint} />
      {hairPath && <path d={hairPath} fill={paint} stroke={paint} strokeWidth={extra} />}
    </g>
  );

  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale * facing} ${scale}) rotate(${lean})`}
      opacity={opacity}
      style={glow ? { filter: `drop-shadow(0 0 ${6 * scale}px ${glow})` } : undefined}
    >
      {shape(rim, rimWidth * 2)}
      {shape(fill, 0)}
      {holding && <g transform={`translate(${r.hand.x} ${r.hand.y}) scale(${facing} 1)`}>{holding}</g>}
    </g>
  );
};

/** A phone in the hand, its screen lit; `label` is what the screen shows (her order number). */
export const HeldPhone = ({ lit = 1, label }: { lit?: number; label?: string }) => (
  <g>
    <circle cx={0} cy={-12} r={22} fill={club.silver} opacity={0.12 * lit} />
    <rect x={-8} y={-26} width={16} height={28} rx={3} fill="#1b1c22" />
    <rect x={-6} y={-24} width={12} height={24} rx={2} fill={label ? club.ready : club.silver} opacity={0.25 + 0.75 * lit} />
    {label && (
      <text x={0} y={-8.5} textAnchor="middle" fontFamily={fonts.display} fontWeight={700} fontSize={8} fill={club.night}>
        {label}
      </text>
    )}
  </g>
);

/** A cocktail glass: a silver-rimmed coupe, its drink lit from within. */
export const Glass = ({ color = club.cyan }: { color?: string }) => (
  <g>
    <circle cx={0} cy={-24} r={14} fill={color} opacity={0.25} />
    <path d="M-12 -30 L12 -30 L2 -14 L2 -2 L8 0 L-8 0 L-2 -2 L-2 -14 Z" fill="#d9dde3" />
    <path d="M-9.5 -28.5 L9.5 -28.5 L1.5 -16.5 L-1.5 -16.5 Z" fill={color} />
    <path d="M-12 -30 L12 -30" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
  </g>
);

type CrowdRow = { y: number; scale: number; count: number; fill: string; rim: string; energy: number; seed: number };

/** Rows of dancers, back to front: smaller, darker and slower at the back. */
export const Crowd = ({ rows }: { rows: CrowdRow[] }) => {
  const frame = useCurrentFrame();
  const { width, height } = useLayout();
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {rows.map((row, r) =>
        Array.from({ length: row.count }, (_, i) => {
          const jitter = Math.sin((i + 1) * 12.9898 + row.seed) * 0.5;
          const x = ((i + 0.5 + jitter * 0.6) / row.count) * width;
          const style = (i * 7 + row.seed) % DANCES;
          const hair = (["short", "ponytail", "long", "bun"] as const)[(i * 3 + row.seed) % 4];
          return (
            <Figure
              key={`${r}-${i}`}
              x={x}
              y={row.y + Math.abs(jitter) * 18}
              scale={row.scale * (0.92 + Math.abs(jitter) * 0.16)}
              moves={dance(frame + i * 2, style, row.energy)}
              hair={hair}
              facing={i % 2 ? 1 : -1}
              fill={row.fill}
              rim={row.rim}
              holding={style === PHONE_UP ? <HeldPhone lit={0.8} /> : undefined}
            />
          );
        }),
      )}
    </svg>
  );
};

/** Three rows of dancers sized to the frame: the dance floor, filling its lower half. */
export const useFloorRows = (energy: number) => {
  const { height, pick } = useLayout();
  return [
    { y: height * pick(0.7, 0.62), scale: pick(1.35, 1.7), count: pick(13, 6), fill: "#07070C", rim: "rgb(142 91 255 / 0.25)", energy: energy * 0.8, seed: 3 },
    { y: height * pick(0.88, 0.8), scale: pick(1.95, 2.4), count: pick(10, 5), fill: "#09090F", rim: "rgb(67 217 255 / 0.28)", energy: energy * 0.9, seed: 7 },
    { y: height * pick(1.1, 1.03), scale: pick(2.8, 3.4), count: pick(7, 4), fill: club.body, rim: "rgb(230 233 238 / 0.32)", energy, seed: 11 },
  ];
};

/** A dark floor under the captions that sit low over people. */
export const Scrim = ({ reach = 0.5 }: { reach?: number }) => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background: `linear-gradient(to top, rgb(4 4 8 / 0.94), rgb(4 4 8 / 0.7) ${reach * 55}%, transparent ${reach * 100}%)`,
    }}
  />
);

// ——— The bar ——————————————————————————————————————————————————————

/** A backlit back bar: shelves of bottles in amber, a silver counter edge, a neon name. */
export const Bar = ({ name, top, height }: { name: string; top: number; height: number }) => {
  const frame = useCurrentFrame();
  const { width } = useLayout();
  const shelves = 3;
  const bottles = Math.round(width / 46);
  const flicker = 0.92 + 0.08 * Math.sin(frame * 0.7) * Math.sin(frame * 0.13);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, height }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(color-mix(in srgb, ${club.amber} 14%, #0a0806), #050404 85%)`,
        }}
      />
      {Array.from({ length: shelves }, (_, s) => (
        <div key={s} style={{ position: "absolute", left: 0, right: 0, top: `${22 + s * 22}%`, height: "18%" }}>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: `rgb(255 200 140 / ${0.45})`, boxShadow: `0 0 24px rgb(255 180 94 / ${0.6})` }} />
          {Array.from({ length: bottles }, (_, b) => {
            const tall = 0.55 + ((b * 37 + s * 11) % 7) / 14;
            return (
              <div
                key={b}
                style={{
                  position: "absolute",
                  bottom: 3,
                  left: `${((b + 0.5) / bottles) * 100}%`,
                  width: 18,
                  height: `${tall * 100}%`,
                  borderRadius: "6px 6px 2px 2px",
                  background: `linear-gradient(rgb(255 210 150 / ${0.18}), rgb(255 160 70 / ${0.32}))`,
                  clipPath: "polygon(35% 0, 65% 0, 65% 25%, 100% 40%, 100% 100%, 0 100%, 0 40%, 35% 25%)",
                }}
              />
            );
          })}
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          top: "4%",
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: fonts.display,
          fontWeight: 600,
          fontSize: height * 0.1,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: "#fff",
          textShadow: `0 0 12px ${club.cyan}, 0 0 40px ${club.cyan}`,
          opacity: flicker,
        }}
      >
        {name}
      </div>
    </div>
  );
};

/** The counter's top: a slab with a polished silver edge, in front of everything behind the bar. */
export const Counter = ({ top, height }: { top: number; height: number }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      top,
      height,
      background: "linear-gradient(#141418, #060608)",
      borderTop: "3px solid rgb(230 233 238 / 0.55)",
      boxShadow: "0 -6px 30px rgb(255 180 94 / 0.25)",
    }}
  />
);
