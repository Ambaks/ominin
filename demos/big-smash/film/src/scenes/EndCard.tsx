import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { fonts } from "../brand/fonts";
import { Lockup, OmininMark } from "../brand/marks";
import { bs, ominin } from "../brand/tokens";
import { Stage } from "../kit/atmosphere";
import { useLayout } from "../kit/layout";
import { springs, useSpring } from "../kit/motion";
import { beat } from "../timeline";

/**
 * Scene 15: Big Smash × Ominin and where to reach us, centered as one block.
 */
export const LAST_HIT = beat(95);
const SETTLE_FRAMES = 8;
/** On the track's last hit the lockup answers it, a small punch: the film's loudest sound landed on a still frame. */
const HIT_PUNCH = 0.05;
/** Frames after the hit the × between the marks draws on. */
const CROSS_AT = 9;
/** Ominin's mark, a little under Big Smash's: the restaurant leads. */
const OMININ = { landscape: 96, portrait: 104 };
/** The address under the marks: the gap to them, in px. */
const CONTACT_GAP = { landscape: 182, portrait: 150 };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const EndCard = ({ from }: { from: number }) => {
  const { width, height, portrait, pick } = useLayout();
  const frame = useCurrentFrame();
  // Both marks cut in whole on the scene's first hit, settling from a touch large; the × follows.
  const hit = useSpring(LAST_HIT - from, springs.snappy);
  const punch = 1 + HIT_PUNCH * Math.sin(Math.min(1, hit) * Math.PI);
  const land = { scale: String(interpolate(frame, [0, SETTLE_FRAMES], [1.04, 1], { ...clamp, easing: Easing.out(Easing.exp) }) * punch) };
  const cross = useSpring(CROSS_AT, springs.snappy);
  const contact = useSpring(8, springs.smooth);
  const crossSize = pick(40, 46);
  const lockup = pick(128, 136);

  return (
    <Stage motif={{ x: width / 2, y: height * pick(0.5, 0.42), radius: Math.max(width, height) * 0.75, opacity: 0.022 }}>
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
            style={{ opacity: cross * 0.6, rotate: `${(1 - cross) * -90}deg`, flexShrink: 0 }}
          >
            <path d="M1 1 9 9M9 1 1 9" stroke={bs.white} strokeWidth="0.7" strokeLinecap="round" />
          </svg>
          <div style={{ ...land, justifySelf: portrait ? "center" : "start" }}>
            <OmininMark size={pick(OMININ.landscape, OMININ.portrait)} />
          </div>
        </div>
        {/* La proposition, puis l'adresse : la fin du film dit ce qu'on attend du siège. */}
        <div
          style={{
            marginTop: pick(CONTACT_GAP.landscape, CONTACT_GAP.portrait),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            fontFamily: fonts.archivo,
            color: bs.white,
            opacity: contact,
            textAlign: "center",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: pick(44, 48), color: bs.white }}>
            {"Un pilote de "}
            <span style={{ color: bs.red }}>{"30\u00a0jours"}</span>
            {","}
            {portrait ? <br /> : " "}
            {"matériel fourni."}
          </div>
          <div style={{ fontWeight: 600, fontSize: pick(40, 42), letterSpacing: "0.03em" }}>{ominin.url.replace(/^https?:\/\//, "")}</div>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
