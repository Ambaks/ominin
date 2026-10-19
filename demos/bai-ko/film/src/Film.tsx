import { TransitionSeries } from "@remotion/transitions";
import type { ComponentType, ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { bk } from "./brand/tokens";
import { Grain } from "./kit/atmosphere";
import { Soundtrack, type Cue } from "./kit/Soundtrack";
import { CLAMP } from "./kit/motion";
import { PaperWipe } from "./kit/transitions";
import { END_CARD, EndCard, LAST_HIT } from "./scenes/EndCard";
import { Kitchen, KITCHEN, LINE_FRAMES, PRINT, ROWS } from "./scenes/Kitchen";
import { COMPOSE, ENTER as PHONE, IRIS, PAID, PhoneFlow, TAPS } from "./scenes/phone/PhoneFlow";
import { Proof, PROOF } from "./scenes/Proof";
import { FLIPS, FREED, PHONE_UP, Room, ROOM, RoomFreed, WAIT_TICKS } from "./scenes/room/Room";
import { Salle, SALLE, SERVE_TAP } from "./scenes/Salle";
import { Served, SERVED } from "./scenes/Served";
import { Slams, SLAMS } from "./scenes/Slams";
import { ANSWER_HIT, Slogan, SLOGAN, WELL } from "./scenes/Slogan";
import { OURS, Takeaway, TAKEAWAY, TAKEAWAY_PAY } from "./scenes/Takeaway";
import { CLOCK_DOT, CLOCK_TICKS, TitleCard } from "./scenes/TitleCard";
import { beat, BEAT, DROP, FPS, MUSIC, sec } from "./timeline";

export const FILM_DURATION = beat(100);

type Scene = {
  name: string;
  start: number;
  Component: ComponentType<{ from: number }>;
  wipe?: number;
  /** Out of the scenes' drift: the title, whose backdrop drifts on its own into the room's first frame. */
  still?: boolean;
};

/*
 * The cut list: every scene starts on a beat of the music, most on a hard
 * cut; a wipe covers its cut without overlapping the scenes.
 */
const SCENES: Scene[] = [
  { name: "12:41", start: 0, Component: TitleCard, still: true },
  { name: "La salle", start: ROOM, Component: Room },
  { name: "Commande", start: PHONE, Component: PhoneFlow },
  { name: "Cuisine", start: KITCHEN, Component: Kitchen, wipe: 10 },
  { name: "Salle", start: SALLE, Component: Salle },
  { name: "Libérée", start: FREED, Component: RoomFreed },
  { name: "Servi", start: SERVED, Component: Served },
  { name: "Mesuré", start: PROOF, Component: Proof },
  { name: "À emporter", start: TAKEAWAY, Component: Takeaway },
  { name: "L’offre", start: SLAMS[0], Component: Slams },
  { name: "Signature", start: SLOGAN, Component: Slogan },
  { name: "Fin", start: END_CARD, Component: EndCard },
];

const timeline = SCENES.map((scene, i) => ({ ...scene, duration: (SCENES[i + 1]?.start ?? FILM_DURATION) - scene.start }));

export const Film = () => (
  <AbsoluteFill style={{ background: bk.black }}>
    <TransitionSeries>
      {timeline.flatMap(({ name, start, duration, Component, wipe, still }) => [
        wipe && (
          <TransitionSeries.Overlay key={`${name}-in`} durationInFrames={wipe}>
            <PaperWipe />
          </TransitionSeries.Overlay>
        ),
        <TransitionSeries.Sequence key={name} name={name} durationInFrames={duration}>
          {still ? (
            <Component from={start} />
          ) : (
            <Drift>
              <Component from={start} />
            </Drift>
          )}
        </TransitionSeries.Sequence>,
      ])}
    </TransitionSeries>
    <Grain />
    <FadeOut />
    <Soundtrack cues={CUES} gain={MASTER} />
  </AbsoluteFill>
);

const FADE_OUT = sec(0.6);
/** Frames of full black the film ends on. */
const BLACK_HOLD = 3;

/** How much closer every scene but the title drifts over its length: nothing on screen ever stands quite still. */
const SCENE_DRIFT = 0.03;

const Drift = ({ children }: { children: ReactNode }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return <AbsoluteFill style={{ scale: String(1 + (SCENE_DRIFT * frame) / durationInFrames) }}>{children}</AbsoluteFill>;
};

/** The picture goes to black under the impact's tail. */
const FadeOut = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{ background: "#000", opacity: interpolate(frame, [FILM_DURATION - FADE_OUT - BLACK_HOLD, FILM_DURATION - BLACK_HOLD], [0, 1], CLAMP) }}
    />
  );
};

