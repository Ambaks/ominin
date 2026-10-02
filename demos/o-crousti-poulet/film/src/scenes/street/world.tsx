import type { ReactNode } from "react";
import { random, useCurrentFrame, useVideoConfig } from "remotion";
import QRCode from "qrcode";
import { fonts } from "../../brand/fonts";
import { Lockup } from "../../brand/marks";
import { ocp, ominin } from "../../brand/tokens";

/*
 * The street, in world px: the shopfront as a line drawing (lit sign,
 * window with the swirl film and its QR sticker, door, the yellow balloons of
 * an opening) and the queue of capsule figures on the pavement.
 */
export const GROUND = 1100;
const FACADE = { left: 100, right: 1300, top: 250 };
const SIGN_BOTTOM = 440;
const WINDOW = { x: 170, y: 500, w: 640 };
const DOOR = { x: 880, y: 500, w: 340 };
export const STICKER = { x: WINDOW.x + WINDOW.w / 2, y: 800, w: 300, h: 360 };
export const QR = { size: 220, top: 38 };
const QR_MODULES = QRCode.create(ominin.url, { errorCorrectionLevel: "M" }).modules;
/** World point at the center of the QR's top-left eye: the camera flies into it. */
export const QR_EYE = {
  x: STICKER.x - QR.size / 2 + (3.5 * QR.size) / QR_MODULES.size,
  y: STICKER.y - STICKER.h / 2 + QR.top + (3.5 * QR.size) / QR_MODULES.size,
};

/** The line drawings' ink. */
export const LINE = "#EDEBE4";
const STROKE = 4;

export const PEOPLE = 18;
/** The last in line: the one who gives up. */
export const LEAVER = PEOPLE - 1;
/** The one who gives up, greyed out. */
export const GREY = "#5C5F64";
const QUEUE_START = 1400;
const SPACING = 150;
/** A capsule figure: head, gap, body. */
const FIGURE = { width: 100, body: 280, head: 84, gap: 18 };
export const FIGURE_HEIGHT = FIGURE.body + FIGURE.gap + FIGURE.head;
const TONES = ["#ECEAE4", "#E2DFD7", "#F3F1EB", "#D8D5CC"];

export const personX = (i: number) => QUEUE_START + i * SPACING + (random(`x${i}`) - 0.5) * 44;
export const personScale = (i: number) => 0.88 + random(`s${i}`) * 0.2;
export const personTone = (i: number) => TONES[Math.floor(random(`t${i}`) * TONES.length)];

/** Swirls of the shop-window film: wide gold waves on white. */
export const Swirls = ({ width, height, id }: { width: number; height: number; id: string }) => (
  <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", inset: 0 }}>
    <defs>
      <clipPath id={id}>
        <rect width={width} height={height} />
      </clipPath>
    </defs>
    <rect width={width} height={height} fill="#F6F4EE" />
    <g clipPath={`url(#${id})`} fill="none" stroke={ocp.swirl} strokeWidth={height * 0.1} strokeLinecap="round">
      {[0.12, 0.5, 0.88].map((row, i) => {
        const y = height * row;
        const a = height * 0.12;
        return (
          <path
            key={row}
            d={`M ${-width * 0.2} ${y + a} C ${width * 0.2} ${y - a * 2}, ${width * 0.45} ${y + a * 2.2}, ${width * 0.7} ${y} S ${width * 1.1} ${y - a * 1.5}, ${width * 1.3} ${y + (i % 2 ? a : -a)}`}
          />
        );
      })}
    </g>
  </svg>
);

