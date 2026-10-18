import { Composition } from "remotion";
import { ClubFilm } from "./club/ClubFilm";
import { PHONE_STILLS, PhoneStills, SPAN } from "./club/PhoneStills";
import { CLUB_DURATION } from "./club/timeline";
import { Film } from "./Film";
import { FILM_DURATION, FPS } from "./timeline";

// The LinkedIn feed cut (16:9) and the phone cut (9:16) share every scene: each reads its frame through useLayout().
export const Root = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={FILM_DURATION} fps={FPS} width={1920} height={1080} />
    <Composition id="Film-9x16" component={Film} durationInFrames={FILM_DURATION} fps={FPS} width={1080} height={1920} />
    <Composition id="Club" component={ClubFilm} durationInFrames={CLUB_DURATION} fps={FPS} width={1920} height={1080} />
    <Composition id="Club-9x16" component={ClubFilm} durationInFrames={CLUB_DURATION} fps={FPS} width={1080} height={1920} />
    <Composition id="Club-Phone" component={PhoneStills} durationInFrames={PHONE_STILLS.length * SPAN} fps={FPS} width={393} height={852} />
  </>
);
