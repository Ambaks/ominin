import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fonts } from "../brand/fonts";
import { ocp } from "../brand/tokens";
import { Stage } from "../kit/atmosphere";
import { useLayout } from "../kit/layout";
import { springs, useSpring } from "../kit/motion";
import { Counter, Reveal } from "../kit/type";
import { beat, sec } from "../timeline";
import { Kicker, neon } from "./styles";

/** The clock's last three minutes, 12:27 → 12:30, one tick per beat of the music's grid. */
export const CLOCK_TICKS = [beat(-18), beat(-17), beat(-16)];
const FIRST_MINUTE = 27;
export const CLOCK_DOT = CLOCK_TICKS[CLOCK_TICKS.length - 1] + 6;

/** Opening: the board's clock runs to 12:30 — the lunch rush. */
export const TitleCard = () => {
  const frame = useCurrentFrame();
  const { width, height, pick } = useLayout();
  const numeral = pick(440, 300);
  const light = useSpring(0, springs.smooth, sec(1.4));
  const open = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const dot = useSpring(CLOCK_DOT, springs.snappy);
  const passed = CLOCK_TICKS.filter((tick) => frame >= tick);
  const minute = FIRST_MINUTE + passed.length;
  const lastTick = passed.at(-1);

  return (
    <Stage rays={{ x: width / 2, y: height * 0.47, radius: Math.max(width, height) * 0.8 }} light={light}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {/* The film's hook: an eyebrow, but big enough to be read as one. */}
        <Kicker delay={CLOCK_DOT + 2} size={pick(48, 44)}>
          Le coup de feu
        </Kicker>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontFamily: fonts.anton,
            fontSize: numeral,
            lineHeight: 1.02,
            letterSpacing: "-0.005em",
            color: ocp.white,
            margin: `${numeral * 0.04}px 0 ${numeral * 0.02}px`,
            opacity: open,
            scale: String(1.04 - open * 0.04),
          }}
        >
          <span>12:</span>
          {lastTick === undefined ? (
            <span>{minute}</span>
          ) : (
            <Counter key={lastTick} from={minute - 1} to={minute} delay={lastTick} duration={7} />
          )}
          <span style={{ color: ocp.yellow, display: "inline-block", scale: String(dot), transformOrigin: "50% 85%" }}>.</span>
        </div>
        {/* Written on quickly, so the script has time to be read before the cut. */}
        <Reveal split="word" delay={CLOCK_DOT + 4} stagger={2} style={{ ...neon, fontSize: pick(104, 92) }}>
          Et la file s’allonge.
        </Reveal>
      </AbsoluteFill>
    </Stage>
  );
};