/** A QR code with round modules and rounded finder eyes, in the film's ink. */
const Qr = ({ size }: { size: number }) => {
  const modules = QR_MODULES;
  const n = modules.size;
  const color = ocp.black;
  const eye = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const dots: string[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (modules.get(r, c) && !eye(r, c)) dots.push(`M${c + 0.08} ${r + 0.5}a0.42 0.42 0 1 0 0.84 0a0.42 0.42 0 1 0 -0.84 0`);
    }
  }
  const eyes = [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="geometricPrecision">
      <path d={dots.join("")} fill={color} />
      {eyes.map(([r, c]) => (
        <g key={`${r}-${c}`} fill={color}>
          <path
            fillRule="evenodd"
            d={`M${c + 1.6} ${r}h3.8a1.6 1.6 0 0 1 1.6 1.6v3.8a1.6 1.6 0 0 1-1.6 1.6h-3.8a1.6 1.6 0 0 1-1.6-1.6v-3.8a1.6 1.6 0 0 1 1.6-1.6z M${c + 1.9} ${r + 1}h3.2a0.9 0.9 0 0 1 0.9 0.9v3.2a0.9 0.9 0 0 1-0.9 0.9h-3.2a0.9 0.9 0 0 1-0.9-0.9v-3.2a0.9 0.9 0 0 1 0.9-0.9z`}
          />
          <rect x={c + 2} y={r + 2} width={3} height={3} rx={0.8} />
        </g>
      ))}
    </svg>
  );
};

/** The sticker on the window: the QR code and its one line. */
export const Sticker = ({ scale = 1 }: { scale?: number }) => (
  <div
    style={{
      width: STICKER.w * scale,
      height: STICKER.h * scale,
      borderRadius: 26 * scale,
      background: "#fff",
      boxShadow: `0 ${6 * scale}px ${24 * scale}px rgb(0 0 0 / 0.18)`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: QR.top * scale,
      gap: 26 * scale,
    }}
  >
    <Qr size={QR.size * scale} />
    <div
      style={{
        fontFamily: fonts.poppins,
        fontWeight: 800,
        fontSize: 30 * scale,
        letterSpacing: "-0.01em",
        color: ocp.black,
        display: "flex",
        alignItems: "center",
        gap: 10 * scale,
      }}
    >
      <span style={{ width: 14 * scale, height: 14 * scale, borderRadius: "50%", background: ocp.yellow, boxShadow: `0 0 0 ${2 * scale}px ${ocp.black}` }} />
      Commandez ici.
    </div>
  </div>
);

