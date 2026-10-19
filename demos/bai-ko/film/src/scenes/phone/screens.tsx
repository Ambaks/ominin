import type { ReactNode } from "react";
import { AbsoluteFill, Img, interpolate } from "remotion";
import { capture, phone } from "../../captures";
import { fonts } from "../../brand/fonts";
import { bk, PINK_RGB, VIOLET_RGB } from "../../brand/tokens";
import { DEVICES } from "../../kit/Device";
import { CLAMP } from "../../kit/motion";

const W = phone.viewport.width;
/** The page area: the screen under the status bar. */
const H = phone.viewport.height;
const STATUS_BAR = DEVICES.phone.viewport.height - H;

/** A page y, in the phone's screen coordinates. */
export const onScreen = (pageY: number) => STATUS_BAR + pageY;
/** How much of the page shows through above an open sheet. */
const BACKDROP_DIM = 0.55;

/** The phone's screen: a status bar at the given time, the page below it. */
export const PhoneScreen = ({ time, children }: { time: string; children: ReactNode }) => (
  <AbsoluteFill style={{ background: bk.black }}>
    <StatusBar time={time} />
    <div style={{ position: "absolute", left: 0, top: STATUS_BAR, width: W, height: H, overflow: "hidden" }}>{children}</div>
  </AbsoluteFill>
);

const StatusBar = ({ time }: { time: string }) => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: STATUS_BAR,
      padding: "6px 30px 0 40px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontFamily: fonts.sans,
      fontWeight: 600,
      fontSize: 16,
      color: bk.white,
    }}
  >
    <span>{time}</span>
    <svg width="70" height="13" viewBox="0 0 70 13" fill={bk.white}>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 5} y={9 - i * 3} width="3.4" height={4 + i * 3} rx="1" />
      ))}
      <path d="M31 4.2a9.5 9.5 0 0 1 12.8 0l-1.5 1.6a7.3 7.3 0 0 0-9.8 0Zm2.9 3a5.3 5.3 0 0 1 7 0l-1.6 1.6a3 3 0 0 0-3.8 0Zm3.5 4.9-1.6-1.7a2.3 2.3 0 0 1 3.2 0Z" />
      <rect x="48.5" y="1" width="19" height="11" rx="3.2" fill="none" stroke={bk.white} strokeOpacity="0.45" />
      <rect x="50.5" y="3" width="13" height="7" rx="1.6" />
      <rect x="68.3" y="4.5" width="1.5" height="4" rx="0.7" fillOpacity="0.45" />
    </svg>
  </div>
);

/** A region of a page capture, shown in place. */
const Crop = ({ src, top, bottom = H }: { src: string; top: number; bottom?: number }) => (
  <div style={{ position: "absolute", left: 0, top, width: W, height: bottom - top, overflow: "hidden" }}>
    <Img src={capture(src)} style={{ position: "absolute", left: 0, top: -top, width: W, height: H }} />
  </div>
);

/** The page behind an open sheet, dimmed so the sheet carries the eye. */
const Backdrop = ({ src, top, open }: { src: string; top: number; open: number }) => (
  <div style={{ opacity: Math.min(1, open * 1.4) }}>
    <Crop src={src} top={0} bottom={top} />
    <div style={{ position: "absolute", left: 0, top: 0, width: W, height: top, background: `rgb(0 0 0 / ${BACKDROP_DIM})` }} />
  </div>
);

export const Page = ({ src }: { src: string }) => (
  <Img src={capture(src)} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />
);

/**
 * The carte scrolled by `scroll` px: the tall capture moving under the
 * category bar, which sticks to the top once reached, as in the app.
 */
export const MenuScroll = ({ scroll }: { scroll: number }) => {
  const bar = phone.menu.categoryBar;
  return (
    <AbsoluteFill style={{ background: bk.black }}>
      <Img
        src={capture(phone.menu.src)}
        style={{ position: "absolute", left: 0, top: -scroll, width: W, height: phone.menu.height }}
      />
      {scroll > bar.y && <Crop src={phone.added.main} top={0} bottom={bar.height} />}
    </AbsoluteFill>
  );
};

/**
 * A quick flick from one scrolled page to another further down: the two
 * captures slide as one strip between the category bar and the cart
 * button, both pinned as in the app.
 */
