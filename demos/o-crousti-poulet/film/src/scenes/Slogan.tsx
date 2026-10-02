import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { fonts } from "../brand/fonts";
import { ocp } from "../brand/tokens";
import { Stage } from "../kit/atmosphere";
import { useLayout } from "../kit/layout";
import { Reveal } from "../kit/type";
import { beat } from "../timeline";
import { neon, STATEMENT } from "./styles";

/*
 * Scene 14: their slogan, in their handwriting, lands in the music's two
 * breaks; ours answers it in yellow on the next hit.
 */
/** Frames a line starts rising ahead of its hit, so it lands on it. */
const LEAD = 5;
const FAST = beat(82);
/** « Mais bien. » lights on the hit, in place, in its tube. */
export const WELL = beat(84);
export const ANSWER_HIT = beat(87);
const ANSWER = ANSWER_HIT - LEAD;
/** The whole slogan leaves as the last break begins, so the break is the sunburst's alone. */
const CLEAR = beat(90);
const CLEAR_FRAMES = 7;
/** On the music's fill before the next hit, the neon flickers. */
const FLICKER = beat(83) + 3;
const FLICKER_OPACITY = [1, 0.35, 0.9, 0.5, 1];
/** A neon tube lighting: from dark straight to its white core, off, on again, frame by frame; its halo blooms over this many frames. */
const LIGHT_ON = [0, 1, 1, 0.15, 1];
const BLOOM_FRAMES = 4;
/** « Mais bien. », unlit, waits beside « Vite, oui. »: its tube, faintly. */
const UNLIT = "0.035em rgb(247 238 33 / 0.2)";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const steps = (values: number[]) => values.map((_, i) => i);

export const Slogan = ({ from }: { from: number }) => {
  const { width, height, portrait, pick } = useLayout();
  const at = (abs: number) => abs - from;
  const frame = useCurrentFrame();
  const flicker = interpolate(frame - at(FLICKER), steps(FLICKER_OPACITY), FLICKER_OPACITY, clamp);
  const unlit = interpolate(frame - at(FAST), [0, 8], [0, 1], clamp);
  const lit = interpolate(frame - at(WELL), steps(LIGHT_ON), LIGHT_ON, clamp);
  const bloom = interpolate(frame - at(WELL), [0, BLOOM_FRAMES], [0.4, 1], clamp);
  const clear = interpolate(frame - at(CLEAR), [0, CLEAR_FRAMES], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  return (
    <Stage rays={{ x: width / 2, y: height * 0.45, radius: Math.max(width, height) * 0.8 }}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: pick(40, 60), opacity: 1 - clear }}>
        <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", alignItems: "center", columnGap: "0.35em", ...neon, fontSize: pick(160, 150) }}>
          {/* The whole line is set from the start: « Vite, oui. » lands where it stays. */}
          <div style={{ opacity: flicker }}>
            <Reveal delay={at(FAST)} split="word" stagger={4}>
              Vite, oui.
            </Reveal>
          </div>
          <div style={{ display: "grid", whiteSpace: "nowrap" }}>
            <span style={{ gridArea: "1 / 1", color: "transparent", WebkitTextStroke: UNLIT, textShadow: "none", opacity: unlit }}>Mais bien.</span>
            <span style={{ gridArea: "1 / 1", opacity: lit, textShadow: `0 0 0.45em rgb(247 238 33 / ${0.5 * bloom})` }}>Mais bien.</span>
          </div>
        </div>
        <Reveal
          delay={at(ANSWER)}
          split="word"
          stagger={3}
          style={{
            maxWidth: pick(1800, 900),
            fontFamily: fonts.poppins,
            fontWeight: 800,
            // Ours at the film's statement size, well under theirs: their slogan is the headline.
            fontSize: pick(STATEMENT.landscape, STATEMENT.portrait),
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            color: ocp.yellow,
            textAlign: "center",
          }}
        >
          Et sans attendre.
        </Reveal>
      </AbsoluteFill>
    </Stage>
  );
};
