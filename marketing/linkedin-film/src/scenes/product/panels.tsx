import type { ReactNode } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fonts } from "../../brand/fonts";
import { emberGradient, om } from "../../brand/tokens";
import { useLayout } from "../../kit/layout";
import { springs } from "../../kit/motion";
import { Accent, Appear, Check, clamp, ramp, Stamps, useIn } from "../common";
import * as T from "./times";

// The right-hand column of the product chapters, laid out 520 px wide and scaled up to its box by Product.
export const PANEL = { width: 520 };

const thermalPaper = "linear-gradient(90deg, #E9E5DB, #F7F4EC 12%, #FBF9F3 50%, #F4F1E8 88%, #E6E2D7)";
const TICKET_LINES = ["LE PETIT COMPTOIR", `N° 42        12:${T.ORDER_MINUTE}`, "EN LIGNE · PAYÉE", "------------------", "1x SMASH CLASSIC", "1x FRITES MAISON", "------------------"];
const LINE = 40;

export const KitchenTicket = () => {
  const frame = useCurrentFrame();
  const { portrait, pick } = useLayout();
  const t = useIn(T.PRINT - 6);
  const fed = interpolate(frame, [T.PRINT, T.PRINT + 22], [0, TICKET_LINES.length * LINE + 50], clamp);
  return (
    <Appear
      at={T.PRINT - 6}
      until={T.PROOF - 4}
      style={{ position: "absolute", top: pick(150, 20), left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", scale: pick("1", "0.78"), transformOrigin: "50% 0" }}
    >
      {!portrait && <Label>Cuisine</Label>}
      <div style={{ position: "relative", marginTop: 18, width: 400, height: 34, borderRadius: 12, background: om.raised, border: `1.5px solid ${om.line}`, zIndex: 1 }}>
        <span style={{ position: "absolute", right: 16, top: 12, width: 9, height: 9, borderRadius: "50%", background: frame % 12 < 6 && t > 0.5 ? om.ready : om.faint }} />
      </div>
      <div style={{ marginTop: -10, width: 360, height: fed, overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
        <div
          style={{
            width: "100%",
            padding: "26px 28px 24px",
            background: thermalPaper,
            fontFamily: fonts.mono,
            fontWeight: 500,
            fontSize: 25,
            lineHeight: `${LINE}px`,
            color: "#1d1a16",
            whiteSpace: "pre",
            boxShadow: "0 18px 30px rgb(0 0 0 / 0.35)",
          }}
        >
          {TICKET_LINES.map((line, i) => (
            <div key={i} style={{ fontWeight: i === 1 ? 700 : 500, fontSize: i === 1 ? 30 : 25 }}>
              {line}
            </div>
          ))}
        </div>
      </div>
    </Appear>
  );
};

const COUNTER_SECONDS = 4 * 60 + 39;
const ONLINE_SECONDS = 18;

/** BOHO's field report (ominin.com/r7k2), anonymised as it is published there: it takes the phone's place. */
export const Proof = () => {
  const frame = useCurrentFrame();
  const { portrait, pick } = useLayout();
  const bars = ramp(frame, T.PROOF + 10, T.PROOF + 32);
  return (
    <Appear at={T.PROOF} until={T.AI - 4} rise={40} pop style={{ position: "absolute", top: pick(300, 600), left: pick(840, 50), width: 980 }}>
      <Card>
        <Label>Sur le terrain · un bar-restaurant à Toulouse</Label>
        <div style={{ marginTop: 20, display: "flex", flexDirection: pick("row", "column"), alignItems: pick("center", "flex-start"), gap: pick(44, 10) }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: pick(230, 300), lineHeight: 0.9 }}>
            <Accent>18&#8239;s</Accent>
          </div>
          <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: pick(56, 64), lineHeight: 1.1, color: om.cream }}>
            De la commande au ticket cuisine
          </div>
        </div>
        <div style={{ marginTop: portrait ? 40 : 0 }}>
          <Bar label="En ligne" value="18 s" width={(ONLINE_SECONDS / COUNTER_SECONDS) * bars} hot />
          <Bar label="Au comptoir" value="4 min 39" width={bars} />
        </div>
        <div style={{ marginTop: 26, fontFamily: fonts.sans, fontWeight: 500, fontSize: 34, color: om.muted }}>Délai médian · source : ominin.com/r7k2</div>
      </Card>
    </Appear>
  );
};

/** The estimate kept: announced and ready side by side, the film's precision beat. */
export const Precision = () => {
  const { pick } = useLayout();
  const announced = useIn(T.MATCH, springs.snappy);
  const ready = useIn(T.MATCH + 7, springs.snappy);
  const verdict = useIn(T.MATCH + 14, springs.snappy);
  return (
    <Appear
      at={T.MATCH - 2}
      until={T.LOYALTY - 4}
      style={{
        position: "absolute",
        left: pick(790, 50),
        right: pick(50, 50),
        top: pick(150, 600),
        bottom: pick(110, 110),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: pick(50, 60),
      }}
    >
      <div style={{ display: "flex", flexDirection: pick("row", "column"), alignItems: "center", gap: pick(28, 22) }}>
        <TimeTile label="Annoncée par l’IA" t={announced} size={pick(124, 150)} />
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "rgb(127 209 160 / 0.16)",
            transform: `scale(${verdict})`,
          }}
        >
          <Check size={58} color={om.ready} />
        </div>
        <TimeTile label="Prête" t={ready} ok size={pick(124, 150)} />
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 600,
          fontSize: pick(120, 116),
          lineHeight: 1,
          color: om.cream,
          opacity: Math.min(1, verdict * 1.5),
          transform: `translateY(${(1 - verdict) * 30}px)`,
          whiteSpace: "nowrap",
        }}
      >
        À la minute près.
      </div>
    </Appear>
  );
};

