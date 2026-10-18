import type { CSSProperties, ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { fonts } from "../brand/fonts";
import { springs } from "../kit/motion";
import { Counter as Odometer } from "../kit/type";
import { Qr } from "../scenes/art";
import { Check, clamp, euros, useIn } from "../scenes/common";
import { BAR_CHOICE, BARS, DEMO_URL, DRINKS, LOYALTY, ORDER_NUMBER, ORDER_TOTAL, PICKED, SOON_TAG, VENUE } from "./copy";
import { club, etoile } from "./tokens";

/*
 * The guest's phone, in the 393 × 852 px of DEVICES.phone: L'Étoile's menu
 * in its dark theme, then Ominin's order ticket — the same steps and words
 * as the product (frontend/components/menu/order-ticket.tsx), the counter
 * named for the bar.
 */

const W = 393;
const H = 852;

const text = (size: number, weight = 500, color: string = etoile.ink): CSSProperties => ({
  fontFamily: fonts.sans,
  fontSize: size,
  fontWeight: weight,
  color,
  letterSpacing: "-0.01em",
  lineHeight: 1.2,
});

/** Each drink's colour, in the order of DRINKS. */
const DRINK_TINTS = [club.cyan, club.violet, club.amber, club.ready];

const caps = (size: number, color: string = etoile.muted): CSSProperties => ({
  ...text(size, 600, color),
  letterSpacing: "0.22em",
  textTransform: "uppercase",
});

/** L'Étoile's emblem: a four-pointed star and a shorter glint, polished silver. */
export const Star = ({ size, id = "star" }: { size: number; id?: string }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block", overflow: "visible" }}>
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.5" stopColor="#c9cdd4" />
        <stop offset="1" stopColor="#7d828b" />
      </linearGradient>
    </defs>
    <path d="M50 0C51.6 30 56 44.4 100 50C56 55.6 51.6 70 50 100C48.4 70 44 55.6 0 50C44 44.4 48.4 30 50 0Z" fill={`url(#${id})`} />
    <path d="M50 26C51 42 54 46 74 50C54 54 51 58 50 74C49 58 46 54 26 50C46 46 49 42 50 26Z" fill={`url(#${id})`} opacity="0.6" transform="rotate(45 50 50)" />
  </svg>
);

const StatusBar = ({ time }: { time: string }) => (
  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 34px 0" }}>
    <span style={text(16, 600)}>{time}</span>
    <span style={{ display: "flex", gap: 5, alignItems: "center" }}>
      {[6, 9, 12].map((h) => (
        <span key={h} style={{ width: 4, height: h, borderRadius: 1, background: etoile.ink }} />
      ))}
      <span style={{ marginLeft: 6, width: 24, height: 11, borderRadius: 3, border: `1.5px solid ${etoile.ink}`, padding: 1 }}>
        <span style={{ display: "block", width: "62%", height: "100%", borderRadius: 1, background: etoile.ink }} />
      </span>
    </span>
  </div>
);

const Screen = ({ children, background = etoile.paper }: { children: ReactNode; background?: string }) => (
  <div style={{ position: "absolute", inset: 0, width: W, height: H, background, overflow: "hidden" }}>{children}</div>
);

// ——— 1. The scan ————————————————————————————————————————————————————

/**
 * The camera on a QR sign stuck to a pillar of the club: the frame locks on
 * at `lock`, the link appears at `link`.
 */
export const ScanScreen = ({ lock, link }: { lock: number; link: number }) => {
  const frame = useCurrentFrame();
  const locked = useIn(lock, springs.snappy);
  const pill = useIn(link, springs.snappy);
  const drift = interpolate(frame, [0, lock], [14, 0], clamp);
  return (
    <Screen background="#09080d">
      {/* The room through the camera: the beams, out of focus. */}
      <div style={{ position: "absolute", inset: -40, background: `radial-gradient(circle at 20% 20%, ${club.violet}55, transparent 40%), radial-gradient(circle at 85% 30%, ${club.cyan}44, transparent 45%), radial-gradient(circle at 50% 110%, #ffb45e33, transparent 50%)`, filter: "blur(20px)" }} />
      <div style={{ position: "absolute", left: 76 + drift, top: 250 + drift * 0.6, width: 240, padding: 22, borderRadius: 26, background: "#0d0d12", border: "1.5px solid rgb(230 233 238 / 0.25)", textAlign: "center", transform: `rotate(${-2 + drift * 0.1}deg)` }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, alignItems: "center" }}>
          <Star size={22} id="scan-star" />
          <span style={caps(14, etoile.ink)}>{VENUE}</span>
        </div>
        <div style={{ margin: "16px auto 12px", width: 172 }}>
          <Qr size={172} value={`https://${DEMO_URL}`} color="#07070a" />
        </div>
        <p style={{ ...text(15, 600), margin: 0 }}>Scannez pour commander</p>
        <p style={{ ...text(12, 500, etoile.muted), margin: "4px 0 0" }}>Où que vous soyez dans le club</p>
      </div>
      {/* The viewfinder's corners close on the code as it locks. */}
      {[0, 1, 2, 3].map((corner) => {
        const inset = 150 - locked * 40;
        const x = corner % 2 ? W - inset + 10 : inset - 50;
        const y = corner < 2 ? 330 - locked * 34 : 590 + locked * 34;
        return (
          <div
            key={corner}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 40,
              height: 40,
              borderColor: locked > 0.5 ? club.ready : "#fff",
              borderStyle: "solid",
              borderWidth: `${corner < 2 ? 4 : 0}px ${corner % 2 ? 4 : 0}px ${corner < 2 ? 0 : 4}px ${corner % 2 ? 0 : 4}px`,
              borderRadius: 8,
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          top: 680,
          padding: "14px 18px",
          borderRadius: 18,
          background: "rgb(255 255 255 / 0.92)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          opacity: pill,
          transform: `translateY(${(1 - pill) * 30}px)`,
        }}
      >
        <span style={{ width: 34, height: 34, borderRadius: 9, background: "#07070a", display: "grid", placeItems: "center" }}>
          <Star size={20} id="pill-star" />
        </span>
        <span>
          <span style={{ ...text(13, 500, "#555"), display: "block" }}>Code QR</span>
          <span style={{ ...text(16, 600, "#111"), display: "block" }}>{DEMO_URL}</span>
        </span>
      </div>
      <StatusBar time="1:12" />
    </Screen>
  );
};

// ——— 2. The menu ——————————————————————————————————————————————————————

/** L'Étoile's cocktails; `adds` lists the frames at which each drink's + is tapped. */
export const MenuScreen = ({ adds }: { adds: number[] }) => {
  const frame = useCurrentFrame();
  const count = adds.filter((at) => frame >= at).length;
  const bar = useIn(adds[0], springs.snappy);
  const bump = useIn(adds[adds.length - 1], springs.snappy);
  const total = DRINKS.slice(0, count).reduce((sum, drink) => sum + drink.price, 0);
  return (
    <Screen>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0 }}>
        <div style={{ height: 250, background: `radial-gradient(ellipse at 50% 0%, #2a2a36, ${etoile.paper} 70%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 30 }}>
          <Star size={54} id="menu-star" />
          <span style={{ ...text(30, 700), letterSpacing: "0.2em", textTransform: "uppercase" }}>{VENUE}</span>
          <span style={caps(11)}>Club · Rooftop</span>
        </div>
        <div style={{ display: "flex", gap: 8, padding: "0 20px 18px" }}>
          {["Cocktails", "Champagnes", "Shooters", "Softs"].map((chip, i) => (
            <span key={chip} style={{ ...text(13, 600, i ? etoile.muted : "#07070a"), padding: "8px 14px", borderRadius: 999, background: i ? etoile.card : etoile.silver }}>
              {chip}
            </span>
          ))}
        </div>
        <p style={{ ...caps(12), margin: "6px 20px 10px" }}>Cocktails signature</p>
        {DRINKS.map((drink, i) => {
          const added = adds[i] !== undefined && frame >= adds[i];
          return (
            <div key={drink.name} style={{ margin: "0 16px 10px", padding: "16px 16px", borderRadius: 18, background: etoile.card, border: `1px solid ${added ? "rgb(201 205 212 / 0.5)" : etoile.line}`, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 58, height: 58, borderRadius: 14, background: `radial-gradient(circle at 50% 35%, ${DRINK_TINTS[i]}66, #0b0b10 75%)`, display: "grid", placeItems: "center" }}>
                <svg width={34} height={34} viewBox="-15 -32 30 34">
                  <path d="M-12 -30 L12 -30 L2 -14 L2 -2 L8 0 L-8 0 L-2 -2 L-2 -14 Z" fill="rgb(255 255 255 / 0.55)" />
                  <path d="M-9 -28 L9 -28 L1.5 -17 L-1.5 -17 Z" fill={DRINK_TINTS[i]} />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ ...text(17, 600), margin: 0 }}>{drink.name}</p>
                <p style={{ ...text(12.5, 500, etoile.muted), margin: "3px 0 0" }}>{drink.note}</p>
                <p style={{ ...text(15, 600, etoile.silver), margin: "6px 0 0" }}>{euros(drink.price)}</p>
              </div>
              <span style={{ width: 36, height: 36, borderRadius: 999, display: "grid", placeItems: "center", background: added ? etoile.silver : "transparent", border: `1.5px solid ${etoile.silver}`, color: added ? "#07070a" : etoile.silver, ...text(22, 500, added ? "#07070a" : etoile.silver) }}>
                {added ? "1" : "+"}
              </span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 30,
          height: 62,
          borderRadius: 999,
          background: etoile.silver,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          opacity: bar,
          transform: `translateY(${(1 - bar) * 90}px) scale(${1 + 0.04 * Math.sin(Math.PI * bump)})`,
        }}
      >
        <span style={text(16, 700, "#07070a")}>Commander · {count} verre{count > 1 ? "s" : ""}</span>
        <span style={text(16, 700, "#07070a")}>{euros(total)}</span>
      </div>
      <StatusBar time="1:12" />
    </Screen>
  );
};

