import type { ComponentType } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { om } from "./brand/tokens";
import { Grain } from "./kit/atmosphere";
import { Soundtrack, type Cue } from "./kit/Soundtrack";
import { AUDIENCES, Audiences, CARDS, COUNTER_STEPS } from "./scenes/Audiences";
import { AGAIN, END_CARD, Finale, LAST_HIT, SLAMS, WORDS } from "./scenes/Finale";
import { CLOCK_TICKS, GIVE_UP, Hook } from "./scenes/Hook";
import { CHIPS, Intro } from "./scenes/Intro";
import { Product } from "./scenes/product/Product";
import * as T from "./scenes/product/times";
import { DROP, FILM_DURATION, MUSIC, sec } from "./timeline";

/* Every scene starts on a beat of the music, on a hard cut. */
const SCENES: { start: number; Component: ComponentType }[] = [
  { start: 0, Component: Hook },
  { start: DROP, Component: Intro },
  { start: T.START, Component: Product },
  { start: AUDIENCES, Component: Audiences },
  { start: SLAMS[0], Component: Finale },
];

export const Film = () => {
  const frame = useCurrentFrame();
  const i = SCENES.filter((scene) => frame >= scene.start).length - 1;
  const { Component } = SCENES[i];
  return (
    // A grotesk set tight, as display type wants it; tracked labels set their own spacing.
    <AbsoluteFill style={{ background: om.ink, letterSpacing: "-0.025em" }}>
      <Component />
      <Grain />
      <Soundtrack cues={CUES} gain={MASTER} />
    </AbsoluteFill>
  );
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const sfx = (name: string, at: number, file: string, volume: Cue["volume"], extra: Partial<Cue> = {}): Cue => ({
  name,
  at,
  src: `audio/sfx/${file}.wav`,
  volume,
  ...extra,
});

/** The track is mastered hot: the mix sits here so its true peak stays near −1 dBFS (as in the Big Smash film). */
const MASTER = 0.75;
const MUSIC_LEVEL = 0.82;
/** Under the product the groove steps back (−3 dB) so the UI sounds read. */
const UNDER = 0.71;
const DUCKS = [T.PAID, T.READY, T.BACK];
/** The beat before the audiences: the groove falls away and lands again on the cut. */
const BREATH = AUDIENCES - 18;

const bedVolume = (f: number) =>
  MUSIC_LEVEL *
  interpolate(f, [MUSIC.filmIn, MUSIC.filmIn + sec(0.8)], [0, 1], clamp) *
  interpolate(f, [T.START - 6, T.START + 6, T.END - 6, T.END], [1, UNDER, UNDER, 1], clamp) *
  interpolate(f, [BREATH - 2, BREATH + 4, AUDIENCES - 2, AUDIENCES], [1, 0.25, 0.25, 1], clamp) *
  DUCKS.reduce((gain, at) => gain * interpolate(f, [at - 3, at + 2, at + 14, at + 30], [1, 0.62, 0.62, 1], clamp), 1);

const WHOOSH_PEAK = sec(0.65);
const RISER_PEAK = 77;
const IMPACT_RISE = sec(2.13);
const TAP_LEVEL = 0.45;

const CUES: Cue[] = [
  {
    name: "Ambiance",
    at: 0,
    src: "audio/sfx/ambience.wav",
    volume: (f) => interpolate(f, [0, 10, GIVE_UP, DROP - 10, DROP], [0, 0.9, 0.7, 0.4, 0], clamp),
  },
  ...CLOCK_TICKS.map((at, i) => sfx(`Tic ${i + 1}`, at, "clock-tick", 0.8)),
  sfx("Il repart", GIVE_UP, "whoosh-small", 0.5),
  { name: "Musique", at: MUSIC.filmIn, src: MUSIC.src, trimBefore: Math.round(MUSIC.trackIn * 30), volume: bedVolume },
  sfx("Montée", DROP - RISER_PEAK, "riser", 0.75),
  sfx("Ominin", DROP, "bass-hit", 0.65),
  sfx("Ominin, souffle", DROP, "whoosh-large", 0.45),
  ...CHIPS.map((at, i) => sfx(`Chapitre ${i + 1}`, at, "tick", 0.35, { pitch: 1 + i * 0.2 })),
  sfx("Téléphone", T.START - WHOOSH_PEAK + 6, "whoosh-small", 0.8),
  sfx("Scan", T.SCAN, "scan", 0.7),
  ...T.TAPS.map((at, i) => sfx(`Tap ${i + 1}`, at, "tap", TAP_LEVEL)),
  sfx("Paiement", T.PAID, "payment", 0.7),
  sfx("Imprimante 1", T.PRINT, "printer", 0.8),
  sfx("Imprimante 2", T.PRINT + 28, "printer", 0.6),
  sfx("Terrain", T.PROOF, "whoosh-small", 0.45),
  sfx("IA", T.AI, "bass-hit", 0.5),
  ...T.INPUTS.map((at, i) => sfx(`Signal ${i + 1}`, at, "tick", 0.3, { pitch: 1 + i * 0.12 })),
  sfx("Estimation", T.ESTIMATE, "bass-hit", 0.6),
  ...T.LAPSE.map((at, i) => sfx(`Minute ${i + 1}`, at, "clock-tick", 0.45)),
  sfx("Prête", T.READY, "ready", 0.6),
  sfx("Vibreur", T.READY + 2, "vibration", 0.7),
  sfx("À la minute", T.MATCH + 14, "bass-hit", 0.6),
  sfx("Fidélité", T.LOYALTY, "bass-hit", 0.5),
  sfx("Points", T.POINTS + 6, "coins", 0.5),
  sfx("Samedi suivant", T.RETURN - WHOOSH_PEAK + 4, "whoosh-small", 0.6),
  sfx("De retour", T.BACK + 12, "payment", 0.5),
  sfx("Fidélité, tampons", T.RETENTION, "bass-hit", 0.55),
  sfx("Septième tampon", T.RETENTION + 8 + 18, "coins", 0.5),
  sfx("Deux métiers", AUDIENCES, "bass-hit", 0.55),
  ...COUNTER_STEPS.map((at, i) => sfx(`Comptoir ${i + 1}`, at, "ready", 0.3)),
  ...CARDS.map((at, i) => sfx(`Carte ${i + 1}`, at - WHOOSH_PEAK + 6, "whoosh-small", 0.45)),
  ...SLAMS.map((at, i) => sfx(`Promesse ${i + 1}`, at, "bass-hit", 0.6)),
  ...WORDS.map((at, i) => sfx(`Mot ${i + 1}`, at, "bass-hit", 0.5)),
  sfx("Et il revient", AGAIN, "bass-hit", 0.65),
  sfx("Fin", END_CARD - WHOOSH_PEAK + 4, "whoosh-small", 0.5),
  sfx("Impact final", LAST_HIT, "impact", (f) => 0.8 * interpolate(f, [FILM_DURATION - 36, FILM_DURATION], [1, 0], clamp), { trimBefore: IMPACT_RISE }),
  sfx("Dernier coup", LAST_HIT, "bass-hit", 0.7),
];
