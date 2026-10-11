import type { ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { fonts } from "../../brand/fonts";
import { app, emberGradient, om } from "../../brand/tokens";
import { springs } from "../../kit/motion";
import { Tap } from "../../kit/Tap";
import { FoodTile, Qr, type Food } from "../art";
import { Check, clamp, euros, ramp, useIn } from "../common";
import * as T from "./times";

// The customer's phone, in the device's viewport px (393 × 852).
const W = 393;
const H = 852;

const DISHES: { name: string; desc: string; price: number; food: Food }[] = [
  { name: "Smash classic", desc: "Double steak, cheddar, oignons", price: 11.9, food: "burger" },
  { name: "Frites maison", desc: "Pommes fraîches, fleur de sel", price: 3.5, food: "fries" },
  { name: "Cookie noisette", desc: "Cuit chaque matin", price: 3.9, food: "cookie" },
  { name: "Limonade maison", desc: "Citron, menthe fraîche", price: 3, food: "drink" },
];
const ROW_TOP = 268;
const ROW = 108;
const PLUS_X = 346;
const plusY = (i: number) => ROW_TOP + i * ROW + ROW / 2;
const CART_Y = H - 30 - 62;
const PAY_Y = H - 44 - 62;
const ORDER_TOTAL = DISHES[0].price + DISHES[1].price;
const POINTS_BEFORE = 120;
const POINTS_EARNED = 15;
const REWARD_AT = 150;

const clock = (frame: number) => {
  if (frame >= T.RETURN) return "12:31";
  if (frame < T.PAID) return `12:${T.ORDER_MINUTE - 1}`;
  return `12:${T.ORDER_MINUTE + T.LAPSE.filter((at) => frame >= at).length}`;
};

export const PhoneScreen = () => {
  const frame = useCurrentFrame();
  const menu = ramp(frame, T.MENU - 2, T.MENU + 8);
  const ticket = ramp(frame, T.PAID, T.PAID + 10);
  const back = ramp(frame, T.RETURN, T.RETURN + 10);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: app.paper, fontFamily: fonts.sans, color: app.ink, letterSpacing: "-0.01em" }}>
      {frame < T.MENU + 8 && <Camera />}
      {frame >= T.MENU - 2 && frame < T.PAID + 10 && (
        <Layer t={menu} from={40}>
          <Menu />
        </Layer>
      )}
      {frame >= T.PAID && frame < T.RETURN + 10 && (
        <Layer t={ticket} from={60}>
          <Ticket />
        </Layer>
      )}
      {frame >= T.RETURN && (
        <Layer t={back} from={60}>
          <Menu welcome />
        </Layer>
      )}
      <StatusBar time={clock(frame)} dark={frame < T.MENU + 4 || (frame >= T.MENU && frame < T.PAID + 6) || frame >= T.RETURN} />
      {T.TAPS.map((at, i) => {
        const point = i < 2 ? { x: PLUS_X, y: plusY(i) } : i === 2 ? { x: W / 2, y: CART_Y + 31 } : { x: W / 2, y: PAY_Y + 31 };
        return <Tap key={at} at={at} {...point} />;
      })}
    </div>
  );
};

const Layer = ({ t, from, children }: { t: number; from: number; children: ReactNode }) => (
  <div style={{ position: "absolute", inset: 0, opacity: t, transform: `translateY(${(1 - t) * from}px)` }}>{children}</div>
);

const StatusBar = ({ time, dark }: { time: string; dark: boolean }) => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 54,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "6px 34px 0",
      fontWeight: 600,
      fontSize: 16,
      color: dark ? "#fff" : app.ink,
    }}
  >
    <span style={{ fontVariantNumeric: "tabular-nums" }}>{time}</span>
    <span style={{ display: "flex", gap: 5, alignItems: "flex-end" }}>
      {[6, 9, 12].map((h) => (
        <span key={h} style={{ width: 4, height: h, borderRadius: 1, background: "currentColor" }} />
      ))}
      <span style={{ marginLeft: 6, width: 24, height: 12, borderRadius: 3, border: "1.5px solid currentColor", padding: 1.5 }}>
        <span style={{ display: "block", width: "70%", height: "100%", borderRadius: 1.5, background: "currentColor" }} />
      </span>
    </span>
  </div>
);

