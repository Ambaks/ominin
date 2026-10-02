import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { thermalPaper } from "../brand/tokens";

/** The sheet's torn edges: the width of a tooth and its depth, in px. */
const TOOTH = { width: 18, depth: 9 };

/**
 * The kitchen ticket's own paper as a wipe: a sheet, torn top and bottom,
 * feeds up over the picture, covers it at the cut and runs off the top. Use
 * it as a <TransitionSeries.Overlay> with an even duration, so the cut sits
 * exactly under full cover.
 */
export const PaperWipe = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const fed = interpolate(frame, [0, durationInFrames], [0, 1], { easing: Easing.inOut(Easing.cubic) });
  const sheet = height + TOOTH.depth * 2;
  const teeth = Math.ceil(width / TOOTH.width);
  const edge = (y: number, inward: number) =>
    Array.from({ length: teeth * 2 + 1 }, (_, i) => `${(i * TOOTH.width) / 2}px ${i % 2 ? y + inward : y}px`);
  const outline = [...edge(0, TOOTH.depth), ...edge(sheet, -TOOTH.depth).reverse()].join(", ");
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          width: teeth * TOOTH.width,
          top: height - TOOTH.depth - fed * (height + sheet),
          height: sheet,
          background: thermalPaper,
          clipPath: `polygon(${outline})`,
        }}
      />
    </AbsoluteFill>
  );
};
