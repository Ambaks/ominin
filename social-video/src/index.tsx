import { Composition, registerRoot } from "remotion";
import { FPS, HEIGHT, WIDTH, reelDuration } from "./format.ts";
import { Reel } from "./Reel.tsx";
import type { ReelProps } from "./types.ts";

/* Point d'entrée du bundle Remotion. Les props viennent de scripts/render.ts
 * (un Reel par post) ; celles-ci ne servent qu'au studio (npm run studio). */
const preview: ReelProps = {
  brand: "menu",
  cta: "Écrivez MENU en message",
  music: null,
  scenes: [],
};

function Root() {
  return (
    <Composition
      id="Reel"
      component={Reel}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      durationInFrames={reelDuration(preview.scenes)}
      defaultProps={preview}
      calculateMetadata={({ props }) => ({
        durationInFrames: reelDuration(props.scenes),
      })}
    />
  );
}

registerRoot(Root);
