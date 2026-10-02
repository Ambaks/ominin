import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { track, type Key } from "./motion";

export type Shot = { x: number; y: number; zoom: number };

/**
 * A camera over a flat world: each shot centers world point (x, y) at
 * `zoom`. Zoom moves in log space so a push-in feels constant, and a fast
 * move across blurs in proportion to its on-screen speed, like a shutter would.
 */
export const Camera = ({ shots, children }: { shots: Key<Shot>[]; children: ReactNode }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const keys = shots.map((key) => ({ ...key, value: { x: key.value.x, y: key.value.y, z: Math.log(key.value.zoom) } }));
  const now = track(frame, fps, keys);
  const before = track(frame - 1, fps, keys);
  const zoom = Math.exp(now.z);
  // Only a whip across blurs: a pan, a push or a dive stays sharp.
  const speed = Math.hypot((now.x - before.x) * zoom, (now.y - before.y) * zoom);
  const blur = Math.min(10, Math.max(0, (speed - 70) * 0.05));
  return (
    <AbsoluteFill style={{ overflow: "hidden", filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
      <div
        style={{
          position: "absolute",
          transformOrigin: "0 0",
          transform: `translate(${width / 2}px, ${height / 2}px) scale(${zoom}) translate(${-now.x}px, ${-now.y}px)`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
