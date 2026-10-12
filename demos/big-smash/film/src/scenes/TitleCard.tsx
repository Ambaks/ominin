import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fonts } from "../brand/fonts";
import { bs } from "../brand/tokens";
import { Stage } from "../kit/atmosphere";
import { useLayout } from "../kit/layout";
import { springs, useSpring } from "../kit/motion";
import { Counter, Reveal } from "../kit/type";
import { beat, sec } from "../timeline";
import { Kicker, neon } from "./styles";

/** The clock's last three minutes, 12:37 → 12:40, one tick per beat of the music's grid. */
export const CLOCK_TICKS = [beat(-18), beat(-17), beat(-16)];
const FIRST_MINUTE = 37;
export const CLOCK_DOT = CLOCK_TICKS[CLOCK_TICKS.length - 1] + 6;

/** Opening: the clock runs to 12:40 — the lunch rush. */
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
    <Stage motif={{ x: width / 2, y: height * 0.47, radius: Math.max(width, height) * 0.8 }} light={light}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {/* The film's hook: an eyebrow, but big enough to be read as one. */}
        <Kicker delay={CLOCK_DOT + 2} size={pick(48, 44)}>
          Le coup de feu
        </Kicker>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontFamily: fonts.numeral,
            fontSize: numeral,
            lineHeight: 1.02,
            letterSpacing: "-0.005em",
            color: bs.white,
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
          <span style={{ color: bs.red, display: "inline-block", scale: String(dot), transformOrigin: "50% 85%" }}>.</span>
        </div>
        {/* Written on quickly, so the script has time to be read before the cut. */}
        {/* Centré, avec ses marges : en vertical, la ligne passe à deux et collait au bord gauche. */}
        <Reveal split="word" delay={CLOCK_DOT + 4} stagger={2} style={{ ...neon, fontSize: pick(104, 92), textAlign: "center", padding: "0 64px" }}>
          Et la file s’allonge.
        </Reveal>
      </AbsoluteFill>
    </Stage>
  );
};
