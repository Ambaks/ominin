import { TransitionSeries } from "@remotion/transitions";
import type { ComponentType, ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ocp } from "./brand/tokens";
import { Grain } from "./kit/atmosphere";
import { Soundtrack, type Cue } from "./kit/Soundtrack";
import { PaperWipe } from "./kit/transitions";
import { COUNTER, Counter, READY_TAP } from "./scenes/Counter";
import { EndCard, LAST_HIT } from "./scenes/EndCard";
import { Kitchen, KITCHEN, LINE_FRAMES, PRINT, ROWS } from "./scenes/Kitchen";
import { ARRIVAL, CLIMB, Network, dotFrames, FIRST_DOT, NETWORK, TICK, VIEW } from "./scenes/Network";
import { LAPSE, NumberEta, SLAM } from "./scenes/NumberEta";
import { COMPOSE, ENTER as PHONE, IRIS, PAID, PhoneFlow, TAPS } from "./scenes/phone/PhoneFlow";
import { BUZZ, COIN_BACK, Ready, READY } from "./scenes/Ready";
import { Slams, SLAMS } from "./scenes/Slams";
import { ANSWER_HIT, Slogan, WELL } from "./scenes/Slogan";
import { COIN, STREET, Street, WHIP } from "./scenes/street/Street";
import { CLOCK_DOT, CLOCK_TICKS, TitleCard } from "./scenes/TitleCard";
import { beat, DROP, FPS, MUSIC, sec } from "./timeline";

export const FILM_DURATION = beat(100);

type Scene = { name: string; start: number; Component: ComponentType<{ from: number }>; wipe?: number };

/*
 * The cut list: every scene starts on a beat of the music, most on a hard
 * cut; a wipe covers its cut without overlapping the scenes.
 */
const SCENES: Scene[] = [
  { name: "12:30", start: 0, Component: TitleCard },
  { name: "La file", start: STREET, Component: Street },
  { name: "Commande", start: PHONE, Component: PhoneFlow },
  { name: "N° et attente", start: SLAM, Component: NumberEta },
  { name: "Cuisine", start: KITCHEN, Component: Kitchen, wipe: 16 },
  { name: "Comptoir", start: COUNTER, Component: Counter },
  { name: "C'est prêt", start: READY, Component: Ready },
  { name: "Réseau", start: NETWORK, Component: Network },
  { name: "Promesses", start: SLAMS[0], Component: Slams },
  { name: "Slogan", start: beat(82), Component: Slogan },
  { name: "Fin", start: beat(91), Component: EndCard },
];

const timeline = SCENES.map((scene, i) => ({ ...scene, duration: (SCENES[i + 1]?.start ?? FILM_DURATION) - scene.start }));