const Camera = () => {
  const frame = useCurrentFrame();
  const lock = ramp(frame, T.SCAN - 6, T.SCAN);
  const flash = interpolate(frame, [T.SCAN, T.SCAN + 2, T.SCAN + 10], [0, 0.8, 0], clamp);
  const inset = 70 - 18 * lock;
  return (
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 40%, #6B4A33, #2A1D15 70%)" }}>
      <div style={{ position: "absolute", left: W / 2 - 95, top: 300, transform: `rotate(${-6 + 4 * lock}deg)` }}>
        <div style={{ padding: 14, borderRadius: 18, background: "#fff", boxShadow: "0 18px 40px rgb(0 0 0 / 0.4)" }}>
          <Qr size={162} />
          <div style={{ marginTop: 10, textAlign: "center", fontWeight: 700, fontSize: 15 }}>Commandez ici</div>
        </div>
      </div>
      {[0, 1, 2, 3].map((corner) => (
        <div
          key={corner}
          style={{
            position: "absolute",
            width: 44,
            height: 44,
            left: corner % 2 ? undefined : inset,
            right: corner % 2 ? inset : undefined,
            top: corner < 2 ? 230 + 18 * lock : undefined,
            bottom: corner < 2 ? undefined : H - 590 - 18 * lock + 40,
            borderColor: lock > 0.95 ? om.ember[0] : "#fff",
            borderStyle: "solid",
            borderWidth: `${corner < 2 ? 5 : 0}px ${corner % 2 ? 5 : 0}px ${corner < 2 ? 0 : 5}px ${corner % 2 ? 0 : 5}px`,
            borderRadius: 10,
          }}
        />
      ))}
      <div style={{ position: "absolute", bottom: 120, left: 0, right: 0, textAlign: "center", color: "#fff", fontWeight: 600, fontSize: 19 }}>
        Scannez pour commander
      </div>
      <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash }} />
    </div>
  );
};

const Menu = ({ welcome = false }: { welcome?: boolean }) => {
  const frame = useCurrentFrame();
  const added = welcome ? 0 : T.TAPS.slice(0, 2).filter((at) => frame >= at + 2).length;
  const cart = useIn(T.TAPS[0] + 2, springs.snappy);
  const total = added === 0 ? 0 : DISHES.slice(0, added).reduce((sum, dish) => sum + dish.price, 0);
  return (
    <div style={{ position: "absolute", inset: 0, background: app.paper }}>
      <div
        style={{
          height: 206,
          padding: "0 22px 18px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          background: welcome
            ? emberGradient(140)
            : "linear-gradient(180deg, rgb(20 12 8 / 0.15), rgb(20 12 8 / 0.75)), radial-gradient(circle at 75% 30%, #E9A54B, #9A4A2B 55%, #3B2216)",
          color: "#fff",
        }}
      >
        {welcome ? (
          <>
            <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 36 }}>Bon retour, Inès&#8239;!</div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 17 }}>
              <Gift /> {REWARD_AT} points · votre cookie est offert
            </div>
          </>
        ) : (
          <>
            <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 30 }}>Le Petit Comptoir</div>
            <div style={{ marginTop: 4, fontSize: 14, opacity: 0.85 }}>Burgers maison · Sur place ou à emporter</div>
          </>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, padding: "16px 18px 0" }}>
        {["Burgers", "Accompagnements", "Desserts"].map((label, i) => (
          <div
            key={label}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 600,
              background: i === 0 ? app.ink : app.soft,
              color: i === 0 ? "#fff" : app.muted,
            }}
          >
            {label}
          </div>
        ))}
      </div>
      {DISHES.map((dish, i) => {
        const offered = welcome && dish.food === "cookie";
        const isAdded = i < added;
        return (
          <div
            key={dish.name}
            style={{
              position: "absolute",
              top: ROW_TOP + i * ROW + 8,
              left: 14,
              right: 14,
              height: ROW - 14,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "0 12px",
              borderRadius: 18,
              background: app.card,
              boxShadow: offered ? `0 0 0 2px ${om.ember[1]}` : "0 1px 0 rgb(0 0 0 / 0.04)",
            }}
          >
            <FoodTile kind={dish.food} size={66} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{dish.name}</div>
              <div style={{ marginTop: 3, fontSize: 13, color: app.muted }}>{dish.desc}</div>
              <div style={{ marginTop: 5, fontWeight: 700, fontSize: 15, color: offered ? om.ember[2] : app.ink }}>
                {offered ? (
                  <>
                    <s style={{ color: app.muted, fontWeight: 500 }}>{euros(dish.price)}</s> Offert
                  </>
                ) : (
                  euros(dish.price)
                )}
              </div>
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: isAdded ? app.ok : app.ink,
                color: "#fff",
                fontSize: 24,
                fontWeight: 500,
              }}
            >
              {isAdded ? <Check size={22} color="#fff" /> : "+"}
            </div>
          </div>
        );
      })}
      {!welcome && added > 0 && (
        <div
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            top: CART_Y,
            height: 62,
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 22px",
            background: app.ink,
            color: "#fff",
            fontWeight: 700,
            fontSize: 17,
            transform: `translateY(${(1 - cart) * 90}px)`,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 26, height: 26, borderRadius: "50%", background: om.ember[1], display: "grid", placeItems: "center", fontSize: 14 }}>
              {added}
            </span>
            Commander
          </span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{euros(total)}</span>
        </div>
      )}
      {!welcome && <PaySheet />}
    </div>
  );
};

