import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fonts } from "../brand/fonts";
import { bk } from "../brand/tokens";
import { useLayout } from "../kit/layout";
import { CLAMP, springs, useSpring } from "../kit/motion";
import { Counter, Reveal, TICK_ROLL } from "../kit/type";
import { beat } from "../timeline";
import { ROOM, ROOM_CLOCK, ROOM_PUSH, RoomPhoto } from "./room/Room";
import { Kicker, neon } from "./styles";

/** Three minutes, 12:34 → 12:37, one tick per beat of the music's grid: the room's clock runs on from there to the order's 12:41. */
export const CLOCK_TICKS = [beat(-18), beat(-17), beat(-16)];
const FIRST_MINUTE = ROOM_CLOCK.minute - CLOCK_TICKS.length;
export const CLOCK_DOT = CLOCK_TICKS[CLOCK_TICKS.length - 1] + 6;
/**
 * Their room behind the clock from the first frame, dimmed and out of focus,
 * drifting closer to the room scene's first framing: the room scene brings it
 * up sharp, framed the same (the title stands out of the scenes' drift).
 */
const BACKDROP = { veil: 0.62, blur: 5 };

/** Opening: the clock runs over their dimmed room — a Saturday lunch at the Arceaux. */
export const TitleCard = () => {
  const frame = useCurrentFrame();
  const { pick } = useLayout();
  const numeral = pick(460, 320);
  const open = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const dot = useSpring(CLOCK_DOT, springs.snappy);
  const passed = CLOCK_TICKS.filter((tick) => frame >= tick);
  const minute = FIRST_MINUTE + passed.length;
  const lastTick = passed.at(-1);

  return (
    <AbsoluteFill style={{ background: bk.black }}>
      <RoomPhoto push={interpolate(frame, [0, ROOM], [1, pick(ROOM_PUSH.landscape, ROOM_PUSH.portrait).from], CLAMP)} veil={BACKDROP.veil} blur={BACKDROP.blur} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Kicker delay={CLOCK_DOT + 2} size={pick(40, 36)}>
          Samedi midi, aux Arceaux
        </Kicker>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontFamily: fonts.display,
            fontSize: numeral,
            lineHeight: 1,
            letterSpacing: "0.01em",
            color: bk.white,
            margin: `${numeral * 0.04}px 0 ${numeral * 0.02}px`,
            opacity: open,
            scale: String(1.04 - open * 0.04),
          }}
        >
          <span>{`${ROOM_CLOCK.hour}:`}</span>
          {lastTick === undefined ? <span>{minute}</span> : <Counter key={lastTick} from={minute - 1} to={minute} delay={lastTick} duration={TICK_ROLL} />}
          <span style={{ color: bk.pink, display: "inline-block", scale: String(dot), transformOrigin: "50% 85%" }}>.</span>
        </div>
        <Reveal split="word" delay={CLOCK_DOT + 4} stagger={2} style={{ ...neon, fontSize: pick(140, 120), textAlign: "center", padding: "0 64px" }}>
          La salle est pleine.
        </Reveal>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