export const Film = () => (
  <AbsoluteFill style={{ background: ocp.black }}>
    <TransitionSeries>
      {timeline.flatMap(({ name, start, duration, Component, wipe }) => [
        wipe && (
          <TransitionSeries.Overlay key={`${name}-in`} durationInFrames={wipe}>
            <PaperWipe />
          </TransitionSeries.Overlay>
        ),
        <TransitionSeries.Sequence key={name} name={name} durationInFrames={duration}>
          <Drift>
            <Component from={start} />
          </Drift>
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

/** How much closer every scene drifts over its length: nothing on screen ever stands quite still. */
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
      style={{ background: "#000", opacity: interpolate(frame, [FILM_DURATION - FADE_OUT - BLACK_HOLD, FILM_DURATION - BLACK_HOLD], [0, 1], clamp) }}
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

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** The track is mastered hot: the mix sits here so its true peak stays near −1 dBFS. */
const MASTER = 0.75;

/** Moments the music steps back for a sound that must be heard. */
const DUCKS = [PAID, READY_TAP + 4, BUZZ, ARRIVAL];
const MUSIC_LEVEL = 0.82;
const UNDER = 0.71;
const INTRO_LIFT = 1.12;
/** The beat before the map: the groove falls away, to land again on the pull-out. */
const BREATH = beat(55);

const bedVolume = (f: number) =>
  MUSIC_LEVEL *
  interpolate(f, [MUSIC.filmIn, MUSIC.filmIn + sec(0.8)], [0, 1], clamp) *
  // The breakdown before the drop is thin on small speakers: it sits up (+1 dB) until the scan.
  interpolate(f, [DROP - 6, DROP], [INTRO_LIFT, 1], clamp) *
  interpolate(f, [BREATH - 2, BREATH + 4, NETWORK - 2, NETWORK], [1, 0.22, 0.22, 1], clamp) *
  // Half down just before the number, so its hit stands out of the groove.
  interpolate(f, [SLAM - 20, SLAM - 14, SLAM - 1, SLAM + 4], [1, 0.5, 0.5, 1], clamp) *
  // Under the product, the groove sits back (−3 dB) so the drop and the network stand above it.
  interpolate(
    f,
    [COMPOSE - 6, COMPOSE + 6, SLAM - 26, SLAM - 20, SLAM + 24, SLAM + 36, READY - 4, READY + 2],
    [1, UNDER, UNDER, 1, 1, UNDER, UNDER, 1],
    clamp,
  ) *
  DUCKS.reduce((gain, at) => gain * interpolate(f, [at - 3, at + 2, at + 14, at + 30], [1, 0.62, 0.62, 1], clamp), 1);

/**
 * From the kitchen to the counter the groove thins to its kick and bass,
 * from public/audio/music/groove-kitchen.wav: the track from 69 s to 78.5 s
 * through two 800 Hz low-pass filters
 * (ffmpeg -ss 69 -t 9.5 -i energetic-funky-groove.mp3 -af lowpass=f=800,lowpass=f=800).
 * It comes back whole on the customer's phone.
 */
const THIN = { src: "audio/music/groove-kitchen.wav", trackFrom: 69, level: 0.63 };
const thinning = (f: number) => interpolate(f, [KITCHEN - 2, KITCHEN + 4, READY - 4, READY + 2], [0, 1, 1, 0], clamp);
const thinAt = MUSIC.filmIn + Math.round((THIN.trackFrom - MUSIC.trackIn) * FPS);

/** The small whoosh peaks this long after it starts. */
const WHOOSH_PEAK = sec(0.65);
/** The riser peaks this long after it starts. */
const RISER_PEAK = 77;
/** The impact swells for 2.1 s to its peak: it plays from there, so the break before the last hit stays silent. */
const IMPACT_RISE = sec(2.13);
/** Taps sit under the drop and the hits: they are short, their peaks run high. */
const TAP_LEVEL = 0.45;

const CUES: Cue[] = [
  {
    name: "Ambiance",
    at: 0,
    src: "audio/sfx/ambience.wav",
    // Kept up under the street, so the build to the scan never goes quiet.
    volume: (f) => interpolate(f, [0, 12, beat(-6) - 6, beat(-6) + 10, DROP - 20, DROP], [0, 1, 1, 0.55, 0.5, 0], clamp),
  },
  // public/audio/sfx/clock-tick.wav: tick.wav raised 12 dB (ffmpeg -af volume=12dB), heard over the room.
  ...CLOCK_TICKS.map((at, i) => sfx(`Tic ${i + 1}`, at, "clock-tick", 0.9)),
  sfx("Point", CLOCK_DOT, "bass-hit", 0.45),
  // The whoosh builds: it starts ahead of the cut, its peak (0.65 s in) on it.
  sfx("La rue", STREET - WHOOSH_PEAK, "whoosh-small", 1),
  {
    name: "Musique",
    at: MUSIC.filmIn,
    src: MUSIC.src,
    trimBefore: Math.round(MUSIC.trackIn * FPS),
    volume: (f) => bedVolume(f) * (1 - thinning(f)),
  },
  { name: "Musique, cuisine", at: thinAt, src: THIN.src, volume: (f) => bedVolume(f) * thinning(f) * THIN.level },
  sfx("Pièce", COIN, "coins", 0.8),
  sfx("Fouet caméra", WHIP - WHOOSH_PEAK, "whoosh-small", 1),
  sfx("Montée", DROP - RISER_PEAK, "riser", 0.75),
  sfx("Scan", DROP, "scan", 0.7),
  sfx("Vers la carte", DROP + 8, "whoosh-large", 0.5),
  ...TAPS.map((at, i) => sfx(`Tap ${i + 1}`, at, "tap", TAP_LEVEL)),
  sfx("Paiement", PAID, "payment", 0.7),
  sfx("Payé", IRIS - 4, "whoosh-small", 0.5),
  sfx("N°", SLAM, "bass-hit", 0.6),
  ...LAPSE.map((at, i) => sfx(`Minute ${i + 1}`, at, "tick", 0.6)),
  sfx("Balayage", KITCHEN - 8, "whoosh-small", 0.45),
  ...Array.from({ length: Math.ceil((ROWS.length * LINE_FRAMES) / 28) }, (_, i) =>
    sfx(`Imprimante ${i + 1}`, PRINT + i * 28, "printer", 0.85),
  ),
  sfx("Prête", READY_TAP, "tap", TAP_LEVEL),
  sfx("Sonnette", READY_TAP + 4, "ready", 0.6),
  sfx("Vibreur", BUZZ, "vibration", 0.8),
  sfx("Pièce revenue", COIN_BACK - 6, "coins", 0.35),
  sfx("Réseau", NETWORK, "bass-hit", 0.55),
  // A lift into the network view, peaking as it lands.
  sfx("Montée réseau", VIEW - RISER_PEAK, "riser", 0.9),
  // One tick per frame that lights dots (several can share one), rising in pitch.
  ...[...new Set(dotFrames)].map((f, i, frames) => sfx(`Point ${i + 1}`, FIRST_DOT + f, "tick", 0.22, { pitch: 1 + (i / frames.length) * 0.6 })),
  // N° 39 reaches the head office: the payment's own chime, once more, then its figures tick onto Montpellier's row.
  sfx("N° 39 au siège", ARRIVAL, "payment", 0.75),
  sfx("Montpellier", TICK, "tick", 0.5),
  // A rising tick as the row climbs.
  sfx("Montpellier monte", CLIMB, "tick", 0.5, { pitch: 1.4 }),
  ...SLAMS.map((at, i) => sfx(`Promesse ${i + 1}`, at, "bass-hit", 0.6)),
  // The neon of « Mais bien. » switching on, on its hit.
  sfx("Néon", WELL, "bass-hit", 0.5),
  // And ours, « Et sans attendre. », gets its own on the next hit.
  sfx("Et sans attendre", ANSWER_HIT, "bass-hit", 0.6),
  sfx("Impact final", LAST_HIT, "impact", (f) => 0.8 * interpolate(f, [FILM_DURATION - FADE_OUT * 2, FILM_DURATION], [1, 0], clamp), {
    trimBefore: IMPACT_RISE,
  }),
  sfx("Dernier coup", LAST_HIT, "bass-hit", 0.7),
];
