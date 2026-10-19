import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { phone } from "../captures";
import { fonts } from "../brand/fonts";
import { bk, PINK_RGB, thermalPaper } from "../brand/tokens";
import { Stage } from "../kit/atmosphere";
import { Camera } from "../kit/Camera";
import { useLayout } from "../kit/layout";
import { CLAMP, HOLD_DRIFT, springs } from "../kit/motion";
import { Reveal } from "../kit/type";
import { beat } from "../timeline";
import { SALLE } from "./Salle";
import { statement, STATEMENT, TextBand } from "./styles";

/*
 * Scene 9: the restaurant's till, as it is, with the room's tablet beside
 * it; the tablet lights as the order comes in, then the kitchen printer
 * behind the wall wakes. The ticket is the one backend/app/services/tickets.py sends for this
 * order — restaurant name, table, then items by category in double size,
 * options after « » », the time at the foot — fed up out of the printer one
 * line at a time, straight from the payment: nobody keys it in again.
 */
export const KITCHEN = beat(22);
const WAKE = beat(23);
export const PRINT = WAKE + 4;
/** Frames between two printed lines. */
export const LINE_FRAMES = 3;
const DIRECT = WAKE + 6;
/** Over the ticket as it prints: nobody keys the order in again. */
const RESSAISIR = beat(25);
const TILL = beat(27);
/** As « Sans changer de caisse. » comes, the idle till lights once in white, over this many frames: it is the one left as it is, not the one that got the order. */
const TILL_GLOW_FRAMES = 14;
/** The printing printer's halo, softer than the till's glow: its reach in px, its strength; and the frames it fades out over once printed. */
const PRINTER_NEON = { blur: 10, alpha: 0.55 };
const PRINT_FADE = 10;
/** The room tablet lights this many frames before the printer wakes: the room has the order too. */
const TABLET_LEAD = 9;
/** On this beat the ticket is torn off: how far it jumps, how much it tilts, how fast. */
const TEAR = beat(30);
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
/** The wide shots: the till and the printer stay clear of the frame's edges through the hold's drift and the scene's. */
const WIDE_ZOOM = 0.88;
const TALL_WIDE_ZOOM = 0.87;
/** In the tall frame the rig sits this much lower than the ticket mid-frame, in world px: less bare counter under it, the words' band still clear. */
const TALL_RIG_DROP = 100;
/** In the tall frame, the night behind the words, down to here (fractions of the height): the wall's line stops under them. */
const TEXT_BAND = { solid: 0.2, clear: 0.27 };
/** In the tall frame the counter's front fades into the night sooner, below its names: no grey slab under the shot. */
const TALL_COUNTER_DEPTH = 380;

type Row = { text: string; size: 1 | 2 | 3; tall?: boolean; bold?: boolean; center?: boolean };

