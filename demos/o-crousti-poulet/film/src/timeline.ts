export const FPS = 30;

export const sec = (seconds: number) => Math.round(seconds * FPS);

/*
 * The groove (public/audio/music/energetic-funky-groove.mp3), measured with
 * librosa (beat grid fitted over the whole track): 100 BPM, the groove
 * re-entering after its breakdown at 48.04 s, the final hit at 105.05 s.
 * The film enters the track in its breakdown so the re-entry lands on the
 * QR scan; at 100 BPM and 30 fps a beat is exactly 18 frames.
 */
export const MUSIC = {
  src: "audio/music/energetic-funky-groove.mp3",
  /** Where the film starts reading the track, in track seconds. */
  trackIn: 39.5,
  /** Film frame at which the track comes in. */
  filmIn: sec(2.5),
  /** Track seconds of the re-entry, the film's drop. */
  trackDrop: 48.042,
};

const BPM = 100;
const BEAT = (60 * FPS) / BPM;

/** Film frame of the drop (the scan); beats are counted from it. */
export const DROP = Math.round(MUSIC.filmIn + (MUSIC.trackDrop - MUSIC.trackIn) * FPS);

/** Film frame of beat n (negative before the drop). */
export const beat = (n: number) => Math.round(DROP + n * BEAT);
