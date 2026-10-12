import { useId } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

/**
 * Monochrome grain, reseeded every frame, over the whole picture. The noise
 * is drawn on one stitched tile and repeated: a full-frame turbulence filter
 * cost ~60 ms a frame at 1080p.
 */
const GRAIN_TILE = 512;

export const Grain = () => {
  const frame = useCurrentFrame();
  const id = `grain${useId().replace(/:/g, "")}`;
  return (
    <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: 0.08, pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id={`${id}f`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <pattern id={`${id}p`} width={GRAIN_TILE} height={GRAIN_TILE} patternUnits="userSpaceOnUse">
          <rect width={GRAIN_TILE} height={GRAIN_TILE} filter={`url(#${id}f)`} />
        </pattern>
        <rect width="100%" height="100%" fill={`url(#${id}p)`} />
      </svg>
    </AbsoluteFill>
  );
};
