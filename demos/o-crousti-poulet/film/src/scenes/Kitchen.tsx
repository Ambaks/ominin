import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import profile from "../../../profile.json";
import { phone } from "../captures";
import { fonts } from "../brand/fonts";
import { ocp, thermalPaper } from "../brand/tokens";
import { Stage } from "../kit/atmosphere";
import { Camera } from "../kit/Camera";
import { useLayout } from "../kit/layout";
import { HOLD_DRIFT, springs } from "../kit/motion";
import { Reveal } from "../kit/type";
import { beat } from "../timeline";
import { COUNTER } from "./Counter";
import { LINE } from "./street/world";
import { STATEMENT } from "./styles";

/*
 * Scene 9: the shop's till, as it is, with the counter tablet beside it;
 * then the kitchen printer behind the wall wakes, and the tablet with it. The ticket is the one backend/app/services/tickets.py sends for
 * this order — restaurant name, number, then items by category in double
 * size, options after « » », the time at the foot — fed up out of the
 * printer one line at a time.
 */
export const KITCHEN = beat(36);
const WAKE = beat(37);
export const PRINT = WAKE + 4;
/** Frames between two printed lines. */
export const LINE_FRAMES = 3;
const DIRECT = WAKE + 6;
const TILL = beat(39);
/** As « Sans changer de caisse. » comes, the idle till glows once, over this many frames: it is the one left as it is. */
const TILL_GLOW_FRAMES = 14;
/** The counter tablet lights this many frames before the printer wakes: the order reaches the counter too. */
const TABLET_LEAD = 9;
/** On this beat the ticket is torn off: how far it jumps, how much it tilts, how fast. */
const TEAR = beat(43);
const TEAR_LIFT = 30;
const TEAR_TILT = 3;
const TEAR_FRAMES = 3;

const COLUMNS = 42;
/** The printer's body beyond the paper's width, and its foot below the slot. */
const PRINTER_MARGIN = 60;
const PRINTER_FOOT = 204;
/** The till's width, and its foot below its anchor point. */
const TILL_WIDTH = 280;
const TILL_FOOT = 190;
/** Depth of the paper's torn edge, in px. */
const TORN_EDGE = 7;
/** The shot on the printer is centered this far right of its slot: the paper rising from it stays clear of the text. */
const SLOT_SHOT_SHIFT = 120;
/** Each side of the wall named on the counter's front, this far below its edge. */
const PLACE_DROP = 44;

type Row = { text: string; size: 1 | 2 | 3; tall?: boolean; bold?: boolean; center?: boolean };

/** Word-wraps a row at the width its character size leaves on the paper. */
const wrap = (row: Row): Row[] => {
  const width = Math.floor(COLUMNS / row.size);
  const lines: string[] = [];
  let line = "";
  for (const word of row.text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width && line) {
      lines.push(line);
      line = row.center ? word : `   ${word}`;
    } else line = next;
  }
  lines.push(line);
  return lines.map((text) => ({ ...row, text }));
};

const RULE: Row = { text: "-".repeat(COLUMNS), size: 1 };
const BLANK: Row = { text: "", size: 1 };

export const ROWS: Row[] = (() => {
  const { order, orderNumber } = phone;
  const rows: Row[] = [
    { text: `* ${profile.name.toUpperCase()} *`, size: 3, bold: true, center: true },
    BLANK,
    { text: `N° ${orderNumber}`, size: 3, bold: true, center: true },
    RULE,
    BLANK,
  ];
  const categories = [...new Set(order.items.map((item) => item.category))];
  for (const category of categories) {
    rows.push({ text: category.toUpperCase(), size: 1, tall: true, bold: true }, BLANK);
    for (const item of order.items.filter((entry) => entry.category === category)) {
      rows.push({ text: `1 × ${item.name}`, size: 2, bold: true });
      // The colon stays with its group when a line wraps.
      for (const { group, choice } of item.options) rows.push({ text: ` » ${group}\u00a0: ${choice}`, size: 2 });
      rows.push(BLANK);
    }
  }
  rows.push(RULE, { text: order.at, size: 1, center: true });
  return rows.flatMap(wrap);
})();

