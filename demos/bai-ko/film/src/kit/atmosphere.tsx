import { useId, type ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { bk, CYAN_RGB, VIOLET_RGB } from "../brand/tokens";

type GridProps = {
  /** Center of the grid's light, in px from the top-left of the parent. */
  x: number;
  y: number;
  /** Reach of the light before it fades out, in px. */
  radius: number;
  opacity?: number;
};

/** The grid's cell, in px: the one of bai-ko.com's background. */
const CELL = 64;
/** How much closer the grid drifts each second. */
const DRIFT_PER_SECOND = 0.006;

/**
 * The faint grid and the violet and cyan glows of bai-ko.com's hero, around
 * (x, y), fading out, drifting very slowly closer.
 */
const NeonGrid = ({ x, y, radius, opacity = 0.06 }: GridProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mask = `radial-gradient(circle ${radius}px at ${x}px ${y}px, black 15%, transparent 100%)`;
  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle ${radius * 0.7}px at ${x}px ${y}px, rgb(${VIOLET_RGB} / 0.16), rgb(${CYAN_RGB} / 0.04) 55%, transparent)`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity,
          maskImage: mask,
          WebkitMaskImage: mask,
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: `${CELL}px ${CELL}px`,
          backgroundPosition: `${x}px ${y}px`,
          scale: String(1.02 + (frame / fps) * DRIFT_PER_SECOND),
          transformOrigin: `${x}px ${y}px`,
        }}
      />
    </AbsoluteFill>
  );
};

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

/**
 * The ground every dark scene stands on: the site's night, a vignette that
 * seats the content and — for the brand's own moments only — its neon grid,
 * faded by `light`.
 */
export const Stage = ({ grid, light = 1, children }: { grid?: GridProps; light?: number; children: ReactNode }) => (
  <AbsoluteFill style={{ background: bk.black }}>
    {grid && (
      <AbsoluteFill style={{ opacity: light }}>
        <NeonGrid {...grid} />
      </AbsoluteFill>
    )}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 80% at 50% 48%, transparent 45%, rgb(0 0 0 / 0.55))" }} />
    {children}
  </AbsoluteFill>
);