const PaySheet = () => {
  const frame = useCurrentFrame();
  if (frame < T.SHEET) return null;
  const up = useInStatic(frame, T.SHEET);
  const paying = frame >= T.TAPS[3] + 3;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "rgb(20 12 8 / 0.45)", opacity: up }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 430,
          borderRadius: "28px 28px 0 0",
          background: app.card,
          padding: "26px 24px",
          transform: `translateY(${(1 - up) * 440}px)`,
        }}
      >
        <div style={{ width: 44, height: 5, borderRadius: 3, background: app.line, margin: "-12px auto 18px" }} />
        <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 26 }}>Votre commande</div>
        {DISHES.slice(0, 2).map((dish) => (
          <div key={dish.name} style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 16 }}>
            <span>1× {dish.name}</span>
            <span>{euros(dish.price)}</span>
          </div>
        ))}
        <div style={{ height: 1, background: app.line, margin: "18px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 18 }}>
          <span>Total</span>
          <span>{euros(ORDER_TOTAL)}</span>
        </div>
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, background: app.soft, fontSize: 15 }}>
          <span style={{ width: 34, height: 22, borderRadius: 4, background: emberGradient(120) }} />
          Carte bancaire
        </div>
        <div
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            top: PAY_Y - (H - 430),
            height: 62,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            background: emberGradient(),
            color: "#fff",
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          {paying ? <Spinner /> : `Payer ${euros(ORDER_TOTAL)}`}
        </div>
      </div>
    </>
  );
};

const useInStatic = (frame: number, at: number) => interpolate(frame, [at, at + 10], [0, 1], { ...clamp, easing: (t) => 1 - (1 - t) ** 3 });

const Spinner = () => {
  const frame = useCurrentFrame();
  return (
    <span
      style={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        border: "3px solid rgb(255 255 255 / 0.35)",
        borderTopColor: "#fff",
        rotate: `${frame * 24}deg`,
      }}
    />
  );
};

const STEPS = ["Reçue", "En cuisine", "Prête"];