const sfx = (name: string, at: number, file: string, volume: Cue["volume"], extra: Partial<Cue> = {}): Cue => ({
  name,
  at,
  src: `audio/sfx/${file}.wav`,
  volume,
  ...extra,
});


/** The track is mastered hot: the mix sits here so its true peak stays near −1 dBFS. */
const MASTER = 0.75;

/** Moments the music steps back for a sound that must be heard. */
const DUCKS = [PAID, SERVE_TAP + 4];
const MUSIC_LEVEL = 0.82;
const UNDER = 0.82;
const INTRO_LIFT = 1.5;
/** The beat before the proof: the groove falls away, to land again on its figures. */
const BREATH = PROOF - BEAT;

const bedVolume = (f: number) =>
  MUSIC_LEVEL *
  interpolate(f, [MUSIC.filmIn, MUSIC.filmIn + sec(0.8)], [0, 1], CLAMP) *
  // The breakdown before the drop is thin on small speakers: it sits up (+3.5 dB) until the scan.
  interpolate(f, [DROP - 6, DROP], [INTRO_LIFT, 1], CLAMP) *
  interpolate(f, [BREATH - 2, BREATH + 4, PROOF - 2, PROOF], [1, 0.22, 0.22, 1], CLAMP) *
  // Under the product, the groove sits back (−1.7 dB) so the UI sounds read.
  interpolate(f, [COMPOSE - 6, COMPOSE + 6, KITCHEN - 6, KITCHEN], [1, UNDER, UNDER, 1], CLAMP) *
  DUCKS.reduce((gain, at) => gain * interpolate(f, [at - 3, at + 2, at + 14, at + 30], [1, 0.62, 0.62, 1], CLAMP), 1);

/**
 * From the kitchen to the room the groove thins to its kick and bass,
 * from public/audio/music/groove-kitchen.wav: the track from 61.1 s (the
 * kitchen's beat, 22, lands at 61.24 s) for 12.5 s, through two 800 Hz
 * low-pass filters (ffmpeg -ss 61.1 -t 12.5 -i energetic-funky-groove.mp3
 * -af lowpass=f=800,lowpass=f=800 groove-kitchen.wav; gitignored, rebuilt
 * from this line). It comes back whole on the served dish.
 */
const THIN = { src: "audio/music/groove-kitchen.wav", trackFrom: 61.1, level: 0.9 };
const thinning = (f: number) => interpolate(f, [KITCHEN - 2, KITCHEN + 4, SERVED - 4, SERVED + 2], [0, 1, 1, 0], CLAMP);
const thinAt = MUSIC.filmIn + Math.round((THIN.trackFrom - MUSIC.trackIn) * FPS);

/** The small whoosh peaks this long after it starts. */
const WHOOSH_PEAK = sec(0.65);
/** The printer sample's length, in frames: it is laid end to end for as long as the ticket prints. */
const PRINTER_LOOP = 28;
/** The riser peaks this long after it starts. */
const RISER_PEAK = 77;
/** The impact swells for 2.1 s to its peak: it plays from there, so the break before the last hit stays silent. */
const IMPACT_RISE = sec(2.13);
/** The impact, under the film's loudest moment rather than over it (−2.5 dB from its first level, 0.8). */
const IMPACT_LEVEL = 0.6;
/** Taps sit under the drop and the hits: they are short, their peaks run high. */
const TAP_LEVEL = 0.45;