/** Retention, as big as the 18 s card and the 12:52 beat: Inès's seventh order, stamped. */
export const Retention = () => {
  const { pick } = useLayout();
  return (
    <Appear
      at={T.RETENTION}
      until={T.END - 4}
      style={{
        position: "absolute",
        left: pick(790, 50),
        right: pick(50, 50),
        top: pick(130, 540),
        bottom: pick(110, 280),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: pick(50, 80),
        textAlign: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div
          style={{
            width: 150,
            height: 150,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: emberGradient(135),
            fontFamily: fonts.display,
            fontWeight: 600,
            fontSize: 80,
            color: om.ink,
          }}
        >
          I
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 120, lineHeight: 1, color: om.cream }}>Inès</div>
          <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 46, color: om.ember[0] }}>7ᵉ commande · cookie offert</div>
        </div>
      </div>
      <Stamps from={T.RETENTION + 8} count={7} size={pick(120, 124)} gap={pick(20, 10)} />
      <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: pick(96, 104), lineHeight: 1.05, color: om.cream, textWrap: "balance" }}>
        Commander en ligne la <Accent>fait revenir.</Accent>
      </div>
    </Appear>
  );
};

export const TimeTile = ({ label, t, ok = false, size = 150 }: { label: string; t: number; ok?: boolean; size?: number }) => (
  <div
    style={{
      padding: "22px 40px 26px",
      borderRadius: 32,
      background: om.surface,
      border: `2px solid ${ok ? om.ready : om.line}`,
      textAlign: "center",
      opacity: Math.min(1, t * 1.5),
      transform: `scale(${0.85 + 0.15 * t})`,
    }}
  >
    <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 30, letterSpacing: "0.08em", textTransform: "uppercase", color: ok ? om.ready : om.muted }}>{label}</div>
    <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: size, lineHeight: 1, color: om.cream }}>12:{T.READY_MINUTE}</div>
  </div>
);

const Bar = ({ label, value, width, hot = false }: { label: string; value: string; width: number; hot?: boolean }) => (
  <div style={{ marginTop: 26 }}>
    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: fonts.sans, fontWeight: 600, fontSize: 36, color: hot ? om.ember[0] : om.cream }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <div style={{ marginTop: 10, height: 24, borderRadius: 12, background: "rgb(243 236 225 / 0.08)" }}>
      <div style={{ width: `${Math.max(width * 100, hot ? 3 * Math.min(1, width * 40) : 0)}%`, height: "100%", borderRadius: 10, background: hot ? emberGradient() : om.faint }} />
    </div>
  </div>
);

