import { useId, type ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ocp } from "../brand/tokens";

type RaysProps = {
  /** Center of the rays, in px from the top-left of the parent. */
  x: number;
  y: number;
  /** Reach of the rays before they fade out, in px. */
  radius: number;
  opacity?: number;
};

const RAY = "247 247 242";
const DEGREES_PER_SECOND = 1.2;

/**
 * The menu board's rays, as light: thin wedges from a point, feathered so
 * they read as beams rather than a printed sunburst, turning very slowly.
 */
const Rays = ({ x, y, radius, opacity = 0.03 }: RaysProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ray = `rgb(${RAY} / ${opacity})`;
  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: x - radius,
          top: y - radius,
          width: radius * 2,
          height: radius * 2,
          background: `repeating-conic-gradient(${ray} 0deg 4deg, transparent 6deg 10deg, ${ray} 12deg)`,
          maskImage: "radial-gradient(circle closest-side, transparent 3%, black 16%, rgb(0 0 0 / 0.35) 50%, transparent 88%)",
          rotate: `${(frame / fps) * DEGREES_PER_SECOND}deg`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x - radius * 0.6,
          top: y - radius * 0.6,
          width: radius * 1.2,
          height: radius * 1.2,
          background: `radial-gradient(circle closest-side, rgb(${RAY} / ${opacity * 1.6}), transparent)`,
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
 * The board every dark scene stands on: black, a vignette that seats the
 * content without dirtying the yellow of a wipe passing over it, and — for
 * the brand's own moments only — the turning rays, faded by `light`.
 */
export const Stage = ({ rays, light = 1, children }: { rays?: RaysProps; light?: number; children: ReactNode }) => (
  <AbsoluteFill style={{ background: ocp.black }}>
    {rays && (
      <AbsoluteFill style={{ opacity: light }}>
        <Rays {...rays} />
      </AbsoluteFill>
    )}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 80% at 50% 48%, transparent 45%, rgb(0 0 0 / 0.55))" }} />
    {children}
  </AbsoluteFill>
);
