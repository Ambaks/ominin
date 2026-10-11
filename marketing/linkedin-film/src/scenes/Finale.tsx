import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fonts } from "../brand/fonts";
import { OmininMark } from "../brand/OmininMark";
import { emberGradient, om } from "../brand/tokens";
import { springs } from "../kit/motion";
import { useLayout } from "../kit/layout";
import { beat, FILM_DURATION } from "../timeline";
import { Accent, Appear, Backdrop, Check, clamp, Stamps, useIn } from "./common";
import { TimeTile } from "./product/panels";

export const SLAMS = [beat(102), beat(105.5), beat(109)];
const SLAM_TEXT = [
  { title: "Moins d’attente.", proof: <WaitBars /> },
  { title: "Prêt à l’heure annoncée.", proof: <OnTime /> },
  { title: "Des clients qui reviennent.", proof: <Regular /> },
];
const SLOGAN = beat(113);
export const WORDS = [beat(113), beat(114.5), beat(116)];
export const AGAIN = beat(118);
export const END_CARD = beat(123);
export const LAST_HIT = beat(127);

export const Finale = () => {
  const frame = useCurrentFrame();
  if (frame >= END_CARD) return <EndCard />;
  if (frame >= SLOGAN) return <Slogan />;
  const i = SLAMS.filter((at) => frame >= at).length - 1;
  return <Slam key={i} at={SLAMS[i]} {...SLAM_TEXT[i]} />;
};

const Slam = ({ at, title, proof }: { at: number; title: string; proof: ReactNode }) => {
  const frame = useCurrentFrame();
  const { pick } = useLayout();
  const t = useIn(at, springs.snappy);
  return (
    <AbsoluteFill>
      <Backdrop glow={1.3} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: pick(60, 80), scale: String(1 + (frame - at) / 1800) }}>
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 600,
            fontSize: pick(160, 140),
            lineHeight: 1,
            letterSpacing: "-0.045em",
            color: om.cream,
            textAlign: "center",
            maxWidth: pick(1760, 980),
            textWrap: "balance",
            opacity: Math.min(1, t * 1.6),
            transform: `scale(${1.18 - 0.18 * t})`,
          }}
        >
          {title}
        </div>
        <Appear at={at + 8} pop rise={30}>
          {proof}
        </Appear>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** The three words stand faint from the start and light up on their hits, so the line never reflows. */
const Slogan = () => {
  const frame = useCurrentFrame();
  const { pick } = useLayout();
  const words = ["Commandé.", "Payé.", "Prêt."];
  return (
    <AbsoluteFill>
      <Backdrop glow={0.8} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: pick(40, 70), scale: String(1 + (frame - SLOGAN) / 3000) }}>
        <div
          style={{
            display: "flex",
            flexDirection: pick("row", "column"),
            alignItems: "center",
            gap: pick(54, 10),
            fontFamily: fonts.display,
            fontWeight: 600,
            fontSize: pick(150, 170),
            lineHeight: 1.05,
            color: om.cream,
          }}
        >
          {words.map((word, i) => (
            <Word key={word} at={WORDS[i]}>
              {word}
            </Word>
          ))}
        </div>
        <Tracker />
        <Appear at={AGAIN} pop rise={30} style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: pick(130, 130), lineHeight: 1.1, textAlign: "center" }}>
          <Accent>Et il revient.</Accent>
        </Appear>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const GHOST = 0.12;

/** The order tracker under the three words: each word lights its step. */
const Tracker = () => {
  const frame = useCurrentFrame();
  const { pick } = useLayout();
  const width = pick(1000, 720);
  const fill = interpolate(frame, [WORDS[0], WORDS[1], WORDS[1] + 6, WORDS[2], WORDS[2] + 6], [0, 0, 0.5, 0.5, 1], clamp);
  return (
    <div style={{ position: "relative", width, height: 36 }}>
      <div style={{ position: "absolute", left: 18, right: 18, top: 15, height: 6, borderRadius: 3, background: om.line }} />
      <div style={{ position: "absolute", left: 18, top: 15, height: 6, borderRadius: 3, width: (width - 36) * fill, background: emberGradient() }} />
      {WORDS.map((at, i) => {
        const on = frame >= at;
        return (
          <div
            key={at}
            style={{
              position: "absolute",
              top: 0,
              left: (i * (width - 36)) / 2,
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: on ? emberGradient(135) : om.raised,
              border: `2px solid ${on ? "transparent" : om.line}`,
              boxShadow: on ? "0 0 24px rgb(226 118 75 / 0.6)" : undefined,
            }}
          />
        );
      })}
    </div>
  );
};