const Balloon = ({ x, y, tieX, tieY, size, color, phase }: { x: number; y: number; tieX: number; tieY: number; size: number; color: string; phase: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * Math.PI * 2 * 0.35 + phase;
  const bx = x + Math.sin(t) * 6;
  const by = y + Math.cos(t * 0.8) * 5;
  const w = size;
  const h = size * 1.18;
  return (
    <>
      <path
        d={`M ${tieX} ${tieY} Q ${(tieX + bx) / 2 + Math.sin(t) * 14} ${(tieY + by + h / 2) / 2}, ${bx} ${by + h / 2 + 10}`}
        stroke={LINE}
        strokeWidth={2}
        fill="none"
        opacity={0.8}
      />
      <g stroke="none">
        <path d={`M ${bx - 8} ${by + h / 2 + 12} L ${bx + 8} ${by + h / 2 + 12} L ${bx} ${by + h / 2} Z`} fill={color} />
        <ellipse cx={bx} cy={by} rx={w / 2} ry={h / 2} fill={color} />
        <ellipse cx={bx - w * 0.16} cy={by - h * 0.2} rx={w * 0.1} ry={h * 0.14} fill="#fff" opacity={0.45} />
      </g>
    </>
  );
};

const BALLOON_COLORS = [ocp.yellow, ocp.gold, ocp.lemon, ocp.yellow, ocp.gold];

const Bunch = ({ tieX, tieY, flip }: { tieX: number; tieY: number; flip: number }) => (
  <>
    {[
      [-58, -300, 86],
      [12, -336, 92],
      [74, -276, 82],
      [-14, -228, 78],
      [46, -224, 74],
    ].map(([dx, dy, size], i) => (
      <Balloon
        key={i}
        x={tieX + dx * flip}
        y={tieY + dy}
        tieX={tieX}
        tieY={tieY}
        size={size}
        color={BALLOON_COLORS[i]}
        phase={i * 1.7 + flip}
      />
    ))}
  </>
);

export const Shopfront = () => {
  // Warm light from inside: the shop is open.
  const glass = "linear-gradient(180deg, #2E2817, #1A1A18 55%, #141517)";
  const film = (x: number, y: number, w: number, h: number, id: string) => (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, overflow: "hidden" }}>
      <Swirls width={w} height={h} id={id} />
    </div>
  );
  const windowH = GROUND - WINDOW.y;
  const filmTop = WINDOW.y + windowH * 0.36;
  return (
    <div style={{ position: "absolute", left: 0, top: 0 }}>
      <div style={{ position: "absolute", left: WINDOW.x, top: WINDOW.y, width: WINDOW.w, height: windowH, background: glass }} />
      {film(WINDOW.x, filmTop, WINDOW.w, GROUND - filmTop, "window-film")}
      <div style={{ position: "absolute", left: DOOR.x, top: DOOR.y, width: DOOR.w, height: windowH, background: glass }} />
      {film(DOOR.x + 30, WINDOW.y + windowH * 0.62, DOOR.w - 60, windowH * 0.38 - 30, "door-film")}
      <div
        style={{
          position: "absolute",
          left: FACADE.left,
          top: FACADE.top,
          width: FACADE.right - FACADE.left,
          height: SIGN_BOTTOM - FACADE.top,
          background: "#0E0F11",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ marginTop: 18 }}>
          <Lockup size={66} />
        </div>
      </div>
      <div style={{ position: "absolute", left: STICKER.x - STICKER.w / 2, top: STICKER.y - STICKER.h / 2 }}>
        <Sticker />
      </div>
      <svg
        width={FACADE.right + 200}
        height={GROUND + 200}
        style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
        fill="none"
        stroke={LINE}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={`M ${FACADE.left} ${GROUND} V ${FACADE.top} H ${FACADE.right} V ${GROUND}`} />
        <path d={`M ${FACADE.left - 30} ${FACADE.top - 22} H ${FACADE.right + 30}`} />
        <path d={`M ${FACADE.left} ${SIGN_BOTTOM} H ${FACADE.right}`} />
        <rect x={WINDOW.x} y={WINDOW.y} width={WINDOW.w} height={windowH} />
        <rect x={DOOR.x} y={DOOR.y} width={DOOR.w} height={windowH} />
        <rect x={DOOR.x + 30} y={DOOR.y + 30} width={DOOR.w - 60} height={windowH - 60} strokeWidth={2.5} />
        <path d={`M ${DOOR.x + 58} ${DOOR.y + windowH * 0.48} v 70`} strokeWidth={7} />
        <path d={`M ${WINDOW.x + 40} ${WINDOW.y + 130} l 100 -100 M ${WINDOW.x + 40} ${WINDOW.y + 200} l 170 -170`} strokeWidth={2} opacity={0.18} />
        <Bunch tieX={FACADE.left + 40} tieY={WINDOW.y + 380} flip={1} />
        <Bunch tieX={DOOR.x + DOOR.w + 24} tieY={WINDOW.y + 380} flip={1} />
      </svg>
    </div>
  );
};

/** The pavement: a long kerb line and the street edge below it. */
export const Pavement = ({ length }: { length: number }) => (
  <svg width={length} height={GROUND + 120} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
    <path d={`M -400 ${GROUND} H ${length}`} stroke={LINE} strokeWidth={STROKE} />
    <path d={`M -400 ${GROUND + 90} H ${length}`} stroke={LINE} strokeWidth={2} opacity={0.35} />
  </svg>
);

