import { Composition, registerRoot } from "remotion";
import { FPS, HEIGHT, WIDTH, reelDuration } from "./format.ts";
import { scriptFrames } from "../../frontend/lib/social/script.ts";
import { Post } from "./Post.tsx";
import { Reel } from "./Reel.tsx";
import type { PostProps, ReelProps } from "./types.ts";

/* Point d'entrée du bundle Remotion. Les props viennent de scripts/render.ts
 * (un Reel par post) ; celles-ci ne servent qu'au studio (npm run studio). */
const preview: ReelProps = {
  brand: "menu",
  cta: "Écrivez MENU en message",
  music: null,
  scenes: [],
};

const postPreview: PostProps = {
  brand: "menu",
  format: "probleme-solution",
  look: "braise",
  rhythm: "fluide",
  scenes: [
    { block: "hook", frames: 75, props: { eyebrow: "Commande à table", title: "Vos tables prennent les [[commandes.]]" } },
    { block: "cta", frames: 75, props: { cta: "Écrivez [[MENU]] en message", line: "On vous répond nous-mêmes." } },
  ],
  transitions: [{ kind: "fade", direction: "from-right", frames: 15 }],
};

function Root() {
  return (
    <>
      <Composition
        id="Post"
        component={Post}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        durationInFrames={scriptFrames(postPreview)}
        defaultProps={postPreview}
        calculateMetadata={({ props }) => ({ durationInFrames: scriptFrames(props) })}
      />
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
    </>
  );
}

registerRoot(Root);