const Word = ({ at, children }: { at: number; children: ReactNode }) => {
  const t = useIn(at, springs.snappy);
  return <span style={{ opacity: GHOST + (1 - GHOST) * Math.min(1, t), display: "inline-block", transform: `scale(${1 + 0.08 * Math.sin(Math.PI * Math.min(1, t))})` }}>{children}</span>;
};

const EndCard = () => {
  const frame = useCurrentFrame();
  const { pick } = useLayout();
  const t = useIn(END_CARD, springs.smooth);
  const punch = interpolate(frame, [LAST_HIT, LAST_HIT + 3, LAST_HIT + 14], [0, 1, 0], clamp);
  /** A slow breath on the logo's glow, one cycle per bar of the music. */
  const breath = 0.5 - 0.5 * Math.cos(((frame - END_CARD) / 72) * 2 * Math.PI);
  return (
    <AbsoluteFill>
      <Backdrop y={42} glow={1.2 + punch} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, scale: String(1 + 0.04 * punch + (frame - END_CARD) / 9000) }}>
        <div style={{ opacity: t, transform: `translateY(${(1 - t) * 30}px)`, filter: `drop-shadow(0 0 ${24 + 18 * breath}px rgb(255 166 98 / ${0.25 + 0.2 * breath}))` }}>
          <OmininMark size={pick(150, 140)} />
        </div>
        <Appear at={END_CARD + 4} style={{ textAlign: "center", fontFamily: fonts.sans, fontWeight: 500, fontSize: pick(52, 52), lineHeight: 1.3, color: om.cream, padding: "0 60px", textWrap: "balance" }}>
          Commande en ligne, estimateur IA et fidélité, pour les restaurants et les fast-foods.
        </Appear>
        <Appear at={END_CARD + 8} pop style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: pick(130, 120) }}>
          <Accent>ominin.com</Accent>
        </Appear>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#000", opacity: interpolate(frame, [FILM_DURATION - 20, FILM_DURATION - 3], [0, 1], clamp) }} />
    </AbsoluteFill>
  );
};

const proofText = { fontFamily: fonts.sans, fontWeight: 600, fontSize: 50, color: om.cream } as const;

/** The field report's median, as one giant figure against the counter's. */
function WaitBars() {
  const { pick } = useLayout();
  return (
    <div style={{ display: "flex", flexDirection: pick("row", "column"), alignItems: pick("baseline", "center"), gap: pick(40, 0) }}>
      <span style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: pick(240, 260), lineHeight: 1 }}>
        <Accent>{"18\u202fs"}</Accent>
      </span>
      <span style={{ ...proofText, fontSize: pick(64, 56), color: om.cream }}>{"au lieu de 4\u202fmin\u202f39 au comptoir"}</span>
    </div>
  );
}

/** The precision beat, recalled: announced and ready, the same minute. */
function OnTime() {
  const { pick } = useLayout();
  const announced = useIn(SLAMS[1] + 8, springs.snappy);
  const ready = useIn(SLAMS[1] + 13, springs.snappy);
  const verdict = useIn(SLAMS[1] + 18, springs.snappy);
  return (
    <div style={{ display: "flex", flexDirection: pick("row", "column"), alignItems: "center", gap: pick(28, 18) }}>
      <TimeTile label="Annoncée par l’IA" t={announced} size={pick(130, 170)} />
      <div style={{ width: 84, height: 84, borderRadius: "50%", display: "grid", placeItems: "center", background: "rgb(127 209 160 / 0.16)", transform: `scale(${verdict})` }}>
        <Check size={50} color={om.ready} />
      </div>
      <TimeTile label="Prête" t={ready} ok size={pick(130, 170)} />
    </div>
  );
}

/** Inès's card again, the chapter's payoff recalled. */
function Regular() {
  const { pick } = useLayout();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Stamps from={SLAMS[2] + 8} count={7} size={pick(110, 100)} gap={pick(22, 14)} />
      <div style={{ ...proofText, fontSize: pick(56, 48), color: om.ember[0] }}>Inès, 7ᵉ commande</div>
    </div>
  );
}