type FigureProps = {
  x: number;
  scale: number;
  tone: string;
  /** Vertical offset in px (hops, idle breathing). */
  lift?: number;
  /** Lean in degrees, pivoting on the feet. */
  lean?: number;
  opacity?: number;
  /** A phone held up at the chest, its screen lit. */
  phone?: boolean;
  /** How far up from the feet the brand's yellow has filled the figure (0 → 1): no colour in between. */
  fill?: number;
};

/** A ring of the scene's black around each shape: overlapping figures stay apart. */
const SEPARATE = `0 0 0 7px ${ocp.black}`;

export const Figure = ({ x, scale, tone, lift = 0, lean = 0, opacity = 1, phone = false, fill = 0 }: FigureProps) => {
  const w = FIGURE.width * scale;
  const h = FIGURE_HEIGHT * scale;
  // The fill's level, in px from the feet, as a share of each part's own height.
  const level = fill * h;
  const bodyFill = Math.min(1, level / (FIGURE.body * scale)) * 100;
  const headFill = Math.max(0, Math.min(1, (level - (FIGURE.body + FIGURE.gap) * scale) / (FIGURE.head * scale))) * 100;
  const filled = (share: number) => `linear-gradient(0deg, ${ocp.yellow} ${share}%, transparent ${share}%)`;
  return (
    <div
      style={{
        position: "absolute",
        left: x - w / 2,
        top: GROUND - h - lift,
        width: w,
        height: h,
        opacity,
        transformOrigin: "50% 100%",
        rotate: `${lean}deg`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: (w - FIGURE.head * scale) / 2,
          top: 0,
          width: FIGURE.head * scale,
          height: FIGURE.head * scale,
          borderRadius: "50%",
          background: `${filled(headFill)}, ${tone}`,
          boxShadow: SEPARATE,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: w,
          height: FIGURE.body * scale,
          borderRadius: w / 2,
          background: `${filled(bodyFill)}, linear-gradient(160deg, ${tone}, color-mix(in srgb, ${tone} 82%, black))`,
          boxShadow: SEPARATE,
        }}
      />
      {phone && (
        <div
          style={{
            position: "absolute",
            left: w * 0.52,
            top: h * 0.4,
            width: w * 0.36,
            height: w * 0.62,
            borderRadius: w * 0.08,
            padding: w * 0.035,
            background: "#16171A",
            rotate: "-10deg",
            boxShadow: `0 0 ${w * 0.4}px rgb(247 238 33 / 0.35)`,
          }}
        >
          <div style={{ width: "100%", height: "100%", borderRadius: w * 0.05, background: "#FFFEF4" }} />
        </div>
      )}
    </div>
  );
};

export const COIN_RADIUS = 110;

/** A sale, as a coin on the pavement: lost when one leaves, made when one stays. */
/**
 * A coin on the ground at `x`, or `rise` px above it; `pop` scales it and
 * hops it `hop` px while it grows; `ring` px of the scene's black around it
 * keep it apart from what it is held against.
 */
export const Coin = ({ x, pop, turn, label, rise = 0, hop = 120, ring = 0 }: { x: number; pop: number; turn: number; label: ReactNode; rise?: number; hop?: number; ring?: number }) => (
  <div
    style={{
      position: "absolute",
      left: x - COIN_RADIUS,
      top: GROUND - COIN_RADIUS * 2 - rise - Math.sin(Math.min(1, pop) * Math.PI) * hop,
      width: COIN_RADIUS * 2,
      height: COIN_RADIUS * 2,
      borderRadius: "50%",
      background: `radial-gradient(circle at 35% 30%, ${ocp.lemon}, ${ocp.yellow} 55%, ${ocp.gold})`,
      boxShadow: `inset 0 0 0 10px ${ocp.gold}, 0 0 0 ${ring}px ${ocp.black}, 0 10px 26px rgb(0 0 0 / 0.45)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: Math.min(1, pop * 2),
      scale: String(pop),
      rotate: `${turn}rad`,
      fontFamily: fonts.anton,
      fontSize: 62,
      color: ocp.black,
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </div>
);
