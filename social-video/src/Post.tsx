import { Fragment } from "react";
import { Easing } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { flip } from "@remotion/transitions/flip";
import { iris } from "@remotion/transitions/iris";
import { pushCut } from "@remotion/transitions/push-cut";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import type { PostTransition } from "../../frontend/lib/social/script.ts";
import { SceneView } from "./blocks/scenes.tsx";
import { LookContext } from "./look.ts";
import { HEIGHT, WIDTH } from "./format.ts";
import "./fonts.ts";
import "./loop.css";
import type { PostProps } from "./types.ts";

/*
 * Une publication en scènes (frontend/lib/social/script.ts) : les blocs bout
 * à bout, chaque paire jointe par sa transition. Rendue en entier pour la
 * vidéo, ou réduite à une scène ou à deux voisines par les agents du montage.
 */

const easing = Easing.bezier(0.65, 0, 0.35, 1);

/* Un élément par présentation : TransitionSeries lit ses enfants directs, et
 * chaque présentation a ses props. Une coupe n'en a pas. */
function transitionElement({ kind, direction, frames }: PostTransition) {
  const timing = linearTiming({ durationInFrames: frames, easing });
  switch (kind) {
    case "fade":
      return <TransitionSeries.Transition presentation={fade()} timing={timing} />;
    case "slide":
      return <TransitionSeries.Transition presentation={slide({ direction })} timing={timing} />;
    case "wipe":
      return <TransitionSeries.Transition presentation={wipe({ direction })} timing={timing} />;
    case "flip":
      return <TransitionSeries.Transition presentation={flip({ direction })} timing={timing} />;
    case "iris":
      return <TransitionSeries.Transition presentation={iris({ width: WIDTH, height: HEIGHT })} timing={timing} />;
    case "push":
      return <TransitionSeries.Transition presentation={pushCut({ flashColor: "#f0b35b" })} timing={timing} />;
    case "cut":
      return null;
  }
}

export function Post({ brand, look, scenes, transitions }: PostProps) {
  return (
    <LookContext.Provider value={look}>
    <TransitionSeries>
      {scenes.map((scene, index) => {
        const transition = transitions[index - 1];
        return (
          <Fragment key={index}>
            {transition && transitionElement(transition)}
            <TransitionSeries.Sequence durationInFrames={scene.frames}>
              <SceneView brand={brand} scene={scene} />
            </TransitionSeries.Sequence>
          </Fragment>
        );
      })}
    </TransitionSeries>
    </LookContext.Provider>
  );
}