/** The two bottom-sheet screens share their sheet. */
const Sheet = ({ at, children, height }: { at: number; children: ReactNode; height: number }) => {
  const t = useIn(at, springs.smooth);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "rgb(0 0 0 / 0.55)", opacity: t }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height,
          borderRadius: "28px 28px 0 0",
          background: "#111116",
          borderTop: `1px solid ${etoile.line}`,
          padding: "14px 20px 0",
          transform: `translateY(${(1 - t) * height}px)`,
        }}
      >
        <div style={{ width: 40, height: 5, borderRadius: 3, background: "rgb(255 255 255 / 0.2)", margin: "0 auto 18px" }} />
        {children}
      </div>
    </>
  );
};

// ——— 3. The bar ———————————————————————————————————————————————————————

/** The bar with the shortest estimated wait. */
const FASTEST = BARS.reduce((best, bar) => (bar.wait < best.wait ? bar : best));

/** Where to collect: three bars and the AI's estimated wait at each, the fastest picked at `pick`; tagged « Bientôt » under BAR_CHOICE "soon". */
export const BarSheet = ({ at, pick }: { at: number; pick: number }) => {
  const frame = useCurrentFrame();
  const picked = frame >= pick;
  return (
    <Sheet at={at} height={500}>
      <p style={{ ...text(22, 700), margin: 0 }}>Où récupérer votre commande&nbsp;?</p>
      <p style={{ ...text(13, 500, etoile.muted), margin: "6px 0 0" }}>Temps d’attente estimés par l’IA, en direct</p>
      {BAR_CHOICE === "soon" && (
        <span style={{ ...caps(11, "#07070a"), display: "inline-block", marginTop: 10, padding: "5px 10px", borderRadius: 999, background: club.cyan }}>{SOON_TAG}</span>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        {BARS.map((bar) => {
          const on = picked && bar === PICKED;
          return (
            <div key={bar.name} style={{ padding: "16px 18px", borderRadius: 18, border: `1.5px solid ${on ? etoile.silver : etoile.line}`, background: on ? "rgb(201 205 212 / 0.1)" : etoile.card, display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 22, height: 22, borderRadius: 999, border: `2px solid ${on ? etoile.silver : "rgb(255 255 255 / 0.3)"}`, display: "grid", placeItems: "center" }}>
                {on && <span style={{ width: 10, height: 10, borderRadius: 999, background: etoile.silver }} />}
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ ...text(17, 600), display: "block" }}>{bar.name}</span>
                <span style={{ ...text(13, 500, bar.busy ? club.alert : etoile.muted), display: "block", marginTop: 2 }}>{bar.busy ? "Très demandé" : bar.where}</span>
              </span>
              <span style={{ textAlign: "right" }}>
                <span style={{ ...text(18, 700, bar.busy ? club.alert : bar === FASTEST ? club.ready : etoile.ink), display: "block" }}>≈ {bar.wait} min</span>
                {bar === FASTEST && <span style={{ ...caps(9, club.ready), display: "block", marginTop: 3, letterSpacing: "0.14em" }}>Le plus rapide</span>}
              </span>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
};

// ——— 4. Payment ————————————————————————————————————————————————————————

/** The in-page payment sheet, accepted at `paid`. */
export const PaySheet = ({ at, paid }: { at: number; paid: number }) => {
  const frame = useCurrentFrame();
  const done = useIn(paid, springs.snappy);
  return (
    <Sheet at={at} height={420}>
      <p style={{ ...caps(12), margin: 0 }}>{VENUE} · Votre commande</p>
      {DRINKS.slice(0, 2).map((drink) => (
        <div key={drink.name} style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
          <span style={text(17, 500)}>1 × {drink.name}</span>
          <span style={text(17, 500, etoile.muted)}>{euros(drink.price)}</span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: `1px dashed ${etoile.line}` }}>
        <span style={text(19, 700)}>Total</span>
        <span style={text(19, 700)}>{euros(ORDER_TOTAL)}</span>
      </div>
      <p style={{ ...text(13, 500, etoile.muted), margin: "10px 0 0" }}>À récupérer au {PICKED.name}</p>
      <div style={{ marginTop: 22, height: 60, borderRadius: 16, background: frame >= paid ? club.ready : "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        {frame >= paid ? (
          <span style={{ display: "flex", alignItems: "center", gap: 10, transform: `scale(${0.8 + 0.2 * done})` }}>
            <Check size={26} color="#07070a" />
            <span style={text(18, 700, "#07070a")}>Paiement accepté</span>
          </span>
        ) : (
          <span style={text(18, 700, "#07070a")}>Payer {euros(ORDER_TOTAL)}</span>
        )}
      </div>
      <p style={{ ...text(12, 500, etoile.muted), margin: "10px 0 0", textAlign: "center" }}>Carte, Apple&nbsp;Pay ou Google&nbsp;Pay</p>
    </Sheet>
  );
};

// ——— 5. The ticket —————————————————————————————————————————————————————

/**
 * Ominin's order ticket: the number, the bar, the steps. `ready` turns it to
 * « C'est prêt ! » (the product's words, the counter named for the bar).
 */
export const TicketScreen = ({ ready, at = 0 }: { ready?: number; at?: number }) => {
  const frame = useCurrentFrame();
  const enter = useIn(at, springs.smooth);
  const isReady = ready !== undefined && frame >= ready;
  const flip = useIn(ready ?? 0, springs.snappy) * (isReady ? 1 : 0);
  const glow = isReady ? 0.5 + 0.5 * Math.sin((frame - (ready ?? 0)) / 4) : 0;
  const accent = isReady ? club.ready : etoile.silver;
  return (
    <Screen background={isReady ? "#06110b" : etoile.paper}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 50% at 50% 30%, ${isReady ? `rgb(127 224 168 / ${0.18 + 0.12 * glow})` : "rgb(201 205 212 / 0.08)"}, transparent 70%)` }} />
      <div style={{ position: "absolute", top: 86, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 10, opacity: enter }}>
        <Star size={20} id="ticket-star" />
        <span style={caps(13, etoile.ink)}>{VENUE}</span>
      </div>
      <div style={{ position: "absolute", top: 150, left: 28, right: 28, padding: "28px 24px 26px", borderRadius: 28, background: etoile.card, border: `1.5px solid ${isReady ? "rgb(127 224 168 / 0.6)" : etoile.line}`, textAlign: "center", transform: `translateY(${(1 - enter) * 40}px) scale(${1 + 0.05 * Math.sin(Math.PI * flip)})`, boxShadow: isReady ? `0 0 ${40 + 30 * glow}px rgb(127 224 168 / 0.35)` : undefined }}>
        <p style={{ ...caps(12), margin: 0 }}>Votre numéro</p>
        <p style={{ ...text(110, 700, accent), margin: "6px 0 0", lineHeight: 1, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>
          <span style={{ fontSize: 30, verticalAlign: "top", marginRight: 6, lineHeight: 2 }}>N°</span>
          {ORDER_NUMBER}
        </p>
        <span style={{ ...caps(12, isReady ? "#07070a" : etoile.ink), display: "inline-block", marginTop: 14, padding: "7px 14px", borderRadius: 999, background: isReady ? club.ready : "rgb(255 255 255 / 0.08)" }}>
          {isReady ? "Prête !" : "Au bar"}
        </span>
      </div>
      <div style={{ position: "absolute", top: 470, left: 32, right: 32, textAlign: "center" }}>
        <p style={{ ...text(isReady ? 34 : 26, 700), margin: 0, letterSpacing: "-0.02em" }}>{isReady ? "C’est prêt !" : "On s’en occupe."}</p>
        <p style={{ ...text(16, 500, etoile.muted), margin: "10px 0 0", lineHeight: 1.45 }}>
          {isReady ? `Venez chercher votre commande au ${PICKED.name}.` : "Rangez votre téléphone : une notification vous prévient dès que c’est prêt."}
        </p>
      </div>
      <div style={{ position: "absolute", left: 40, right: 40, top: 640, display: "flex", alignItems: "center", gap: 8 }}>
        {["Payée", "Au bar", "Prête"].map((step, i) => {
          const on = i < 2 || isReady;
          return (
            <div key={step} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 5, borderRadius: 3, background: on ? accent : "rgb(255 255 255 / 0.12)" }} />
              <span style={{ ...text(12, 600, on ? etoile.ink : etoile.muted), display: "block", marginTop: 8 }}>{step}</span>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 28, right: 28, bottom: 52, padding: "14px 18px", borderRadius: 16, background: "rgb(255 255 255 / 0.05)", display: "flex", justifyContent: "space-between" }}>
        <span style={text(14, 500, etoile.muted)}>Retrait</span>
        <span style={text(14, 700)}>{PICKED.name}</span>
      </div>
      <StatusBar time={isReady ? "1:19" : "1:13"} />
    </Screen>
  );
};

// ——— 6. The notification ———————————————————————————————————————————————

/**
 * Her lock screen in her pocket at 1:19: the push notification slides down
 * at `at` (shown as live at the owner's request; not built yet).
 */
export const LockScreen = ({ at }: { at: number }) => {
  const frame = useCurrentFrame();
  const drop = useIn(at, springs.snappy);
  const glow = frame >= at ? 0.5 + 0.5 * Math.sin((frame - at) / 4) : 0;
  return (
    <Screen background="#05050a">
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 30% 20%, ${club.violet}66, transparent 45%), radial-gradient(circle at 80% 75%, ${club.cyan}44, transparent 50%)` }} />
      <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center" }}>
        <p style={{ ...text(18, 600, etoile.muted), margin: 0 }}>samedi</p>
        <p style={{ ...text(96, 600), margin: 0, letterSpacing: "-0.04em", lineHeight: 1 }}>1:19</p>
      </div>
      <div
        style={{
          position: "absolute",
          left: 14,
          right: 14,
          top: 300,
          padding: "16px 18px",
          borderRadius: 24,
          background: "rgb(30 30 38 / 0.92)",
          border: `1.5px solid rgb(127 224 168 / ${0.3 + 0.4 * glow})`,
          boxShadow: `0 0 ${30 + 30 * glow}px rgb(127 224 168 / 0.3)`,
          opacity: drop,
          transform: `translateY(${(1 - drop) * -160}px)`,
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
        }}
      >
        <span style={{ width: 44, height: 44, borderRadius: 11, background: "#07070a", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Star size={26} id="notif-star" />
        </span>
        <span style={{ flex: 1 }}>
          <span style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={text(15, 700)}>{VENUE}</span>
            <span style={text(13, 500, etoile.muted)}>maintenant</span>
          </span>
          <span style={{ ...text(16, 600), display: "block", marginTop: 4 }}>C’est prêt ! N° {ORDER_NUMBER}</span>
          <span style={{ ...text(15, 500, etoile.muted), display: "block", marginTop: 2, lineHeight: 1.35 }}>Votre commande vous attend au {PICKED.name}.</span>
        </span>
      </div>
      <StatusBar time="1:19" />
    </Screen>
  );
};

// ——— 7. The return —————————————————————————————————————————————————————

/** The next Saturday: the menu again, her points waiting, a reward unlocked at `unlock`. */
export const LoyaltyScreen = ({ unlock }: { unlock: number }) => {
  const t = useIn(unlock, springs.snappy);
  const fill = interpolate(t, [0, 1], [LOYALTY.before, Math.min(LOYALTY.points, LOYALTY.threshold)]) / LOYALTY.threshold;
  return (
    <Screen>
      <div style={{ height: 230, background: `radial-gradient(ellipse at 50% 0%, #2a2a36, ${etoile.paper} 70%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 30 }}>
        <Star size={46} id="return-star" />
        <span style={{ ...text(26, 700), letterSpacing: "0.2em", textTransform: "uppercase" }}>{VENUE}</span>
      </div>
      <div style={{ margin: "0 20px", padding: 22, borderRadius: 24, background: etoile.card, border: `1.5px solid ${t > 0.5 ? etoile.gold : etoile.line}` }}>
        <p style={{ ...caps(12), margin: 0 }}>Fidélité</p>
        <p style={{ ...text(30, 700), margin: "8px 0 0" }}>
          <Odometer from={LOYALTY.before} to={LOYALTY.points} delay={unlock - 14} duration={14} /> <span style={text(18, 600, etoile.muted)}>points</span>
        </p>
        <div style={{ marginTop: 14, height: 8, borderRadius: 4, background: "rgb(255 255 255 / 0.1)" }}>
          <div style={{ width: `${fill * 100}%`, height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${etoile.silver}, ${etoile.gold})` }} />
        </div>
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, opacity: t, transform: `translateY(${(1 - t) * 12}px)` }}>
          <span style={{ width: 36, height: 36, borderRadius: 999, background: etoile.gold, display: "grid", placeItems: "center" }}>
            <Check size={20} color="#07070a" />
          </span>
          <span>
            <span style={{ ...text(17, 700), display: "block" }}>{LOYALTY.reward}</span>
            <span style={{ ...text(13, 500, etoile.muted), display: "block" }}>Dès {LOYALTY.threshold} points</span>
          </span>
        </div>
      </div>
      <p style={{ ...caps(12), margin: "26px 20px 10px" }}>Cocktails signature</p>
      {DRINKS.slice(0, 2).map((drink) => (
        <div key={drink.name} style={{ margin: "0 16px 10px", padding: 16, borderRadius: 18, background: etoile.card, border: `1px solid ${etoile.line}`, display: "flex", justifyContent: "space-between" }}>
          <span style={text(17, 600)}>{drink.name}</span>
          <span style={text(15, 600, etoile.silver)}>{euros(drink.price)}</span>
        </div>
      ))}
      <StatusBar time="0:48" />
    </Screen>
  );
};
