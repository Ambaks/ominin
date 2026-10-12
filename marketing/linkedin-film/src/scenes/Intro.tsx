import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fonts } from "../brand/fonts";
import { OmininMark } from "../brand/OmininMark";
import { om } from "../brand/tokens";
import { useLayout } from "../kit/layout";
import { springs } from "../kit/motion";
import { beat, DROP } from "../timeline";
import { Appear, Backdrop, clamp, Pill, useIn } from "./common";

const OUT = beat(7.6);
export const CHIPS = [beat(3), beat(4), beat(5)];
const CHAPTERS = ["Commande en ligne", "Estimateur IA", "Fidélisation"];

export const Intro = () => {
  const frame = useCurrentFrame();
  const { pick } = useLayout();
  const mark = useIn(DROP, springs.snappy);
  const ring = interpolate(frame, [DROP, DROP + 26], [0, 1], clamp);
  const flash = interpolate(frame, [DROP, DROP + 3, DROP + 18], [0, 0.55, 0], clamp);
  const leave = interpolate(frame, [OUT, OUT + 6], [1, 0], clamp);

  return (
    <AbsoluteFill>
      <Backdrop y={44} glow={1.5} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "absolute",
            width: 360,
            height: 360,
            top: pick(360, 690) - 180,
            borderRadius: "50%",
            border: `3px solid ${om.ember[1]}`,
            opacity: (1 - ring) * 0.8,
            scale: String(0.4 + ring * 3.2),
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 56, opacity: leave, scale: String(1 + (frame - DROP) / 3000) }}>
        <div style={{ transform: `translateY(${(1 - mark) * 40}px) scale(${0.82 + 0.18 * mark})`, opacity: Math.min(1, mark * 1.5) }}>
          <OmininMark size={pick(190, 150)} />
        </div>
        <Appear
          at={beat(1.5)}
          style={{ textAlign: "center", fontFamily: fonts.sans, fontWeight: 500, fontSize: pick(50, 52), lineHeight: 1.3, color: om.cream, padding: "0 50px" }}
        >
          La commande en ligne et l’IA
          <br />
          <span style={{ color: om.muted }}>pour les restaurants et les fast-foods.</span>
        </Appear>
        <div style={{ display: "flex", flexDirection: pick("row", "column"), alignItems: "center", gap: 22 }}>
          {CHAPTERS.map((label, i) => (
            <Appear key={label} at={CHIPS[i]} pop rise={18}>
              <Pill style={{ fontSize: pick(40, 44), border: `2px solid ${om.ember[1]}`, padding: "14px 30px", width: pick(undefined, 760), justifyContent: "center" }}>
                <span style={{ color: om.ember[0], fontWeight: 700 }}>0{i + 1}</span>
                {label}
              </Pill>
            </Appear>
          ))}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: om.cream, opacity: flash, mixBlendMode: "soft-light" }} />
    </AbsoluteFill>
  );
};
