import { FPS } from "../timeline";

/*
 * The club film runs on C.B.P.D (public/audio/music/cbpd.mp3, Mixkit), read
 * from its first second. Measured on the file: about 143.5 BPM, first beat
 * at 0.30 s; the beat comes in at 13.26 s (beat 31), the track peaks from
 * beat 126, falls silent at 64.75 s and lands again on beat 157.
 */
const BPM = 143.5;
const FIRST_BEAT = 0.3;

/** Film frame of beat n of the track. */
export const beat = (n: number) => Math.round((FIRST_BEAT + (n * 60) / BPM) * FPS);

/** Frames per beat, unrounded: what the dancers and strobes count with. */
export const BEAT = (60 / BPM) * FPS;

export const SCENE = {
  floor: 0,
  queue: beat(10),
  drop: beat(31),
  order: beat(37),
  dance: beat(71),
  ready: beat(88),
  pickup: beat(102),
  night: beat(126),
  back: beat(133),
  slams: beat(142),
  silence: Math.round(64.75 * FPS),
  end: beat(157),
};

/** The three statements, one every four beats. */
export const SLAM_BEATS = [142, 146, 150].map(beat);

/** The queue clock: a minute every half beat, from beat 12 of the track. */
export const clockTick = (k: number) => beat(12 + k / 2);

/** The end card holds, then the music fades out under it. */
export const CLUB_DURATION = SCENE.end + Math.round(5.5 * FPS);
