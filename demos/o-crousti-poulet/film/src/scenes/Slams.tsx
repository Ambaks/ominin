import type { ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { oCroustiPoulet } from "../../../../../frontend/lib/demo/reseau/data";
import { network, phone } from "../captures";
import { fonts } from "../brand/fonts";
import { ocp } from "../brand/tokens";
import { Stage } from "../kit/atmosphere";
import { useLayout } from "../kit/layout";
import { springs } from "../kit/motion";
import { Counter } from "../kit/type";
import { beat } from "../timeline";
import { euros, MENU_SOLO } from "./street/Street";
import { CLAIM } from "./styles";
import { Coin, COIN_RADIUS, Figure, FIGURE_HEIGHT, GROUND } from "./street/world";

/** Scene 13: three claims, one per slam on the beat, each over what backs it. */
export const SLAMS = [beat(72), beat(75), beat(78)];
const END = beat(82);

/** Frames after the slam the proof rises in. */
const PROOF_DELAY = 2;
/** How much closer each claim comes over its slam. */
const DRIFT = 0.03;
const SETTLE = { from: 1.06, frames: 4 };
/** Where the claims' last line sits, and the line their proofs center on, in px from the top. */
const GRID = { landscape: { claimBottom: 430, proof: 720 }, portrait: { claimBottom: 820, proof: 1250 } };

/** The till hours the network view says QR orders freed over the day: its size, its label's, and the frames it counts up in. */
const FREED = { size: { landscape: 220, portrait: 200 }, label: { landscape: 40, portrait: 40 }, count: 14 };

const Freed = () => {
  const { pick } = useLayout();
  const size = pick(FREED.size.landscape, FREED.size.portrait);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: size * 0.12, fontFamily: fonts.anton, fontSize: size, lineHeight: 1, color: ocp.yellow }}>
        <Approx size={size} />
        <span>
          <Counter to={Number(network.freed)} delay={PROOF_DELAY} duration={FREED.count} />
          {"\u202fh"}
        </span>
      </div>
      <div style={{ marginTop: size * 0.08, fontFamily: fonts.poppins, fontWeight: 600, fontSize: pick(FREED.label.landscape, FREED.label.portrait), color: ocp.muted }}>
        de caisse libérées sur la journée
      </div>
      {/* The figure is the network view's: a simulation, said so here too. */}
      <div style={{ marginTop: 20, fontFamily: fonts.poppins, fontWeight: 600, fontSize: pick(24, 28), letterSpacing: "0.02em", color: ocp.muted, textAlign: "center" }}>
        {`Simulation · ${oCroustiPoulet.restaurants.length} restaurants · hypothèse ${network.share} de commandes QR`}
      </div>
    </div>
  );
};

/** « ≈ », drawn: the brand's fonts are loaded without it. */
const Approx = ({ size }: { size: number }) => (
  <svg width={size * 0.56} height={size * 0.52} viewBox="0 0 56 52" fill="none" stroke="currentColor" strokeWidth={9} strokeLinecap="round">
    <path d="M7 18 C 15 9, 22 9, 28 16 S 41 23, 49 14" />
    <path d="M7 38 C 15 29, 22 29, 28 36 S 41 43, 49 34" />
  </svg>
);

/** Things of the street, drawn on its ground line, in a box of their own. */
const OnGround = ({ width, height = FIGURE_HEIGHT, size = 1, children }: { width: number; height?: number; size?: number; children: ReactNode }) => {
  const { pick } = useLayout();
  const scale = pick(1.1, 1.2) * size;
  return (
    <div style={{ position: "relative", width: width * scale, height: height * scale }}>
      <div style={{ position: "absolute", left: 0, top: (height - GROUND) * scale, width, scale: String(scale), transformOrigin: "0 0" }}>
        {children}
      </div>
    </div>
  );
};

/** Frames into its slam the lost sale is kept, then the dessert joins it. */
const SAVED_AT = beat(73) - beat(72) - 4;
const SAVE_FRAMES = 6;
const ADDED_AT = beat(74) - beat(72) - 4;

/**
 * More sales, from the film's own story: the queue's grey coin kept (it
 * turns yellow), then the dessert the order gained pops up beside it.
 */
const Sales = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // The kept coin fills with its colour from the bottom up: no muddy grey-yellow in between.
  const saved = interpolate(frame - SAVED_AT, [0, SAVE_FRAMES], [0, 1], { easing: Easing.inOut(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const added = spring({ frame: frame - ADDED_AT, fps, config: springs.snappy });
  const plus = 120;
  return (
    <OnGround width={COIN_RADIUS * 4 + plus} height={COIN_RADIUS * 2}>
      <div style={{ filter: "grayscale(1)", opacity: 0.45 }}>
        <Coin x={COIN_RADIUS} pop={1} turn={0} label={euros.format(MENU_SOLO)} />
      </div>
      <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: GROUND, clipPath: `inset(${GROUND - COIN_RADIUS * 2 * saved}px 0 0 0)` }}>
        <Coin x={COIN_RADIUS} pop={1} turn={0} label={euros.format(MENU_SOLO)} />
      </div>
      <div
        style={{
          position: "absolute",
          left: COIN_RADIUS * 2,
          width: plus,
          top: GROUND - COIN_RADIUS - 60,
          textAlign: "center",
          fontFamily: fonts.poppins,
          fontWeight: 800,
          fontSize: 100,
          lineHeight: "120px",
          color: ocp.white,
          opacity: Math.min(1, added * 2),
        }}
      >
        +
      </div>
      {/* It grows in its own place, without a hop: the row is still once it is complete. */}
      <Coin x={COIN_RADIUS * 3 + plus} pop={added} hop={0} turn={0} label={phone.added.dessert.price} />
    </OnGround>
  );
};