export const Kitchen = ({ from }: { from: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height, portrait, pick } = useLayout();
  const at = (abs: number) => abs - from;

  const paper = pick(460, 520);
  const unit = (paper - 48) / COLUMNS;
  const rowHeight = (row: Row) => unit * 1.6 * (row.tall ? 2 : row.size);
  const heights = ROWS.map(rowHeight);
  const total = heights.reduce((a, b) => a + b, 0) + 70;

  // The paper advances a line at a time, a short step each.
  const fed = heights.reduce(
    (sum, h, i) => sum + h * spring({ frame: frame - at(PRINT) - i * LINE_FRAMES, fps, config: springs.snappy, durationInFrames: 5 }),
    0,
  );
  const lead = 40 * spring({ frame: frame - at(PRINT) + 4, fps, config: springs.smooth, durationInFrames: 8 });
  // The till and the tablet at the front counter, a wall, the printer in the kitchen behind it.
  const counterTop = pick(820, 1200);
  const slot = { x: pick(820, 770), y: counterTop - PRINTER_FOOT };
  const wall = pick(540, 462);
  const tillScale = pick(1.15, 0.95);
  const till = { x: pick(190, 150), y: counterTop - TILL_FOOT };
  const tablet = pick(440, 368);
  const awake = interpolate(frame - at(WAKE), [0, 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // On the till and the tablet, whole; then across the wall to the printer as it wakes;
  // then back, a little above the counter, as the ticket grows.
  const wide = { x: width / 2, y: height / 2 - pick(120, 160), zoom: pick(0.92, 0.95) };
  const shots = [
    { at: 0, value: { x: (till.x + tablet) / 2, y: counterTop - pick(330, 420), zoom: 1.15 } },
    { at: at(WAKE) - 6, value: { x: slot.x + pick(SLOT_SHOT_SHIFT, 0), y: slot.y - 80, zoom: 1.15 }, config: springs.heavy },
    { at: at(PRINT) + 8, value: wide, duration: ROWS.length * LINE_FRAMES },
    { at: at(TEAR), value: { ...wide, zoom: wide.zoom * HOLD_DRIFT }, duration: COUNTER - TEAR },
  ];
  // Printed, the ticket is torn off the roll and lifts away from the slot.
  const torn = interpolate(frame - at(TEAR), [0, TEAR_FRAMES], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Stage>
      <Camera shots={shots}>
        <div
          style={{
            position: "absolute",
            left: till.x - 500,
            top: counterTop - 900,
            width: slot.x - till.x + 1000,
            height: 1100,
            // The key light, from the top left of the counter.
            background: "radial-gradient(closest-side at 35% 40%, rgb(255 244 214 / 0.16), rgb(255 244 214 / 0.05) 60%, transparent)",
          }}
        />
        <Worktop y={counterTop} />
        <Wall x={wall} bottom={counterTop} />
        <ContactShadow x={till.x} y={counterTop} width={TILL_WIDTH * tillScale} />
        <ContactShadow x={slot.x} y={counterTop} width={paper + PRINTER_MARGIN} />
        <div
          style={{
            position: "absolute",
            left: slot.x - paper / 2,
            top: slot.y - fed - lead,
            width: paper,
            height: total,
            clipPath: `inset(0 0 ${Math.max(0, total - fed - lead)}px 0)`,
            translate: `0 ${-torn * TEAR_LIFT}px`,
            rotate: `${-torn * TEAR_TILT}deg`,
            // Fed out of the cover, the paper leans back a little.
            transformOrigin: "50% 100%",
            transform: "perspective(1600px) rotateX(9deg)",
            background: thermalPaper,
            boxShadow: "0 30px 60px rgb(0 0 0 / 0.45)",
            // Torn off the roll: a serrated top edge.
            mask: `conic-gradient(from 135deg at top, transparent, black 1deg 89deg, transparent 90deg) 0 0 / ${TORN_EDGE * 2}px ${TORN_EDGE}px repeat-x, linear-gradient(black, black) 0 ${TORN_EDGE}px / 100% 100% no-repeat`,
            padding: "30px 24px",
            color: "#1B1B1D",
            fontFamily: fonts.mono,
          }}
        >
          {ROWS.map((row, i) => (
            <div
              key={i}
              style={{
                height: heights[i],
                display: "flex",
                alignItems: "center",
                justifyContent: row.center ? "center" : "flex-start",
                whiteSpace: "pre",
                fontSize: (unit / 0.6) * row.size,
                fontWeight: row.bold ? 700 : 500,
                letterSpacing: 0,
                transform: row.tall ? "scaleY(2)" : undefined,
                opacity: 0.92,
              }}
            >
              {row.text}
            </div>
          ))}
        </div>
        <Till x={till.x} y={till.y} scale={tillScale} glow={Math.sin(interpolate(frame - at(TILL), [0, TILL_GLOW_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * Math.PI)} />
        <ContactShadow x={tablet} y={counterTop} width={TABLET.width} />
        <Tablet x={tablet} y={counterTop} awake={interpolate(frame - at(WAKE - TABLET_LEAD), [0, 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
        <Printer x={slot.x} y={slot.y} width={paper + PRINTER_MARGIN} awake={awake} />
        <Place x={(till.x + tablet) / 2} y={counterTop + PLACE_DROP}>Comptoir</Place>
        <Place x={slot.x} y={counterTop + PLACE_DROP}>Cuisine</Place>
      </Camera>

      <AbsoluteFill
        style={{
          alignItems: portrait ? "center" : "flex-start",
          justifyContent: portrait ? "flex-end" : "center",
          // In the tall frame, low enough to clear the names on the counter.
          padding: pick("0 0 0 1180px", "0 60px 100px"),
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: portrait ? "center" : "flex-start",
            gap: "0.3em",
            fontFamily: fonts.poppins,
            fontWeight: 800,
            fontSize: pick(STATEMENT.landscape, STATEMENT.portrait),
            lineHeight: 1.08,
            letterSpacing: "-0.025em",
            color: ocp.white,
            textAlign: portrait ? "center" : "left",
          }}
        >
          <Reveal fade delay={at(DIRECT)} stagger={2} style={{ display: "flex", flexDirection: "column" }}>
            {["Direct", "en cuisine."]}
          </Reveal>
          <Reveal fade delay={at(TILL)} stagger={2} style={{ display: "flex", flexDirection: "column", color: ocp.yellow }}>
            {["Sans changer", "de caisse."]}
          </Reveal>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

/** Where a thing stands, in small capitals on the counter's front. */
const Place = ({ x, y, children }: { x: number; y: number; children: string }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      translate: "-50% 0",
      fontFamily: fonts.poppins,
      fontWeight: 600,
      fontSize: 24,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: ocp.muted,
    }}
  >
    {children}
  </div>
);

/** Soft shade where an object meets the counter. */
const ContactShadow = ({ x, y, width }: { x: number; y: number; width: number }) => (
  <div
    style={{
      position: "absolute",
      left: x - width * 0.55,
      top: y - 14,
      width: width * 1.1,
      height: 28,
      borderRadius: "50%",
      background: "radial-gradient(closest-side, rgb(0 0 0 / 0.7), transparent)",
    }}
  />
);

/** The wall between the front counter and the kitchen, drawn like the street. */
const Wall = ({ x, bottom }: { x: number; bottom: number }) => (
  <div style={{ position: "absolute", left: x - 2, top: bottom - 2000, width: 0, height: 2000, borderLeft: `${INK_WIDTH}px solid ${INK}`, opacity: 0.55 }} />
);

/** The counter the till and the printer stand on: its edge in the brand's yellow, then shade. */
const Worktop = ({ y }: { y: number }) => (
  <div
    style={{
      position: "absolute",
      left: -2000,
      right: -2000,
      top: y,
      height: 900,
      borderTop: `3px solid rgb(247 238 33 / 0.5)`,
      background: "linear-gradient(180deg, #1E1F22, #121315 45%, transparent)",
    }}
  />
);

/** Drawn like the street: its ink, on the dark of the scene. */
const INK = LINE;
const INK_WIDTH = 3;
const FILL = "#17181B";

/** A kitchen ticket printer, seen from the front and drawn in line: top cover, paper exit, feed button, light. */
const Printer = ({ x, y, width, awake }: { x: number; y: number; width: number; awake: number }) => {
  const frame = useCurrentFrame();
  const blink = awake * (0.5 + ((Math.sin(frame * 0.5) + 1) / 2) * 0.5);
  const height = 230;
  const cover = 70;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", left: x - width / 2, top: y - 26, overflow: "visible" }}
      stroke={INK}
      strokeWidth={INK_WIDTH}
      strokeLinejoin="round"
    >
      <rect x={0} y={cover - 8} width={width} height={height - cover + 8} rx={24} fill={FILL} />
      <path d={`M 18 ${cover} V 30 Q 18 0 50 0 H ${width - 50} Q ${width - 18} 0 ${width - 18} 30 V ${cover}`} fill={FILL} />
      <rect x={60} y={22} width={width - 120} height={10} rx={5} fill="#050506" />
      <path d={`M 40 ${cover + 150} H ${width - 40}`} strokeOpacity={0.35} />
      <circle cx={width - 68} cy={cover + 58} r={20} fill={FILL} />
      <circle
        cx={width - 116}
        cy={cover + 58}
        r={7}
        stroke="none"
        fill={awake > 0 ? ocp.yellow : "#3A3B3E"}
        opacity={0.4 + blink * 0.6}
        style={{ filter: `drop-shadow(0 0 ${6 + blink * 8}px rgb(247 238 33 / ${0.8 * awake}))` }}
      />
    </svg>
  );
};

/** The counter tablet on its stand: screen size, neck, foot. */
const TABLET = { width: 150, height: 105, neck: 40, foot: 80 };

/**
 * Ominin's counter tablet, drawn in line on its stand beside the till: dim,
 * then lit as the order comes in, a card for it on its screen.
 */
const Tablet = ({ x, y, awake }: { x: number; y: number; awake: number }) => {
  const { width, height, neck, foot } = TABLET;
  const top = -(height + neck);
  return (
    <svg
      width={width}
      height={height + neck}
      viewBox={`${-width / 2} ${top} ${width} ${height + neck}`}
      style={{ position: "absolute", left: x - width / 2, top: y + top, overflow: "visible" }}
      stroke={INK}
      strokeWidth={INK_WIDTH}
      strokeLinejoin="round"
    >
      <path d={`M 0 ${-neck} V 0 M ${-foot / 2} 0 H ${foot / 2}`} />
      <rect x={-width / 2} y={top} width={width} height={height} rx={10} fill={FILL} />
      <rect x={-width / 2 + 8} y={top + 8} width={width - 16} height={height - 16} rx={4} fill={awake > 0 ? "#2A2C31" : "#1C232C"} strokeOpacity={0.45} />
      <rect x={-width / 2 + 16} y={top + 16} width={36} height={height - 32} rx={4} fill={ocp.yellow} stroke="none" opacity={awake} />
    </svg>
  );
};

/**
 * The shop's own till, as it is, drawn in line: a POS screen on its stand
 * over the cash drawer, idle beside the printer — nothing on it changes.
 */
const Till = ({ x, y, scale, glow }: { x: number; y: number; scale: number; glow: number }) => (
  <svg
    width={TILL_WIDTH}
    height={440}
    viewBox={`0 0 ${TILL_WIDTH} 440`}
    style={{
      position: "absolute",
      left: x - TILL_WIDTH / 2,
      top: y - 250,
      overflow: "visible",
      scale: String(scale),
      filter: `drop-shadow(0 0 ${14 * glow}px rgb(247 238 33 / ${0.85 * glow}))`,
      transformOrigin: `50% ${TILL_FOOT + 250}px`,
    }}
    stroke={INK}
    strokeWidth={INK_WIDTH / scale}
    strokeLinejoin="round"
  >
    <rect x={120} y={190} width={40} height={115} fill={FILL} />
    <rect x={0} y={0} width={TILL_WIDTH} height={200} rx={20} fill={FILL} />
    {/* Idle: the screen dimly lit, nothing on it changes. */}
    <rect x={16} y={16} width={TILL_WIDTH - 32} height={168} rx={8} fill="#1C232C" strokeOpacity={0.45} />
    <rect x={10} y={300} width={TILL_WIDTH - 20} height={140} rx={18} fill={FILL} />
    <path d={`M 40 360 H ${TILL_WIDTH - 40}`} strokeOpacity={0.5} />
  </svg>
);