const SIGNALS = ["14 commandes en cours", "3 personnes en cuisine", "Smash ×1 · Frites ×1", "Rythme des services passés"];
const SIGNAL_TOP = 92;
const SIGNAL_GAP = 72;
const ORB_Y = 470;
const ORB = 100;

export const Estimator = () => {
  const frame = useCurrentFrame();
  const done = useIn(T.ESTIMATE, springs.snappy);
  const flash = interpolate(frame, [T.ESTIMATE, T.ESTIMATE + 3, T.ESTIMATE + 16], [0, 1, 0], clamp);
  const busy = interpolate(frame, [T.INPUTS[0], T.ESTIMATE, T.ESTIMATE + 20], [1, 4, 1], clamp);
  return (
    <Appear at={T.AI} until={T.MATCH - 6} style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", top: SIGNAL_TOP - 56, left: 0, right: 0, textAlign: "center" }}>
        <Label>Ce que l’IA regarde</Label>
      </div>
      {SIGNALS.map((signal, i) => {
        const at = T.INPUTS[i];
        const t = useInLocal(frame, at);
        const travel = ramp(frame, at + 4, at + 16);
        const y = SIGNAL_TOP + i * SIGNAL_GAP;
        return (
          <div key={signal}>
            <div
              style={{
                position: "absolute",
                top: y,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                opacity: t * (1 - 0.45 * ramp(frame, T.ESTIMATE, T.ESTIMATE + 10)),
                transform: `translateX(${(1 - t) * 60}px)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 22px",
                  borderRadius: 999,
                  background: om.raised,
                  border: `1.5px solid ${om.line}`,
                  fontFamily: fonts.sans,
                  fontWeight: 500,
                  fontSize: 34,
                  color: om.cream,
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: om.ember[1] }} />
                {signal}
              </div>
            </div>
            {travel > 0 && travel < 1 && (
              <div
                style={{
                  position: "absolute",
                  left: PANEL.width / 2 - 6,
                  top: y + 54 + (ORB_Y - y - 54) * travel,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: om.ember[0],
                  boxShadow: `0 0 16px ${om.ember[0]}`,
                }}
              />
            )}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: PANEL.width / 2 - ORB, top: ORB_Y - ORB, width: ORB * 2, height: ORB * 2 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: `conic-gradient(from ${frame * 3 * busy}deg, ${om.ember[0]}, ${om.ember[1]}, ${om.ember[2]}, ${om.logo[0]}, ${om.ember[0]})`,
            filter: "blur(2px)",
            boxShadow: `0 0 ${50 + 60 * flash}px rgb(226 118 75 / ${0.45 + 0.4 * flash})`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 14,
            borderRadius: "50%",
            background: om.ink,
            display: "grid",
            placeItems: "center",
            fontFamily: fonts.display,
            fontWeight: 600,
            fontSize: 72,
          }}
        >
          <Accent>IA</Accent>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: ORB_Y + ORB + 30,
          left: 24,
          right: 24,
          padding: "18px 28px",
          borderRadius: 28,
          background: om.surface,
          border: `1.5px solid ${om.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: done,
          transform: `translateY(${(1 - done) * -40}px) scale(${0.8 + 0.2 * done})`,
        }}
      >
        <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 30, color: om.muted, lineHeight: 1.25 }}>
          N°&#8239;42
          <br />
          prête à
        </div>
        <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 112, lineHeight: 1, color: om.cream }}>12:{T.READY_MINUTE}</div>
      </div>
    </Appear>
  );
};

const useInLocal = (frame: number, at: number) => interpolate(frame, [at, at + 10], [0, 1], { ...clamp, easing: (t) => 1 - (1 - t) ** 3 });

const REGULARS = [
  { name: "Karim", orders: 5, last: "hier" },
  { name: "Inès", orders: 6, last: "il y a 7 j" },
  { name: "Léa", orders: 4, last: "il y a 2 j" },
  { name: "Tom", orders: 3, last: "il y a 4 j" },
];
/** Each return puts its customer at the top: the list stays sorted by last visit. */
/** Inès moves up once the phone has left, the toast after her: the reorder and the toast read one after the other. */
const RETURNS = [{ at: T.BACK + 12, name: "Inès" }];
const ROW = 112;

export const Regulars = () => {
  const frame = useCurrentFrame();
  const { pick } = useLayout();
  const { fps } = useVideoConfig();
  const orders = [REGULARS.map((person) => person.name)];
  for (const { name } of RETURNS) orders.push([name, ...orders[orders.length - 1].filter((other) => other !== name)]);
  const moves = RETURNS.map(({ at }) => spring({ frame: frame - at, fps, config: springs.snappy }));
  const latest = RETURNS.filter(({ at }) => frame >= at).at(-1);
  const toastIn = useIn((latest?.at ?? T.BACK) + 12, springs.snappy);
  const toast = latest ? toastIn : 0;
  const latestPerson = REGULARS.find((person) => person.name === latest?.name);
  return (
    <Appear at={T.REGULARS} until={T.RETENTION - 6} style={{ position: "absolute", top: pick(160, 100), left: 0, right: 0 }}>
      <div
        style={{
          position: "absolute",
          top: -104,
          left: 30,
          right: 30,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 22px",
          borderRadius: 20,
          background: om.cream,
          color: om.ink,
          fontFamily: fonts.sans,
          fontWeight: 600,
          fontSize: 30,
          opacity: toast,
          transform: `translateY(${(1 - toast) * -30}px)`,
          boxShadow: "0 16px 40px rgb(0 0 0 / 0.4)",
        }}
      >
        <Bell /> {latest?.name} est de retour · {(latestPerson?.orders ?? 0) + 1}ᵉ commande
      </div>
      <Card>
        <Label>Vos habitués</Label>
        <div style={{ position: "relative", marginTop: 18, height: REGULARS.length * ROW }}>
          {REGULARS.map((person, i) => {
            const slot = orders.slice(1).reduce((y, order, k) => y + (order.indexOf(person.name) - orders[k].indexOf(person.name)) * moves[k], i);
            const returned = RETURNS.find((back) => back.name === person.name && frame >= back.at);
            const fresh = returned !== undefined && returned === latest;
            const row = useInLocal(frame, T.REGULARS + 2 + i * 3);
            return (
              <div
                key={person.name}
                style={{
                  position: "absolute",
                  top: slot * ROW,
                  left: 0,
                  right: 0,
                  height: ROW - 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  padding: "0 18px",
                  borderRadius: 18,
                  background: fresh ? "rgb(226 118 75 / 0.16)" : "transparent",
                  border: `1.5px solid ${fresh ? om.ember[1] : "transparent"}`,
                  opacity: row,
                  transform: `translateX(${(1 - row) * 40}px)`,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background: returned ? emberGradient(135) : om.raised,
                    fontFamily: fonts.display,
                    fontWeight: 600,
                    fontSize: 28,
                    color: returned ? om.ink : om.cream,
                  }}
                >
                  {person.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: 32, color: om.cream }}>{person.name}</div>
                  <div style={{ fontFamily: fonts.sans, fontSize: 25, color: om.muted, whiteSpace: "nowrap" }}>
                    {fresh ? "à l’instant" : returned ? "aujourd’hui" : person.last}
                  </div>
                </div>
                <div style={{ textAlign: "right", color: returned ? om.ember[0] : om.cream }}>
                  <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 44, lineHeight: 1 }}>{person.orders + (returned ? 1 : 0)}</div>
                  <div style={{ fontFamily: fonts.sans, fontWeight: 500, fontSize: 20, color: om.muted }}>commandes</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </Appear>
  );
};

const Card = ({ children }: { children: ReactNode }) => (
  <div style={{ margin: "0 10px", padding: "32px 36px", borderRadius: 32, background: om.surface, border: `1.5px solid ${om.line}` }}>{children}</div>
);

const Label = ({ children, size = 26 }: { children: ReactNode; size?: number }) => (
  <div style={{ fontFamily: fonts.sans, fontWeight: 600, fontSize: size, letterSpacing: "0.14em", textTransform: "uppercase", color: om.muted }}>{children}</div>
);

const Bell = () => (
  <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={om.ember[1]} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);
