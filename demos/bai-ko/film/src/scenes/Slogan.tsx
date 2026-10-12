import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { bk, PINK_RGB } from "../brand/tokens";
import { Stage } from "../kit/atmosphere";
import { useLayout } from "../kit/layout";
import { CLAMP } from "../kit/motion";
import { Reveal } from "../kit/type";
import { beat } from "../timeline";
import { END_CARD } from "./EndCard";
import { neon, statement, STATEMENT } from "./styles";

/*
 * Scene 15: their signature, « From Seoul to Montpellier » (bai-ko.com),
 * lands in the music's first break, ours in pink on the fill after it, and
 * « to Montpellier » lights like their neon on the hit; the scene clears into
 * the end card's cut.
 */
/** Frames a line starts rising ahead of its hit, so it lands on it. */
const LEAD = 5;
export const SLOGAN = beat(82);
/** « to Montpellier » lights on the hit, in place, in its tube. */
export const WELL = beat(84);
export const ANSWER_HIT = beat(83);
const ANSWER = ANSWER_HIT - LEAD;
/** The whole slogan leaves over the frames before the end card's cut: no empty frame between them. */
const CLEAR_FRAMES = 7;
const CLEAR = END_CARD - CLEAR_FRAMES;
/** On the music's fill before the next hit, the neon flickers. */
const FLICKER = beat(83) + 3;
const FLICKER_OPACITY = [1, 0.35, 0.9, 0.5, 1];
/** A neon tube lighting: from dark straight to its white core, off, on again, frame by frame; its halo blooms over this many frames. */
const LIGHT_ON = [0, 1, 1, 0.15, 1];
const BLOOM_FRAMES = 4;
/** « to Montpellier », unlit, waits under « From Seoul »: its tube, faintly. */
const UNLIT = `0.025em rgb(${PINK_RGB} / 0.22)`;

const steps = (values: number[]) => values.map((_, i) => i);

export const Slogan = ({ from }: { from: number }) => {
  const { width, height, pick } = useLayout();
  const at = (abs: number) => abs - from;
  const frame = useCurrentFrame();
  const flicker = interpolate(frame - at(FLICKER), steps(FLICKER_OPACITY), FLICKER_OPACITY, CLAMP);
  const unlit = interpolate(frame - at(SLOGAN), [0, 8], [0, 1], CLAMP);
  const lit = interpolate(frame - at(WELL), steps(LIGHT_ON), LIGHT_ON, CLAMP);
  const bloom = interpolate(frame - at(WELL), [0, BLOOM_FRAMES], [0.4, 1], CLAMP);
  const clear = interpolate(frame - at(CLEAR), [0, CLEAR_FRAMES], [0, 1], { ...CLAMP, easing: Easing.in(Easing.cubic) });
  return (
    <Stage grid={{ x: width / 2, y: height * 0.45, radius: Math.max(width, height) * 0.8 }}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: pick(40, 60), opacity: 1 - clear }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", ...neon, fontSize: pick(210, 170), lineHeight: 0.98 }}>
          {/* The whole line is set from the start: « From Seoul » lands where it stays, risen from behind its own line's foot, not through the tube under it. */}
          <div style={{ opacity: flicker, color: bk.white, WebkitTextStroke: "0", textShadow: "none", clipPath: "inset(-50% -10% 0)" }}>
            <Reveal delay={at(SLOGAN)} split="word" stagger={4}>
              From Seoul
            </Reveal>
          </div>
          <div style={{ display: "grid", whiteSpace: "nowrap" }}>
            <span style={{ gridArea: "1 / 1", color: "transparent", WebkitTextStroke: UNLIT, textShadow: "none", opacity: unlit }}>to Montpellier</span>
            <span style={{ gridArea: "1 / 1", opacity: lit, textShadow: `0 0 0.08em rgb(${PINK_RGB} / 0.9), 0 0 0.45em rgb(${PINK_RGB} / ${0.55 * bloom})` }}>to Montpellier</span>
          </div>
        </div>
        {/* Ours, from the deck: what the film has just shown, in its order. */}
        <Reveal
          delay={at(ANSWER)}
          split="word"
          stagger={3}
          style={{
            maxWidth: pick(1800, 900),
            ...statement,
            // Ours at the film's statement size, well under theirs: their slogan is the headline.
            fontSize: pick(STATEMENT.landscape, STATEMENT.portrait),
            color: bk.pink,
            textAlign: "center",
          }}
        >
          Commandé, payé, servi.
        </Reveal>
      </AbsoluteFill>
    </Stage>
  );
};