export const Flick = ({ from, to, t }: { from: string; to: string; t: number }) => {
  const top = phone.menu.categoryBar.height;
  const cart = phone.added.cartTap;
  // The button floats as far above its strip's top as below it.
  const bottom = cart.y - (H - cart.y - cart.height);
  const span = bottom - top;
  // Each capture only between its own bar and button: the pinned ones are the only ones ever seen.
  const slide = (src: string, offset: number) => (
    <div style={{ position: "absolute", left: 0, top: offset, width: W, height: span, overflow: "hidden" }}>
      <Img src={capture(src)} style={{ position: "absolute", left: 0, top: -top, width: W, height: H }} />
    </div>
  );
  return (
    <AbsoluteFill style={{ background: bk.black }}>
      <div style={{ position: "absolute", left: 0, top, width: W, height: span, overflow: "hidden" }}>
        {slide(from, -t * span)}
        {slide(to, (1 - t) * span)}
      </div>
      <Crop src={t < 0.5 ? from : to} top={0} bottom={top} />
      <Crop src={t < 0.5 ? from : to} top={bottom} />
    </AbsoluteFill>
  );
};

/**
 * A sheet over the page, rebuilt from its capture: the dimmed page above
 * the sheet's edge fades in, the sheet itself slides up from the bottom.
 */
export const SheetImage = ({ src, top, open }: { src: string; top: number; open: number }) => (
  <AbsoluteFill>
    <Backdrop src={src} top={top} open={open} />
    <div style={{ translate: `0 ${(1 - open) * (H - top)}px` }}>
      <Crop src={src} top={top} />
    </div>
  </AbsoluteFill>
);

/**
 * The Dak Bap Spicy's sheet at state `index` (choices made so far), its body
 * scrolled by `scroll`: the capture's own frame, with the body replaced by
 * the tall capture of the whole list so the scroll between choices is real.
 */
