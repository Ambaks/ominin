import { Composition } from "remotion";
import { FPS, HEIGHT, WIDTH } from "./kit";
import { REELS } from "./reels";

export const Root = () =>
  REELS.map(({ id, component, duration, props }) => (
    <Composition key={id} id={id} component={component} defaultProps={props} durationInFrames={duration} fps={FPS} width={WIDTH} height={HEIGHT} />
  ));