const Ticket = () => {
  const frame = useCurrentFrame();
  const ready = ramp(frame, T.READY, T.READY + 8);
  const isReady = frame >= T.READY;
  const step = isReady ? 2 : frame >= T.PRINT ? 1 : 0;
  const check = useIn(T.PAID + 4, springs.snappy);
  const left = T.READY_MINUTE - (T.ORDER_MINUTE + T.LAPSE.filter((at) => frame >= at).length);
  const progress = interpolate(frame, [T.ESTIMATE, T.LAPSE[T.LAPSE.length - 1] + 8], [0.04, 1], clamp);
  const estimate = useIn(T.ESTIMATE, springs.snappy);
  const loyalty = useIn(T.POINTS, springs.smooth);
  const points = POINTS_BEFORE + POINTS_EARNED * ramp(frame, T.POINTS + 6, T.POINTS + 26);
  const readyPop = useIn(T.READY, springs.snappy);
  return (
    <div style={{ position: "absolute", inset: 0, background: app.paper, padding: "62px 16px 0" }}>
      <div style={{ textAlign: "center", fontSize: 14, fontWeight: 600, color: app.muted }}>Le Petit Comptoir</div>
      <div
        style={{
          position: "relative",
          marginTop: 12,
          height: 214,
          borderRadius: 28,
          overflow: "hidden",
          background: app.card,
          boxShadow: "0 10px 30px rgb(60 30 10 / 0.08)",
          textAlign: "center",
          scale: String(1 + 0.04 * Math.sin(Math.PI * Math.min(1, readyPop))),
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: emberGradient(135), opacity: ready }} />
        <div
          style={{
            position: "relative",
            paddingTop: isReady ? 14 : 22,
            fontFamily: isReady ? fonts.display : fonts.sans,
            fontSize: isReady ? 36 : 15,
            fontWeight: 600,
            color: isReady ? "#fff" : app.muted,
          }}
        >
          {isReady ? "C’est prêt\u202f!" : "Votre commande"}
        </div>
        <div style={{ position: "relative", fontFamily: fonts.display, fontWeight: 600, fontSize: 100, lineHeight: 1.05, color: isReady ? "#fff" : app.ink }}>
          N°&#8239;42
        </div>
        <div
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 4,
            padding: "6px 14px",
            borderRadius: 999,
            fontSize: 15,
            fontWeight: 700,
            background: isReady ? "rgb(255 255 255 / 0.22)" : "#E3F4EA",
            color: isReady ? "#fff" : app.ok,
            transform: `scale(${0.7 + 0.3 * check})`,
          }}
        >
          <Check size={16} color={isReady ? "#fff" : app.ok} /> {isReady ? "Au comptoir" : `Payée · ${euros(ORDER_TOTAL)}`}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "22px 22px 0" }}>
        {STEPS.map((label, i) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 90 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: i <= step ? (i === 2 ? om.ember[1] : app.ok) : app.line,
                boxShadow: i === step && !isReady ? `0 0 0 5px rgb(46 157 98 / 0.18)` : undefined,
              }}
            />
            <div style={{ fontSize: 13, fontWeight: 600, color: i <= step ? app.ink : app.muted }}>{label}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 18,
          height: 190,
          borderRadius: 24,
          background: app.card,
          padding: "20px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 10px 30px rgb(60 30 10 / 0.06)",
        }}
      >
        {frame < T.ESTIMATE ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: app.muted }}>
              Heure de retrait <AiTag />
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{ width: 14, height: 14, borderRadius: "50%", background: om.ember[1], opacity: 0.3 + 0.7 * Math.abs(Math.sin((frame - i * 5) / 7)) }}
                />
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 14, color: app.muted }}>L’IA calcule…</div>
          </div>
        ) : (
          <div style={{ transform: `scale(${0.85 + 0.15 * estimate})`, transformOrigin: "0 50%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: app.muted }}>
              {isReady ? "Prête à" : "Prête vers"} <AiTag />
            </div>
            <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 82, lineHeight: 1.05 }}>12:{T.READY_MINUTE}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: isReady ? app.ok : om.ember[2] }}>
              {isReady ? "Pile à l’heure annoncée" : `dans ${left} min`}
            </div>
          </div>
        )}
        <Ring progress={frame < T.ESTIMATE ? 0 : progress} done={isReady} />
      </div>
      {frame >= T.POINTS && (
        <div
          style={{
            marginTop: 16,
            borderRadius: 24,
            padding: "18px 22px",
            background: app.ink,
            color: "#fff",
            opacity: loyalty,
            transform: `translateY(${(1 - loyalty) * 60}px)`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: om.ember[0] }}>Fidélité</span>
            <span style={{ fontWeight: 700, fontSize: 26, color: om.ember[0] }}>+{POINTS_EARNED} pts</span>
          </div>
          <div style={{ marginTop: 8, fontFamily: fonts.display, fontSize: 40, fontWeight: 600 }}>{Math.round(points)} points</div>
          <div style={{ marginTop: 10, height: 10, borderRadius: 5, background: "rgb(255 255 255 / 0.15)" }}>
            <div style={{ width: `${(points / REWARD_AT) * 100}%`, height: "100%", borderRadius: 5, background: emberGradient() }} />
          </div>
          <div style={{ marginTop: 10, fontSize: 14, opacity: 0.8 }}>Encore {REWARD_AT - POINTS_BEFORE - POINTS_EARNED} points : un cookie offert</div>
        </div>
      )}
    </div>
  );
};

const AiTag = () => (
  <span style={{ padding: "2px 8px", borderRadius: 999, background: emberGradient(), color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>IA</span>
);

const Ring = ({ progress, done }: { progress: number; done: boolean }) => {
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <svg width={104} height={104} viewBox="0 0 104 104">
      <circle cx="52" cy="52" r={r} fill="none" stroke={app.line} strokeWidth="9" />
      <circle
        cx="52"
        cy="52"
        r={r}
        fill="none"
        stroke={done ? app.ok : om.ember[1]}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${c * progress} ${c}`}
        transform="rotate(-90 52 52)"
      />
      {done && <path d="M38 53l9 9 19-20" fill="none" stroke={app.ok} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
};

const Gift = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round">
    <rect x="3" y="9" width="18" height="12" rx="2" />
    <path d="M3 13h18M12 9v12M12 9c-2-4-6-4-6-1.5S10 9 12 9zm0 0c2-4 6-4 6-1.5S14 9 12 9z" />
  </svg>
);
