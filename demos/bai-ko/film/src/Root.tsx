import { Composition } from "remotion";
import { Film, FILM_DURATION } from "./Film";
import { FPS } from "./timeline";

// 4K is the 16:9 master rendered with --scale=2.
const FORMATS = {
  "16x9": { width: 1920, height: 1080 },
  "9x16": { width: 1080, height: 1920 },
};

export const Root = () =>
  Object.entries(FORMATS).map(([name, size]) => (
    <Composition key={name} id={`Film-${name}`} component={Film} durationInFrames={FILM_DURATION} fps={FPS} {...size} />
  ));