/** The customer and his arrow, drawn to the size of the other proofs. */
const RETURNING_SIZE = 0.6;
/**
 * In figure heights: the room on each side of him; the U-turn beside him —
 * where its lower leg starts and turns, its radius, its height above the
 * ground, where its upper leg ends, pointing back at him.
 */
const U_TURN = { side: 0.35, from: 0.3, turn: 1.05, radius: 0.22, low: 0.2, to: 0.36 };

/** Frames into its slam the U-turn is drawn, its head pops on the next hit, and he hops on the one after. */
const DRAWN = beat(76) - beat(75);
const HOP = beat(77) - beat(75);
const HOP_HEIGHT = 40;

/** The customer, on the yellow, phone in hand: he went off, and came back. */
const Returning = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const h = FIGURE_HEIGHT;
  const x = h * U_TURN.side;
  const width = x + h * (U_TURN.turn + U_TURN.radius + U_TURN.side / 2);
  const low = GROUND - h * U_TURN.low;
  const high = low - 2 * h * U_TURN.radius;
  const turn = x + h * U_TURN.turn;
  const tip = x + h * U_TURN.to;
  const drawn = interpolate(frame, [PROOF_DELAY, DRAWN], [0, 1], { easing: Easing.inOut(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const head = spring({ frame: frame - DRAWN, fps, config: springs.snappy });
  const hop = Math.sin(Math.min(1, spring({ frame: frame - HOP, fps, config: springs.snappy })) * Math.PI) * HOP_HEIGHT;
  return (
    <OnGround width={width} size={RETURNING_SIZE}>
      <Figure x={x} scale={1} tone={ocp.black} lift={hop} phone />
      <svg width={width} height={GROUND + 10} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} fill="none" stroke={ocp.black} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M 0 ${GROUND} H ${width}`} strokeWidth={8} />
        <path
          d={`M ${x + h * U_TURN.from} ${low} H ${turn} A ${h * U_TURN.radius} ${h * U_TURN.radius} 0 0 0 ${turn} ${high} H ${tip}`}
          strokeWidth={14}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - drawn}
        />
        <path
          d={`M ${tip + 36} ${high - 32} L ${tip} ${high} L ${tip + 36} ${high + 32}`}
          strokeWidth={14}
          style={{ scale: String(head), transformOrigin: `${tip}px ${high}px`, transformBox: "view-box" }}
        />
      </svg>
    </OnGround>
  );
};

const Claim = ({ children, onYellow, proof }: { children: ReactNode; onYellow: boolean; proof: ReactNode }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { height, pick } = useLayout();
  // Cut in on the downbeat, a touch large, settling in four frames.
  const settle = interpolate(frame, [0, SETTLE.frames], [SETTLE.from, 1], { easing: Easing.out(Easing.cubic), extrapolateRight: "clamp" });
  const rise = spring({ frame: frame - PROOF_DELAY, fps, config: springs.snappy });
  // All three on one grid: the claim's last line on one baseline, its proof centered on one line below.
  const grid = pick(GRID.landscape, GRID.portrait);
  const content = (
    <AbsoluteFill style={{ scale: String(1 + (DRIFT * frame) / durationInFrames) }}>
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: height - grid.claimBottom,
          fontFamily: fonts.poppins,
          fontWeight: 800,
          fontSize: pick(CLAIM.landscape, CLAIM.portrait),
          lineHeight: 1.02,
          letterSpacing: "-0.035em",
          textAlign: "center",
          color: onYellow ? ocp.black : ocp.white,
          scale: String(settle),
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: grid.proof,
          display: "flex",
          justifyContent: "center",
          translate: `0 calc(-50% + ${(1 - rise) * 40}px)`,
          opacity: rise,
        }}
      >
        {proof}
      </div>
    </AbsoluteFill>
  );
  return onYellow ? <AbsoluteFill style={{ background: ocp.yellow }}>{content}</AbsoluteFill> : <Stage>{content}</Stage>;
};

export const Slams = ({ from }: { from: number }) => {
  const at = (abs: number) => abs - from;
  const accent = (word: string) => <span style={{ color: ocp.yellow }}>{word}</span>;
  // What backs each claim: the Menu Solo no longer lost from the queue and
  // the dessert the order gained, the customer who stays, the till hours
  // the network view says were freed.
  const claims = [
    { onYellow: false, body: <>Plus de {accent("ventes.")}</>, proof: <Sales /> },
    { onYellow: true, body: <>Des clients{<br />}qui reviennent.</>, proof: <Returning /> },
    { onYellow: false, body: <>Des équipes{<br />}plus {accent("sereines.")}</>, proof: <Freed /> },
  ];
  return (
    <AbsoluteFill>
      {claims.map((claim, i) => (
        <Sequence key={i} from={at(SLAMS[i])} durationInFrames={(SLAMS[i + 1] ?? END) - SLAMS[i]}>
          <Claim onYellow={claim.onYellow} proof={claim.proof}>
            {claim.body}
          </Claim>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