/** Word-wraps a row at the width its character size leaves on the paper; a leading space (an option's indent) stays. */
const wrap = (row: Row): Row[] => {
  const width = Math.floor(COLUMNS / row.size);
  const [first, ...words] = row.text.split(" ");
  const lines: string[] = [];
  let line = first;
  for (const word of words) {
    const next = `${line} ${word}`;
    if (next.length > width && line.trim()) {
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
  const { order, table } = phone;
  const rows: Row[] = [
    // The kitchen printer's code page has no « Ō »: the name prints as the site's title writes it.
    { text: "* BAÏ-KO *", size: 3, bold: true, center: true },
    BLANK,
    { text: `TABLE ${table}`, size: 2, bold: true, center: true },
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
  // In the tall frame, a smaller till and every piece apart: till, tablet, wall, printer side by side.
  const slot = { x: pick(820, 790), y: counterTop - PRINTER_FOOT };
  const wall = pick(540, 470);
  const tillScale = pick(1.15, 0.85);
  const till = { x: pick(190, 175), y: counterTop - TILL_FOOT };
  const tablet = pick(440, 380);
  const awake = interpolate(frame - at(WAKE), [0, 3], [0, 1], CLAMP);
  const printed = ROWS.length * LINE_FRAMES;
  const tillGlow = Math.sin(interpolate(frame - at(TILL), [0, TILL_GLOW_FRAMES], [0, 1], CLAMP) * Math.PI);
  // The printer's outline lit, a touch of the Cachet's neon, for as long as it prints — dimmed while the till glows, the one left as it is.
  const printing = interpolate(frame - at(PRINT), [0, 4, printed, printed + PRINT_FADE], [0, 1, 1, 0], CLAMP) * (1 - tillGlow);

  // On the till and the tablet, whole (in the tall frame, the printer and its name too:
  // nothing comes in cut at the frame's edge); then across the wall to the printer as it
  // wakes (in the tall frame, a little closer on all of them, the till kept in frame); then
  // back, a little above the counter, as the ticket grows (in the tall frame, centred on till
  // and printer, clear of the edges, the printed ticket mid-frame).
  const wide = pick({ x: width / 2, y: height / 2 - 120, zoom: WIDE_ZOOM }, { x: width / 2 + 35, y: slot.y - total / 2 - TALL_RIG_DROP, zoom: TALL_WIDE_ZOOM });
  const opening = pick(
    { x: (till.x + tablet) / 2, zoom: 1.15 },
    { x: (till.x - (TILL_WIDTH * tillScale) / 2 + slot.x + (paper + PRINTER_MARGIN) / 2) / 2, zoom: TALL_WIDE_ZOOM },
  );
  const shots = [
    { at: 0, value: { ...opening, y: counterTop - pick(330, 420) } },
    {
      at: at(WAKE) - 6,
      value: pick({ x: slot.x + SLOT_SHOT_SHIFT, y: slot.y - 80, zoom: 1.15 }, { ...opening, y: counterTop - 420, zoom: opening.zoom * HOLD_DRIFT }),
      config: springs.heavy,
    },
    { at: at(PRINT) + 8, value: wide, duration: printed },
    { at: at(TEAR), value: { ...wide, zoom: wide.zoom * HOLD_DRIFT }, duration: SALLE - TEAR },
  ];
  // Printed, the ticket is torn off the roll and lifts away from the slot.
  const torn = interpolate(frame - at(TEAR), [0, TEAR_FRAMES], [0, 1], { easing: Easing.out(Easing.cubic), ...CLAMP });

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
        <Worktop y={counterTop} depth={pick(900, TALL_COUNTER_DEPTH)} />
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
        <Till x={till.x} y={till.y} scale={tillScale} glow={tillGlow} />
        <ContactShadow x={tablet} y={counterTop} width={TABLET.width} />
        <Tablet x={tablet} y={counterTop} awake={interpolate(frame - at(WAKE - TABLET_LEAD), [0, 3], [0, 1], CLAMP)} />
        <Printer x={slot.x} y={slot.y} width={paper + PRINTER_MARGIN} awake={awake} glow={printing} />
        <Place x={(till.x + tablet) / 2} y={counterTop + PLACE_DROP}>Salle</Place>
        <Place x={slot.x} y={counterTop + PLACE_DROP}>Cuisine</Place>
      </Camera>
      {portrait && <TextBand {...TEXT_BAND} />}

      <AbsoluteFill
        style={{
          alignItems: portrait ? "center" : "flex-start",
          justifyContent: portrait ? "flex-start" : "center",
          // In the tall frame, above the ticket: below the counter, it ran into the names on its front.
          padding: pick("0 0 0 1180px", "170px 60px 0"),
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: portrait ? "center" : "flex-start",
            gap: "0.3em",
            ...statement,
            fontSize: pick(STATEMENT.landscape * 0.82, STATEMENT.portrait * 0.82),
            textAlign: portrait ? "center" : "left",
          }}
        >
          {/* One line each in the tall frame where it fits, where the band above the ticket is short. */}
          <Reveal fade delay={at(DIRECT)} stagger={2} style={{ display: "flex", flexDirection: "column" }}>
            {portrait ? ["Direct en cuisine."] : ["Direct", "en cuisine."]}
          </Reveal>
          <Reveal fade delay={at(RESSAISIR)} stagger={2} style={{ display: "flex", flexDirection: "column" }}>
            {["Rien à ressaisir", "pour le serveur."]}
          </Reveal>
          <Reveal fade delay={at(TILL)} stagger={2} style={{ display: "flex", flexDirection: "column", color: bk.pink }}>
            {portrait ? ["Sans changer de caisse."] : ["Sans changer", "de caisse."]}
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
      fontFamily: fonts.sans,
      fontWeight: 700,
      fontSize: 24,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: bk.muted,
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

/** The wall between the room and the kitchen, drawn in line. */
const Wall = ({ x, bottom }: { x: number; bottom: number }) => (
  <div style={{ position: "absolute", left: x - 2, top: bottom - 2000, width: 0, height: 2000, borderLeft: `${INK_WIDTH}px solid ${INK}`, opacity: 0.55 }} />
);

/** The counter the till and the printer stand on: its edge in the brand's pink, then its front, fading over `depth` px. */
const Worktop = ({ y, depth }: { y: number; depth: number }) => (
  <div
    style={{
      position: "absolute",
      left: -2000,
      right: -2000,
      top: y,
      height: depth,
      borderTop: `3px solid rgb(${PINK_RGB} / 0.55)`,
      background: "linear-gradient(180deg, #1E1F22, #121315 45%, transparent)",
    }}
  />
);

/** The line drawings' ink, on the dark of the scene. */
const INK = "#EDEBE4";
const INK_RGB = "237 235 228";
const INK_WIDTH = 3;
const FILL = "#17181B";

/** A kitchen ticket printer, seen from the front and drawn in line: top cover, paper exit, feed button, light. */
const Printer = ({ x, y, width, awake, glow }: { x: number; y: number; width: number; awake: number; glow: number }) => {
  const frame = useCurrentFrame();
  const blink = awake * (0.5 + ((Math.sin(frame * 0.5) + 1) / 2) * 0.5);
  const height = 230;
  const cover = 70;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", left: x - width / 2, top: y - 26, overflow: "visible", filter: glow > 0 ? `drop-shadow(0 0 ${PRINTER_NEON.blur * glow}px rgb(${PINK_RGB} / ${PRINTER_NEON.alpha * glow}))` : undefined }}
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
        fill={awake > 0 ? bk.pink : "#3A3B3E"}
        opacity={0.4 + blink * 0.6}
        style={{ filter: `drop-shadow(0 0 ${6 + blink * 8}px rgb(${PINK_RGB} / ${0.8 * awake}))` }}
      />
    </svg>
  );
};

/** The room tablet on its stand: screen size, neck, foot. */
const TABLET = { width: 150, height: 105, neck: 40, foot: 80 };

/**
 * Ominin's room tablet, drawn in line on its stand beside the till: dim,
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
      <rect x={-width / 2 + 16} y={top + 16} width={36} height={height - 32} rx={4} fill={bk.pink} stroke="none" opacity={awake} />
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
      filter: `drop-shadow(0 0 ${14 * glow}px rgb(${INK_RGB} / ${0.85 * glow}))`,
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
