export const FPS = 30;

export const sec = (seconds: number) => Math.round(seconds * FPS);

/*
 * The groove (public/audio/music/energetic-funky-groove.mp3, 100 BPM, as
 * measured for the Big Smash film), with beats 16–32 after the drop played
 * three times (energetic-funky-groove-ext.wav) so every step can be read:
 * its re-entry after the breakdown at 48.042 s is the film's drop (the
 * logo), its final hit at 124.25 s lands on beat 127 (the end card). At
 * 100 BPM and 30 fps a beat is 18 frames.
 */
export const MUSIC = {
  src: "audio/music/energetic-funky-groove-ext.wav",
  /** Where the film starts reading the track, in track seconds. */
  trackIn: 42,
  /** Film frame at which the track comes in. */
  filmIn: sec(1),
  trackDrop: 48.042,
};

const BEAT = (60 * FPS) / 100;

/** Film frame of the drop; beats are counted from it. */
export const DROP = Math.round(MUSIC.filmIn + (MUSIC.trackDrop - MUSIC.trackIn) * FPS);

/** Film frame of beat n (negative before the drop). */
export const beat = (n: number) => Math.round(DROP + n * BEAT);

export const FILM_DURATION = beat(132);
