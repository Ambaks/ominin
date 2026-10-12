import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { phone } from "../captures";
import { bk, PINK_RGB } from "../brand/tokens";
import { Stage } from "../kit/atmosphere";
import { useLayout } from "../kit/layout";
import { springs, useSpring } from "../kit/motion";
import { Reveal } from "../kit/type";
import { beat } from "../timeline";
import { Chip, neon, statement, STATEMENT } from "./styles";

/**
 * Scene 11: the dish itself, in Baï-Kō's own photo — the Dak Bap Spicy in
 * its dolsot — lands on its beat, table 7's chip beside it.
 */
export const SERVED = beat(41);
const LINE = beat(42);
const CHIP = beat(43);
export const SERVED_END = beat(48);
/** In the tall frame, the photo's top and height, in px: clear of the line above it once the drift has grown it. */
const TALL_PHOTO = { top: 510, height: 960 };

export const Served = ({ from }: { from: number }) => {
  const frame = useCurrentFrame();
  const { portrait, pick } = useLayout();
  const at = (abs: number) => abs - from;
  const land = useSpring(0, springs.snappy);
  const chip = useSpring(at(CHIP), springs.snappy);
  const drift = interpolate(frame, [0, at(SERVED_END)], [1, 1.06], { extrapolateRight: "clamp" });
  const photo = { w: pick(620, 760), h: pick(826, TALL_PHOTO.height) };
  return (
    <Stage grid={{ x: pick(1300, 540), y: pick(540, 900), radius: 1100 }}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: portrait ? "flex-start" : "center", paddingTop: pick(0, TALL_PHOTO.top), translate: pick("330px 0", "0 0") }}>
        <div
          style={{
            width: photo.w,
            height: photo.h,
            borderRadius: 36,
            overflow: "hidden",
            boxShadow: `0 0 0 2px rgb(${PINK_RGB} / 0.6), 0 0 60px rgb(${PINK_RGB} / 0.3), 0 40px 80px rgb(0 0 0 / 0.6)`,
            rotate: `${(1 - land) * 6 + 2}deg`,
            scale: String((0.9 + land * 0.1) * drift),
            opacity: Math.min(1, land * 2),
          }}
        >
          <Img src={staticFile("photos/dak-bap-dolsot.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 60%" }} />
        </div>
        <div style={{ marginTop: -36, opacity: chip, translate: `0 ${(1 - chip) * 20}px` }}>
          <Chip tone={bk.cyan} size={pick(26, 30)}>{`Table ${phone.table} · Dak Bap Spicy, dolsot`}</Chip>
        </div>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          alignItems: portrait ? "center" : "flex-start",
          justifyContent: portrait ? "flex-start" : "center",
          padding: pick("0 0 0 170px", "190px 0 0"),
        }}
      >
        <Reveal
          fade
          delay={at(LINE)}
          stagger={3}
          style={{ ...statement, fontSize: pick(STATEMENT.landscape * 1.25, STATEMENT.portrait * 1.1), display: "flex", flexDirection: "column", alignItems: portrait ? "center" : "flex-start", textAlign: portrait ? "center" : "left" }}
        >
          {["Servi.", <span style={neon}>Sans courir.</span>]}
        </Reveal>
      </AbsoluteFill>
    </Stage>
  );
};
