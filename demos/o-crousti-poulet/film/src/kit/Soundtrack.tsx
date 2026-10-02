import { Audio } from "@remotion/media";
import { getRemotionEnvironment, getStaticFiles, Sequence, staticFile, useVideoConfig } from "remotion";

/** A volume: constant, or a function of the film's frame. */
type Level = number | ((filmFrame: number) => number);

export type Cue = {
  /** Timeline marker the cue belongs to, shown in the Studio timeline. */
  name: string;
  /** Film frame it starts on. */
  at: number;
  /** Path inside public/, e.g. "audio/sfx/tap.wav". */
  src: string;
  volume?: Level;
  /** Pitch factor (1 = as recorded). */
  pitch?: number;
  /** Frames into the file to start from. */
  trimBefore?: number;
};

const level = (volume: Level = 1, at: number, gain: number) =>
  typeof volume === "function" ? (frame: number) => gain * volume(frame + at) : gain * volume;

/**
 * The film's sound: every source (the music bed included) is a cue at a
 * film frame, with a constant or scripted volume. In the Studio a missing
 * file becomes a labelled, silent placeholder in the timeline; in a render
 * it throws, so no film ships with a hole in its sound. `gain` scales the
 * whole mix, to keep its peaks under full scale.
 */
export const Soundtrack = ({ cues, gain = 1 }: { cues: Cue[]; gain?: number }) => {
  const { fps } = useVideoConfig();
  const present = new Set(getStaticFiles().map((file) => file.name));
  const missing = [...new Set(cues.map((cue) => cue.src).filter((src) => !present.has(src)))];

  if (missing.length > 0 && getRemotionEnvironment().isRendering) {
    throw new Error(`Missing audio in public/: ${missing.join(", ")}`);
  }

  return (
    <>
      {cues.map((cue, i) =>
        present.has(cue.src) ? (
          <Audio
            key={i}
            src={staticFile(cue.src)}
            from={cue.at}
            trimBefore={cue.trimBefore}
            volume={level(cue.volume, cue.at, gain)}
            toneFrequency={cue.pitch}
            name={cue.name}
          />
        ) : (
          <Sequence key={i} from={cue.at} durationInFrames={Math.round(fps / 2)} name={`Missing · ${cue.name} · ${cue.src}`} layout="none" />
        ),
      )}
    </>
  );
};