const CUES: Cue[] = [
  {
    name: "Ambiance",
    at: 0,
    src: "audio/sfx/ambience.wav",
    // The room's chatter, kept up under the photos, gone by the scan.
    volume: (f) => interpolate(f, [0, 12, PHONE_UP - 6, PHONE_UP + 10, DROP - 20, DROP], [0, 1, 1, 0.55, 0.5, 0], CLAMP),
  },
  ...CLOCK_TICKS.map((at, i) => sfx(`Tic ${i + 1}`, at, "clock-tick", 0.9)),
  sfx("Point", CLOCK_DOT, "bass-hit", 0.45),
  sfx("La salle", ROOM - WHOOSH_PEAK, "whoosh-small", 1),
  ...WAIT_TICKS.map((at, i) => sfx(`Attente ${i + 1}`, at, "tick", 0.55, { pitch: 1 + i * 0.08 })),
  {
    name: "Musique",
    at: MUSIC.filmIn,
    src: MUSIC.src,
    trimBefore: Math.round(MUSIC.trackIn * FPS),
    volume: (f) => bedVolume(f) * (1 - thinning(f)),
  },
  { name: "Musique, cuisine", at: thinAt, src: THIN.src, volume: (f) => bedVolume(f) * thinning(f) * THIN.level },
  sfx("Montée", DROP - RISER_PEAK, "riser", 0.75),
  // Its click is the film's sharpest transient: under the drop, it would set the master's peak.
  sfx("Scan", DROP, "scan", 0.5),
  sfx("Vers la carte", DROP + 8, "whoosh-large", 0.5),
  ...TAPS.map((at, i) => sfx(`Tap ${i + 1}`, at, "tap", TAP_LEVEL)),
  sfx("Paiement", PAID, "payment", 0.7),
  sfx("Payé", IRIS - 4, "whoosh-small", 0.5),
  sfx("Balayage", KITCHEN - WHOOSH_PEAK, "whoosh-small", 0.45),
  ...Array.from({ length: Math.ceil((ROWS.length * LINE_FRAMES) / PRINTER_LOOP) }, (_, i) => sfx(`Imprimante ${i + 1}`, PRINT + i * PRINTER_LOOP, "printer", 0.85)),
  sfx("Servi", SERVE_TAP, "tap", TAP_LEVEL),
  sfx("Servi, cloche", SERVE_TAP + 4, "ready", 0.55),
  // The room again: each table's chip turns over with a tick, the wait's own, rising.
  ...FLIPS.map((at, i) => sfx(`Libérée ${i + 1}`, at, "tick", 0.55, { pitch: 1 + i * 0.08 })),
  sfx("Servi", SERVED, "bass-hit", 0.5),
  sfx("Mesuré", PROOF, "bass-hit", 0.55),
  sfx("À emporter", TAKEAWAY - WHOOSH_PEAK + 4, "whoosh-small", 0.5),
  sfx("À emporter, payé", TAKEAWAY_PAY, "tap", TAP_LEVEL),
  sfx("Prix", OURS, "coins", 0.45),
  ...SLAMS.map((at, i) => sfx(`Offre ${i + 1}`, at, "bass-hit", 0.6)),
  // The neon of « to Montpellier » switching on, on its hit.
  sfx("Néon", WELL, "bass-hit", 0.5),
  sfx("Commandé, payé, servi", ANSWER_HIT, "bass-hit", 0.6),
  sfx("Impact final", LAST_HIT, "impact", (f) => IMPACT_LEVEL * interpolate(f, [FILM_DURATION - FADE_OUT * 2, FILM_DURATION], [1, 0], CLAMP), {
    trimBefore: IMPACT_RISE,
  }),
  sfx("Dernier coup", LAST_HIT, "bass-hit", 0.7),
];
