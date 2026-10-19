import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { fonts } from "../brand/fonts";
import { bk, PINK_RGB } from "../brand/tokens";
import { Stage } from "../kit/atmosphere";
import { useLayout } from "../kit/layout";
import { CLAMP } from "../kit/motion";
import { Reveal } from "../kit/type";
import { beat } from "../timeline";
import { Kicker, statement, STATEMENT } from "./styles";

/**
 * Scene 12: measured at an Ominin client (frontend/lib/pitch/kit.ts,
 * fieldReport, published at ominin.com/r7k2): the median time from order
 * to kitchen ticket of the same Ominin QR orders, paid online from the
 * table against settled at the counter — the ticket prints once the order
 * is paid. The figures are the kit's, copied: the film is its own project.
 */
export const PROOF = beat(48);
const TITLE = beat(49);
const RACE = beat(51);
const SOURCE = beat(53);
/** The lanes fade in over the frames before the race: no empty bars ahead of the title. */
const LANES_IN = 6;
const FIELD = { onlineSeconds: 18, counterSeconds: 279, online: 435, counter: 1_545 };
/** The kit's thousands(): groups split by a no-break space, wide enough that « 1 545 » reads as a count. */
const thousands = (value: number) => value.toLocaleString("fr-FR").replace(/\u202f/g, "\u00a0");
/** Frames each bar takes to grow, at the scale of the longest. */
const GROW = 40;


const Lane = ({ label, seconds, start, tone }: { label: string; seconds: number; start: number; tone: string }) => {
  const frame = useCurrentFrame();
  const { pick } = useLayout();
  const t = interpolate(frame - start, [0, GROW], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
  const width = Math.max(0.02, seconds / FIELD.counterSeconds) * t;
  const value = Math.round(seconds * t);
  const shown = seconds >= 60 ? `${Math.floor(value / 60)}\u00a0min\u00a0${String(value % 60).padStart(2, "0")}` : `${value}\u00a0s`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 40 }}>
        <span style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: pick(36, 34), color: bk.white }}>{label}</span>
        <span style={{ fontFamily: fonts.display, fontSize: pick(110, 96), lineHeight: 1, color: tone }}>{shown}</span>
      </div>
      <div style={{ height: pick(30, 26), borderRadius: 999, background: "rgb(238 238 245 / 0.08)" }}>
        <div style={{ width: `${width * 100}%`, height: "100%", borderRadius: 999, background: tone, boxShadow: tone === bk.pink ? `0 0 24px rgb(${PINK_RGB} / 0.6)` : undefined }} />
      </div>
    </div>
  );
};

export const Proof = ({ from }: { from: number }) => {
  const frame = useCurrentFrame();
  const { width, height, pick } = useLayout();
  const at = (abs: number) => abs - from;
  return (
    <Stage grid={{ x: width / 2, y: height * 0.5, radius: Math.max(width, height) * 0.7 }}>
      <AbsoluteFill style={{ justifyContent: "center", padding: pick("0 180px", "0 80px") }}>
        {/* Whose figures, before the figures; on one line in the tall frame too. */}
        <Kicker delay={at(PROOF) + 2} size={pick(26, 36)}>
          {pick("Chez un client Ominin, à Toulouse", "Client Ominin, à Toulouse")}
        </Kicker>
        <Reveal fade delay={at(TITLE)} stagger={3} style={{ ...statement, fontSize: pick(STATEMENT.landscape, STATEMENT.portrait), marginTop: 30, display: "flex", flexDirection: "column" }}>
          {["De la table à la cuisine,", <span style={{ color: bk.pink }}>{`en ${FIELD.onlineSeconds}\u00a0secondes.`}</span>]}
        </Reveal>
        <div style={{ marginTop: pick(70, 90), display: "flex", flexDirection: "column", gap: pick(44, 60), opacity: interpolate(frame - at(RACE), [-LANES_IN, 0], [0, 1], CLAMP) }}>
          <Lane label="Payée à table" seconds={FIELD.onlineSeconds} start={at(RACE)} tone={bk.pink} />
          <Lane label="Réglée au comptoir" seconds={FIELD.counterSeconds} start={at(RACE) + 6} tone={bk.muted} />
        </div>
        {/* Two lines, each whole in the tall frame. */}
        <Reveal fade delay={at(SOURCE)} stagger={3} style={{ marginTop: pick(50, 70), display: "flex", flexDirection: "column", fontFamily: fonts.sans, fontWeight: 600, fontSize: pick(28, 30), lineHeight: 1.4, color: bk.muted }}>
          {[
            "Médianes de la commande au ticket, qui sort au paiement",
            `${thousands(FIELD.online)} payées à table, ${thousands(FIELD.counter)} au comptoir · ominin.com/r7k2`,
          ]}
        </Reveal>
      </AbsoluteFill>
    </Stage>
  );
};

