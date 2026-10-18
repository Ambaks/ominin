import type { ComponentType } from "react";
import { AbsoluteFill, interpolate, Sequence } from "remotion";
import { Grain } from "../kit/atmosphere";
import { Soundtrack, type Cue } from "../kit/Soundtrack";
import { clamp } from "../scenes/common";
import { Back, Dance, End, Night, Pickup, PRINT_AT, Ready, READY_AT, Silence, Slams } from "./night";
import { CLOCK_MINUTES, Drop, Floor, Queue } from "./opening";
import { Order, ORDER, ORDER_TAPS } from "./order";
import { clockTick, CLUB_DURATION, SCENE, SLAM_BEATS } from "./timeline";
import { club } from "./tokens";

/*
 * « Commander sans quitter la piste » : a night at a club, before and with
 * Ominin. Every scene starts on a beat of the track, on a hard cut, and
 * reads its own frames.
 */
const SCENES: [start: number, Component: ComponentType][] = [
  [SCENE.floor, Floor],
  [SCENE.queue, Queue],
  [SCENE.drop, Drop],
  [SCENE.order, Order],
  [SCENE.dance, Dance],
  [SCENE.ready, Ready],
  [SCENE.pickup, Pickup],
  [SCENE.night, Night],
  [SCENE.back, Back],
  [SCENE.slams, Slams],
  [SCENE.silence, Silence],
  [SCENE.end, End],
];

export const ClubFilm = () => (
  <AbsoluteFill style={{ background: club.night, letterSpacing: "-0.025em" }}>
    {SCENES.map(([start, Component], i) => (
      <Sequence key={start} from={start} durationInFrames={(SCENES[i + 1]?.[0] ?? CLUB_DURATION) - start} name={Component.name}>
        <Component />
      </Sequence>
    ))}
    <Grain />
    <Soundtrack cues={CUES} gain={MASTER} />
  </AbsoluteFill>
);

const sfx = (name: string, at: number, file: string, volume: Cue["volume"], extra: Partial<Cue> = {}): Cue => ({
  name,
  at,
  src: `audio/sfx/${file}.wav`,
  volume,
  ...extra,
});

/** The mix's headroom, as in the LinkedIn film. */
const MASTER = 0.75;
const MUSIC_LEVEL = 0.8;
/** Under the phone the track steps back so the interface sounds read. */
const UNDER = 0.62;
const FADE_OUT = 75;
/** The riser's peak and the impact's attack, in frames into their files. */
const RISER_PEAK = 77;
const IMPACT_RISE = 64;
const WHOOSH_PEAK = 20;

const musicVolume = (f: number) =>
  MUSIC_LEVEL *
  interpolate(f, [SCENE.order - 6, SCENE.order + 10, SCENE.dance - 10, SCENE.dance], [1, UNDER, UNDER, 1], clamp) *
  interpolate(f, [SCENE.ready + READY_AT - 4, SCENE.ready + READY_AT + 4, SCENE.ready + READY_AT + 40, SCENE.ready + READY_AT + 60], [1, 0.55, 0.55, 1], clamp) *
  interpolate(f, [CLUB_DURATION - FADE_OUT, CLUB_DURATION], [1, 0], clamp);

const o = SCENE.order;

const CUES: Cue[] = [
  { name: "Musique", at: 0, src: "audio/music/cbpd.mp3", volume: musicVolume },
  {
    name: "Foule au bar",
    at: SCENE.queue,
    src: "audio/sfx/ambience.wav",
    volume: (f) => interpolate(f, [SCENE.queue, SCENE.queue + 12, SCENE.drop - 20, SCENE.drop], [0, 0.55, 0.45, 0], clamp),
  },
  sfx("Vers le bar", SCENE.queue - WHOOSH_PEAK, "whoosh-small", 0.5),
  ...Array.from({ length: CLOCK_MINUTES }, (_, k) => sfx(`Minute ${k + 1}`, clockTick(k), "tick", 0.3)),
  sfx("Montée", SCENE.drop - RISER_PEAK, "riser", 0.6),
  sfx("Le beat", SCENE.drop, "bass-hit", 0.7),
  sfx("Le beat, souffle", SCENE.drop, "whoosh-large", 0.45),
  sfx("Téléphone", o - WHOOSH_PEAK + 4, "whoosh-small", 0.6),
  sfx("Scan", o + ORDER.lock, "scan", 0.6),
  ...ORDER_TAPS.map((at, i) => sfx(`Tap ${i + 1}`, o + at, "tap", 0.45)),
  sfx("Paiement", o + ORDER.paid, "payment", 0.6),
  sfx("Imprimante", SCENE.dance + PRINT_AT + 4, "printer", 0.75),
  sfx("Imprimante, suite", SCENE.dance + PRINT_AT + 30, "printer", 0.55),
  sfx("Prête", SCENE.ready + READY_AT, "ready", 0.55),
  sfx("Vibreur", SCENE.ready + READY_AT + 1, "vibration", 0.8),
  sfx("Vers le retrait", SCENE.pickup - WHOOSH_PEAK + 4, "whoosh-small", 0.5),
  sfx("Remis", SCENE.pickup + 150, "pop-whoosh", 0.6),
  sfx("Le pic", SCENE.night, "bass-hit-future", 0.6),
  sfx("Samedi suivant", SCENE.back - WHOOSH_PEAK + 4, "whoosh-small", 0.55),
  sfx("Points", SCENE.back + 44, "coins", 0.45),
  ...SLAM_BEATS.map((at, i) => sfx(`Promesse ${i + 1}`, at, "bass-hit", 0.6)),
  sfx("Silence, montée", SCENE.end - RISER_PEAK, "riser", 0.5),
  sfx("Fin", SCENE.end, "impact", (f) => 0.75 * interpolate(f, [CLUB_DURATION - FADE_OUT, CLUB_DURATION], [1, 0], clamp), { trimBefore: IMPACT_RISE }),
  sfx("Fin, coup", SCENE.end, "bass-hit", 0.7),
];