export const ComposerSheet = ({ index, scroll, open }: { index: number; scroll: number; open: number }) => {
  const { sheetTop, states } = phone.composer;
  const state = states[index];
  const { body } = state;
  return (
    <AbsoluteFill>
      <Backdrop src={state.screen} top={sheetTop} open={open} />
      <div style={{ position: "absolute", inset: 0, translate: `0 ${(1 - open) * (H - sheetTop)}px` }}>
        <Crop src={state.screen} top={sheetTop} />
        <div
          style={{
            position: "absolute",
            left: body.x,
            top: body.y,
            width: body.width,
            height: body.height,
            overflow: "hidden",
          }}
        >
          <Img
            src={capture(state.content)}
            style={{ position: "absolute", left: 0, top: -scroll, width: body.width, height: state.contentHeight }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * The in-page payment sheet (components/menu/card-payment.tsx, Stripe's
 * Express Checkout over its card form), in page px: its height and side
 * padding; its rows' tops below its top edge — title, amount, the wallet's
 * button and its height, « ou par carte », the card's fields and their
 * height, the pay button; then the paid state's check, its centre and ring.
 */
const PAYMENT = {
  sheet: 470,
  pad: 24,
  title: 32,
  amount: 54,
  wallet: { top: 126, height: 48 },
  divider: 188,
  card: { top: 226, height: 104 },
  pay: 342,
  check: 96,
  ring: 84,
};
/** Page y of the payment's spinner, then check. */
export const PAYMENT_CHECK = H - PAYMENT.sheet + PAYMENT.check;
/** Where the wallet's button is tapped, in page px. */
export const WALLET_TAP = { x: W / 2, y: H - PAYMENT.sheet + PAYMENT.wallet.top + PAYMENT.wallet.height / 2 };
/** The payment's check, in its own units: its box, its pink disc's radius, its tick and the tick's width. */
export const CHECK = { box: 84, disc: 40, tick: "M26 43 l11 11 l21 -23", stroke: 7 };
/** The carte's sheets: the theme's night surface, its pale ink, grey, faint grey and pink hairline (globals.css .theme-bai-ko). */
const SHEET = { paper: "#111115", ink: "#EEEEF5", muted: "#9090A8", faint: "#8282A0", hairline: `rgb(${PINK_RGB} / 0.16)` };

/** The check's pink disc, in page px. */
export const CHECK_RADIUS = (PAYMENT.ring * CHECK.disc) / CHECK.box;

const Lock = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
    <rect x={3} y={7} width={10} height={7.5} rx={1.8} />
    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
  </svg>
);

/** The sheet's small capitals: a title, a divider's word. */
const caps = { fontSize: 11, fontWeight: 600, letterSpacing: "0.24em", textTransform: "uppercase" } as const;

/**
 * The payment, drawn after the app's own sheet: the demo stops before the
 * payment provider, whose fields only open on a live order. The wallet's
 * button is tapped; its own confirmation, the phone's, is left out. The form
 * goes (`form`), then the sheet shows the payment going through (`chosen`),
 * and the app's paid state once `done` turns the spinner into the check.
 */
export const PaymentSheet = ({ open, form, chosen, spin, done, quiet = 0 }: { open: number; form: number; chosen: number; spin: number; done: number; quiet?: number }) => {
  const { sheet, pad, ring } = PAYMENT;
  const row = (top: number, children: ReactNode, style = {}) => (
    <div style={{ position: "absolute", left: pad, right: pad, top, display: "flex", alignItems: "center", justifyContent: "center", ...style }}>{children}</div>
  );
  const field = { height: PAYMENT.card.height / 2, display: "flex", alignItems: "center", padding: "0 16px", fontSize: 15, color: SHEET.faint } as const;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "rgb(0 0 0 / 0.55)", opacity: open }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: sheet,
          translate: `0 ${(1 - open) * sheet}px`,
          borderRadius: "28px 28px 0 0",
          background: SHEET.paper,
          boxShadow: "0 -20px 50px rgb(0 0 0 / 0.5)",
          borderTop: `1px solid ${SHEET.hairline}`,
          overflow: "hidden",
          fontFamily: fonts.sans,
          color: SHEET.ink,
        }}
      >
        {/* The theme's glow at the sheet's top (ember-glow). */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 224, background: `radial-gradient(ellipse at 50% 0%, rgb(${PINK_RGB} / 0.08), rgb(${VIOLET_RGB} / 0.08) 40%, transparent 70%)` }} />
        <div style={{ opacity: form }}>
          {row(PAYMENT.title, <><Lock size={14} /><span style={{ marginLeft: 8 }}>Paiement sécurisé</span></>, { ...caps, letterSpacing: "0.28em", color: bk.pink })}
          {row(PAYMENT.amount, phone.total, { fontFamily: fonts.display, fontSize: 48, lineHeight: 1, color: bk.pink })}
          {row(
            PAYMENT.wallet.top,
            "Apple Pay",
            { height: PAYMENT.wallet.height, borderRadius: 10, background: "#FFFFFF", color: "#000000", fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" },
          )}
          {row(
            PAYMENT.divider,
            <>
              <span style={{ flex: 1, height: 1, background: SHEET.hairline }} />
              <span style={{ margin: "0 16px" }}>ou par carte</span>
              <span style={{ flex: 1, height: 1, background: SHEET.hairline }} />
            </>,
            { ...caps, letterSpacing: "0.2em", color: SHEET.faint },
          )}
          <div style={{ position: "absolute", left: pad, right: pad, top: PAYMENT.card.top, height: PAYMENT.card.height, borderRadius: 16, border: `1px solid ${SHEET.hairline}` }}>
            <div style={{ ...field, borderBottom: `1px solid ${SHEET.hairline}` }}>Numéro de carte</div>
            <div style={{ display: "flex" }}>
              <div style={{ ...field, flex: 1, borderRight: `1px solid ${SHEET.hairline}` }}>MM / AA</div>
              <div style={{ ...field, flex: 1 }}>CVC</div>
            </div>
          </div>
          {row(
            PAYMENT.pay,
            <><Lock size={16} /><span style={{ marginLeft: 8 }}>{`Payer ${phone.total}`}</span></>,
            { height: 52, borderRadius: 999, background: bk.pink, color: bk.black, fontSize: 15, fontWeight: 600 },
          )}
        </div>
        <div style={{ opacity: chosen }}>
          <div style={{ position: "absolute", left: (W - ring) / 2, top: PAYMENT.check - ring / 2, width: ring, height: ring }}>
            <svg width={ring} height={ring} viewBox="0 0 84 84" style={{ position: "absolute", inset: 0, opacity: 1 - done }}>
              <circle cx={42} cy={42} r={36} fill="none" stroke="rgb(238 238 245 / 0.12)" strokeWidth={6} />
              <path d="M42 6 a36 36 0 0 1 36 36" fill="none" stroke={bk.pink} strokeWidth={6} strokeLinecap="round" transform={`rotate(${spin} 42 42)`} />
            </svg>
            <svg
              width={ring}
              height={ring}
              viewBox={`0 0 ${CHECK.box} ${CHECK.box}`}
              style={{ position: "absolute", inset: 0, scale: String(0.6 + done * 0.4), opacity: done }}
            >
              <circle cx={CHECK.box / 2} cy={CHECK.box / 2} r={CHECK.disc} fill={bk.pink} />
              <path
                d={CHECK.tick}
                fill="none"
                stroke={bk.black}
                strokeWidth={CHECK.stroke}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={60}
                strokeDashoffset={interpolate(done, [0.2, 1], [60, 0], CLAMP)}
              />
            </svg>
          </div>
          {/* The text gives way (`quiet`) as the iris reaches it. */}
          {row(PAYMENT.check + ring / 2 + 24, done > 0.5 ? "Paiement confirmé" : "Paiement en cours…", { ...caps, letterSpacing: "0.28em", color: bk.pink, opacity: 1 - quiet })}
          {row(PAYMENT.check + ring / 2 + 48, phone.total, { fontFamily: fonts.display, fontSize: 40, lineHeight: 1, opacity: 1 - quiet })}
          {row(PAYMENT.check + ring / 2 + 100, "Merci ! Votre commande part en cuisine.", { fontSize: 14, color: SHEET.muted, opacity: (1 - quiet) * done })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
