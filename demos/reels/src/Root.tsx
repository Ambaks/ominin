import { Composition } from "remotion";
import { FPS, HEIGHT, WIDTH } from "./kit";
import { REELS } from "./reels";

export const Root = () =>
  REELS.map(({ id, component, duration }) => (
    <Composition key={id} id={id} component={component} durationInFrames={duration} fps={FPS} width={WIDTH} height={HEIGHT} />
  ));
