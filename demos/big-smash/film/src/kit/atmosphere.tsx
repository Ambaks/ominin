import { useId, type ReactNode } from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { bs } from "../brand/tokens";

type MotifProps = {
  /** Center of the motif's light, in px from the top-left of the parent. */
  x: number;
  y: number;
  /** Reach of the light before it fades out, in px. */
  radius: number;
  opacity?: number;
};

/** How much closer the motif drifts each second. */
const DRIFT_PER_SECOND = 0.006;

/**
 * The brush zig-zag of bigsmash.fr's backgrounds, as light: white at a few
 * percent around (x, y), fading out, drifting very slowly closer.
 */
const Motif = ({ x, y, radius, opacity = 0.035 }: MotifProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mask = `radial-gradient(circle ${radius}px at ${x}px ${y}px, black 15%, transparent 100%)`;
  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none", opacity, maskImage: mask, WebkitMaskImage: mask }}>
      <Img
        src={staticFile("brand/motif-zigzag.webp")}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          scale: String(1.04 + (frame / fps) * DRIFT_PER_SECOND),
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
 * The ground every dark scene stands on: black, a vignette that seats the
 * content without dirtying the red of a wipe passing over it, and — for the
 * brand's own moments only — the painted zig-zag, faded by `light`.
 */
export const Stage = ({ motif, light = 1, children }: { motif?: MotifProps; light?: number; children: ReactNode }) => (
  <AbsoluteFill style={{ background: bs.black }}>
    {motif && (
      <AbsoluteFill style={{ opacity: light }}>
        <Motif {...motif} />
      </AbsoluteFill>
    )}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 80% at 50% 48%, transparent 45%, rgb(0 0 0 / 0.55))" }} />
    {children}
  </AbsoluteFill>
);
