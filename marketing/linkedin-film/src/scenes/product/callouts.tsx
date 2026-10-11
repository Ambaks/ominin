import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { fonts } from "../../brand/fonts";
import { emberGradient, om } from "../../brand/tokens";
import { useLayout } from "../../kit/layout";
import { Accent, Appear, Check, euros, ramp } from "../common";
import * as T from "./times";

/*
 * What the phone's screen says at its key moments, magnified beside it
 * (16:9, over the side panel, a line pointing back at the phone) or above
 * it (9:16, in the band under the text): the phone itself stays whole.
 */
export const CALLOUTS = [
  { from: T.MENU + 4, until: T.PRINT - 8 },
  { from: T.HERO_ETA, until: T.MATCH - 8 },
  { from: T.POINTS, until: T.REGULARS - 6 },
  { from: T.RETURN, until: T.BACK - 6 },
];

/** 0 → 1 while a callout is up, for what it covers. */
export const calloutShown = (frame: number) =>
  Math.max(...CALLOUTS.map(({ from, until }) => Math.min(ramp(frame, from - 2, from + 6), 1 - ramp(frame, until, until + 8))));

/** The phone's right edge at rest in 16:9, where the pointer starts. */
const PHONE_EDGE = 1236;
const BOX = { landscape: { left: 1300, width: 560 }, portrait: { left: 70, top: 540, width: 940, height: 215 } };

export const Callouts = () => {
  const frame = useCurrentFrame();
  const { portrait } = useLayout();
  const contents: ReactNode[] = [
    frame < T.TAPS[0] + 2 ? (
      <Big key="menu" label="Menu ouvert" value="1 scan" note="Sans appli à télécharger" />
    ) : frame < T.PAID ? (
      <Big key="pay" label="Votre commande" value={euros(frame < T.TAPS[1] + 2 ? 11.9 : 15.4)} note={frame < T.TAPS[1] + 2 ? "Smash classic" : "Smash classic · Frites maison"} />
    ) : (
      <Big key="paid" label="Payée" value={"N° 42"} note="Envoyée en cuisine" ok />
    ),
    frame < T.READY ? (
      <Big key="eta" label="Prête vers · IA" value={`12:${T.READY_MINUTE}`} note="Annoncée dès le paiement" />
    ) : (
      <Big key="ready" label={"N° 42"} value={"C’est prêt !"} note="Pile à l’heure annoncée" hot />
    ),
    <Big key="points" label="Fidélité" value="+15 points" note="Encore 15 points : un cookie offert" progress={135 / 150} />,
    <Big key="back" label="Samedi suivant" value={"Bon retour, Inès !"} note="Son cookie est offert" small />,
  ];
  return (
    <>
      {CALLOUTS.map(({ from, until }, i) => (
        <Appear
          key={from}
          at={from}
          until={until}
          pop
          rise={20}
          style={
            portrait
              ? { position: "absolute", ...BOX.portrait, display: "flex", alignItems: "center" }
              : { position: "absolute", top: 0, bottom: 0, ...BOX.landscape, display: "flex", alignItems: "center" }
          }
        >
          {!portrait && <div style={{ position: "absolute", left: PHONE_EDGE - BOX.landscape.left, width: BOX.landscape.left - PHONE_EDGE, top: "50%", height: 3, background: om.ember[1] }} />}
          {contents[i]}
        </Appear>
      ))}
    </>
  );
};

const Big = ({
  label,
  value,
  note,
  ok = false,
  hot = false,
  small = false,
  progress,
}: {
  label: string;
  value: string;
  note: string;
  ok?: boolean;
  hot?: boolean;
  small?: boolean;
  progress?: number;
}) => {
  const { portrait, pick } = useLayout();
  const ink = hot ? om.ink : om.cream;
  return (
    <div
      style={{
        width: "100%",
        padding: pick("34px 40px", "24px 40px"),
        borderRadius: 36,
        background: hot ? emberGradient(135) : om.surface,
        border: `2px solid ${hot ? "transparent" : ok ? om.ready : om.ember[1]}`,
        boxShadow: "0 30px 60px rgb(0 0 0 / 0.45)",
        display: "flex",
        flexDirection: portrait ? "row" : "column",
        alignItems: portrait ? "center" : "flex-start",
        justifyContent: "space-between",
        gap: pick(10, 24),
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6, order: portrait ? 2 : 0, textAlign: portrait ? "right" : "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: portrait ? "flex-end" : "flex-start", fontFamily: fonts.sans, fontWeight: 600, fontSize: 30, letterSpacing: "0.08em", textTransform: "uppercase", color: hot ? om.ink : ok ? om.ready : om.muted }}>
          {ok && <Check size={32} color={om.ready} />}
          {label}
        </div>
        {portrait && <Note hot={hot}>{note}</Note>}
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 600,
          // Short figures at full size; words smaller, so they hold in the 16:9 box.
          fontSize: small ? pick(60, 70) : value.length > 7 ? pick(80, 110) : pick(120, 130),
          lineHeight: 1.05,
          color: ink,
          whiteSpace: small && !portrait ? "normal" : "nowrap",
        }}
      >
        {hot || ok ? value : <Accent>{value}</Accent>}
      </div>
      {!portrait && <Note hot={hot}>{note}</Note>}
      {progress !== undefined && !portrait && (
        <div style={{ width: "100%", height: 16, borderRadius: 8, background: om.line }}>
          <div style={{ width: `${progress * 100}%`, height: "100%", borderRadius: 8, background: emberGradient() }} />
        </div>
      )}
    </div>
  );
};

const Note = ({ hot, children }: { hot: boolean; children: ReactNode }) => (
  <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 34, lineHeight: 1.2, color: hot ? om.ink : om.cream }}>{children}</div>
);
