import { FPS } from "../timeline";

/*
 * The club film runs on C.B.P.D (public/audio/music/cbpd.mp3, Mixkit),
 * measured at about 143.5 BPM, first beat at 0.30 s. It comes in on beat 60
 * of the track, in the groove (the quiet intro is skipped): the track peaks
 * from beat 126, falls silent at 64.75 s and lands again on beat 157, the
 * end card.
 */
const BPM = 143.5;
const FIRST_BEAT = 0.3;
const START_BEAT = 60;

/** Frames per beat, unrounded: what the dancers, strobes and cuts count with. */
export const BEAT = (60 / BPM) * FPS;

/** Track second the film starts on. */
export const TRACK_IN = FIRST_BEAT + (START_BEAT * 60) / BPM;

/** Film frame of beat n of the track. */
export const beat = (n: number) => Math.round((n - START_BEAT) * BEAT);

/** n beats, in frames: the scenes count their own moments with it. */
export const beats = (n: number) => Math.round(n * BEAT);

export const SCENE = {
  floor: 0,
  queue: beat(66),
  drop: beat(77),
  order: beat(81),
  dance: beat(101),
  ready: beat(109),
  pickup: beat(115),
  night: beat(126),
  back: beat(134),
  slams: beat(141),
  silence: Math.round((64.75 - TRACK_IN) * FPS),
  end: beat(157),
};

/** The three statements, one every four beats. */
export const SLAM_BEATS = [141, 145, 149].map(beat);

/** The queue clock: a minute every quarter beat, from the queue's second beat. */
export const clockTick = (k: number) => SCENE.queue + beats(1 + k / 4);

/** The end card holds, then the music fades out under it. */
export const CLUB_DURATION = SCENE.end + Math.round(4.5 * FPS);
