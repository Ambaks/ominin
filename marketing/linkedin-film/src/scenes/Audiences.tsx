import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { fonts } from "../brand/fonts";
import { emberGradient, om } from "../brand/tokens";
import { useLayout } from "../kit/layout";
import { beat } from "../timeline";
import { Qr } from "./art";
import { Accent, Appear, Backdrop, Check } from "./common";

export const AUDIENCES = beat(84);
export const CARDS = [beat(84.5), beat(89.5)];
/** The counter screen's life: N° 42 ready, then N° 41, while N° 43 goes into the kitchen. */
export const COUNTER_STEPS = [beat(91), beat(93), beat(95)];
const CAISSE = beat(96);
const OUT = beat(101.4);

export const Audiences = () => {
  const frame = useCurrentFrame();
  const { portrait, pick } = useLayout();
  return (
    <AbsoluteFill>
      <Backdrop y={55} glow={0.9} />
      <AbsoluteFill style={{ scale: String(1 + (frame - AUDIENCES) / 6000) }}>
        <Appear
          at={AUDIENCES}
          until={OUT}
          style={{ position: "absolute", top: pick(86, 150), left: 60, right: 60, textAlign: "center", fontFamily: fonts.display, fontWeight: 600, fontSize: pick(76, 88), lineHeight: 1.1, color: om.cream }}
        >
          Une plateforme,{portrait ? <br /> : " "}
          <Accent>deux métiers.</Accent>
        </Appear>
        <div style={{ position: "absolute", top: pick(222, 390), left: pick(60, 50), right: pick(60, 50), display: "flex", flexDirection: pick("row", "column"), gap: pick(60, 40) }}>
          <AudienceCard
            at={CARDS[0]}
            title="Restaurants"
            sub="Service à table"
            art={<TableArt at={CARDS[0]} />}
            line="Commande et paiement à table, sans attendre l’addition."
          />
          <AudienceCard
            at={CARDS[1]}
            title="Fast-foods"
            sub="Comptoir et à emporter"
            art={<CounterArt />}
            line="Commande dans la file, retrait à l’heure annoncée."
          />
        </div>
        <Appear
          at={CAISSE}
          until={OUT}
          style={{ position: "absolute", top: pick(925, 1740), left: 0, right: 0, textAlign: "center", fontFamily: fonts.display, fontWeight: 600, fontSize: 64, color: om.cream }}
        >
          <Accent>Sans changer de caisse.</Accent>
        </Appear>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const AudienceCard = ({ at, title, sub, art, line }: { at: number; title: string; sub: string; art: ReactNode; line: string }) => {
  const { pick } = useLayout();
  return (
    <Appear at={at} until={OUT} rise={60} style={{ flex: 1 }}>
      <div style={{ height: pick(670, 615), borderRadius: 40, padding: "38px 46px", background: om.surface, border: `1.5px solid ${om.line}`, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 64, lineHeight: 1, color: om.cream }}>{title}</div>
          <div style={{ fontFamily: fonts.sans, fontWeight: 500, fontSize: 32, color: om.muted }}>{sub}</div>
        </div>
        <div style={{ height: 300, margin: "26px 0 28px", borderRadius: 26, background: om.raised, display: "grid", placeItems: "center", overflow: "hidden" }}>{art}</div>
        <Appear at={at + 12} rise={14} style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: pick(44, 46), lineHeight: 1.2, color: om.cream, textWrap: "balance" }}>
          {line}
        </Appear>
      </div>
    </Appear>
  );
};

const TableArt = ({ at }: { at: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
    <div style={{ padding: 14, borderRadius: 16, background: "#fff", transform: "rotate(-4deg)", boxShadow: "0 14px 30px rgb(0 0 0 / 0.35)" }}>
      <Qr size={190} />
      <div style={{ marginTop: 8, textAlign: "center", fontFamily: fonts.sans, fontWeight: 700, fontSize: 24, color: "#1A1512" }}>Table 12</div>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {["Commande envoyée", "Payée · 32,80 €", "Ticket en cuisine"].map((text, i) => (
        <Appear key={text} at={at + 10 + i * 18} pop rise={12}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 22px", borderRadius: 999, background: i ? "rgb(127 209 160 / 0.16)" : om.surface, fontFamily: fonts.sans, fontWeight: 600, fontSize: 32, color: i ? om.ready : om.cream }}>
          <Check size={28} color={i ? om.ready : om.ember[0]} /> {text}
        </div>
        </Appear>
      ))}
    </div>
  </div>
);

const ORDERS = [
  { n: 41, states: ["En cuisine", "En cuisine", "Prête", "Prête"] },
  { n: 42, states: ["En cuisine", "Prête", "Prête", "Servie"] },
  { n: 43, states: ["Vers 12:58", "Vers 12:58", "En cuisine", "En cuisine"] },
];

const CounterArt = () => {
  const frame = useCurrentFrame();
  const step = COUNTER_STEPS.filter((at) => frame >= at).length;
  return (
  <div style={{ width: 640, borderRadius: 24, padding: "16px 20px", background: om.ink, border: `1.5px solid ${om.line}` }}>
    {ORDERS.map((order) => {
      const state = order.states[step];
      const ready = state === "Prête";
      return (
        <div
          key={order.n}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            borderRadius: 14,
            background: ready ? emberGradient() : "transparent",
            fontFamily: fonts.sans,
            fontWeight: 700,
            fontSize: 46,
            color: ready ? om.ink : om.cream,
            opacity: state === "Servie" ? 0.4 : 1,
          }}
        >
          <span>N°&#8239;{order.n}</span>
          <span style={{ fontWeight: 600, fontSize: 38, color: ready ? om.ink : om.muted }}>{state}</span>
        </div>
      );
    })}
  </div>
  );
};
