import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { fonts } from "../brand/fonts";
import { Lockup, OmininMark } from "../brand/marks";
import { ocp, ominin } from "../brand/tokens";
import { Stage } from "../kit/atmosphere";
import { useLayout } from "../kit/layout";
import { springs, useSpring } from "../kit/motion";
import { beat } from "../timeline";

/**
 * Scene 15: O'Crousti × Ominin and where to reach us, centered as one block.
 */
export const LAST_HIT = beat(95);
const SETTLE_FRAMES = 8;
/** Frames after the hit the × between the marks draws on. */
const CROSS_AT = 9;
/** Ominin's mark, a little under O'Crousti's: the restaurant leads. */
const OMININ = { landscape: 96, portrait: 104 };
/** The address under the marks: the gap to them, in px. */
const CONTACT_GAP = { landscape: 182, portrait: 150 };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const EndCard = () => {
  const { width, height, portrait, pick } = useLayout();
  const frame = useCurrentFrame();
  // Both marks cut in whole on the scene's first hit, settling from a touch large; the × follows.
  const land = { scale: String(interpolate(frame, [0, SETTLE_FRAMES], [1.04, 1], { ...clamp, easing: Easing.out(Easing.exp) })) };
  const cross = useSpring(CROSS_AT, springs.snappy);
  const contact = useSpring(8, springs.smooth);
  const crossSize = pick(40, 46);
  const lockup = pick(106, 112);
  // Side by side, the × and Ominin center on the name line, not on the
  // rooster above it.
  const onNameLine = pick(lockup * 0.84, 0);

  return (
    <Stage rays={{ x: width / 2, y: height * pick(0.5, 0.42), radius: Math.max(width, height) * 0.75, opacity: 0.022 }}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: portrait ? "1fr" : "auto auto auto",
            justifyContent: "center",
            gridTemplateRows: portrait ? "auto auto auto" : "1fr",
            alignItems: "center",
            justifyItems: portrait ? "center" : undefined,
            gap: pick(110, 120),
          }}
        >
          <div style={{ ...land, justifySelf: portrait ? "center" : "end" }}>
            <Lockup size={lockup} />
          </div>
          <svg
            width={crossSize}
            height={crossSize}
            viewBox="0 0 10 10"
            style={{ opacity: cross * 0.6, rotate: `${(1 - cross) * -90}deg`, marginTop: onNameLine, flexShrink: 0 }}
          >
            <path d="M1 1 9 9M9 1 1 9" stroke={ocp.white} strokeWidth="0.7" strokeLinecap="round" />
          </svg>
          <div style={{ ...land, marginTop: onNameLine, justifySelf: portrait ? "center" : "start" }}>
            <OmininMark size={pick(OMININ.landscape, OMININ.portrait)} />
          </div>
        </div>
        <div
          style={{
            marginTop: pick(CONTACT_GAP.landscape, CONTACT_GAP.portrait),
            fontFamily: fonts.poppins,
            fontWeight: 600,
            fontSize: pick(40, 42),
            letterSpacing: "0.03em",
            color: ocp.white,
            opacity: contact,
          }}
        >
          {ominin.url.replace(/^https?:\/\//, "")}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
