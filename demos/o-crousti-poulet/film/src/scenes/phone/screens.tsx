import type { ReactNode } from "react";
import { AbsoluteFill, Img, interpolate } from "remotion";
import profile from "../../../../profile.json";
import { capture, phone } from "../../captures";
import { fonts } from "../../brand/fonts";
import { ocp } from "../../brand/tokens";
import { DEVICES } from "../../kit/Device";

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
  <AbsoluteFill style={{ background: ocp.black }}>
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
      fontFamily: fonts.poppins,
      fontWeight: 600,
      fontSize: 16,
      color: ocp.white,
    }}
  >
    <span>{time}</span>
    <svg width="70" height="13" viewBox="0 0 70 13" fill={ocp.white}>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 5} y={9 - i * 3} width="3.4" height={4 + i * 3} rx="1" />
      ))}
      <path d="M31 4.2a9.5 9.5 0 0 1 12.8 0l-1.5 1.6a7.3 7.3 0 0 0-9.8 0Zm2.9 3a5.3 5.3 0 0 1 7 0l-1.6 1.6a3 3 0 0 0-3.8 0Zm3.5 4.9-1.6-1.7a2.3 2.3 0 0 1 3.2 0Z" />
      <rect x="48.5" y="1" width="19" height="11" rx="3.2" fill="none" stroke={ocp.white} strokeOpacity="0.45" />
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

/** A full page capture, with the page above its sheet dimmed. */
export const SheetShot = ({ src, top }: { src: string; top: number }) => (
  <AbsoluteFill>
    <Backdrop src={src} top={top} open={1} />
    <Crop src={src} top={top} />
  </AbsoluteFill>
);

export const Page = ({ src, offset = 0 }: { src: string; offset?: number }) => (
  <Img src={capture(src)} style={{ position: "absolute", left: 0, top: offset, width: W, height: H }} />
);

/**
 * The carte scrolled by `scroll` px: the tall capture moving under the
 * category bar, which sticks to the top once reached, as in the app.
 */
export const MenuScroll = ({ scroll }: { scroll: number }) => {
  const bar = phone.menu.categoryBar;
  return (
    <AbsoluteFill style={{ background: ocp.black }}>
      <Img
        src={capture(phone.menu.src)}
        style={{ position: "absolute", left: 0, top: -scroll, width: W, height: phone.menu.height }}
      />
      {scroll > bar.y && <Crop src={phone.added.duo} top={0} bottom={bar.height} />}
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
  const slide = (src: string, offset: number) => (
    <Img src={capture(src)} style={{ position: "absolute", left: 0, top: offset - top, width: W, height: H }} />
  );
  return (
    <AbsoluteFill style={{ background: ocp.black }}>
      <div style={{ position: "absolute", left: 0, top, width: W, height: span, overflow: "hidden" }}>
        {slide(from, -t * span)}
        {slide(to, (1 - t) * span)}
      </div>
      <Crop src={t < 0.5 ? from : to} top={0} bottom={top} />
      <Crop src={from} top={bottom} />
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
 * The Menu Duo composer at state `index` (choices made so far), its body
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

const PAYMENT = { sheet: 330, ring: 84, top: 40 };
/** Page y of the payment's spinner, then check. */
export const PAYMENT_CHECK = H - PAYMENT.sheet + PAYMENT.top + PAYMENT.ring / 2;
/** The payment's check, in its own units: its box, its yellow disc's radius, its tick and the tick's width. */
export const CHECK = { box: 84, disc: 40, tick: "M26 43 l11 11 l21 -23", stroke: 7 };
/** The check's yellow disc, in page px. */
export const CHECK_RADIUS = (PAYMENT.ring * CHECK.disc) / CHECK.box;

/**
 * Card payment, recreated: the demo stops before the payment provider, so
 * this sheet stands for it in the theme's own type and colors. `done` turns
 * the spinner into the check.
 */
export const PaymentSheet = ({ open, done, quiet = 0 }: { open: number; done: number; quiet?: number }) => {
  const { sheet, ring, top } = PAYMENT;
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
          background: ocp.surface,
          boxShadow: "0 -20px 50px rgb(0 0 0 / 0.5)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: top,
          fontFamily: fonts.poppins,
        }}
      >
        <div style={{ position: "relative", width: ring, height: ring }}>
          <svg width={ring} height={ring} viewBox="0 0 84 84" style={{ position: "absolute", inset: 0, opacity: 1 - done }}>
            <circle cx={42} cy={42} r={36} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth={6} />
            <path
              d="M42 6 a36 36 0 0 1 36 36"
              fill="none"
              stroke={ocp.yellow}
              strokeWidth={6}
              strokeLinecap="round"
              transform={`rotate(${open * 540} 42 42)`}
            />
          </svg>
          <svg
            width={ring}
            height={ring}
            viewBox={`0 0 ${CHECK.box} ${CHECK.box}`}
            style={{ position: "absolute", inset: 0, scale: String(0.6 + done * 0.4), opacity: done }}
          >
            <circle cx={CHECK.box / 2} cy={CHECK.box / 2} r={CHECK.disc} fill={ocp.yellow} />
            <path
              d={CHECK.tick}
              fill="none"
              stroke={ocp.black}
              strokeWidth={CHECK.stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={60}
              strokeDashoffset={interpolate(done, [0.2, 1], [60, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
            />
          </svg>
        </div>
        {/* The text gives way (`quiet`) before anything grows over it. */}
        <div style={{ marginTop: 22, fontSize: 22, fontWeight: 800, color: ocp.white, opacity: 1 - quiet }}>
          {done > 0.5 ? "Paiement accepté" : "Paiement en cours…"}
        </div>
        <div style={{ marginTop: 6, fontFamily: fonts.anton, fontSize: 34, color: ocp.yellow, opacity: 1 - quiet }}>{phone.total}</div>
        {/* Paid to the restaurant itself: its name underlined as the sheet opens, lit once the payment goes through. */}
        <div style={{ marginTop: 8, fontSize: 13, fontWeight: 500, color: ocp.muted, opacity: 1 - quiet }}>
          Carte bancaire ·{" "}
          <span style={{ position: "relative", color: done > 0.5 ? ocp.white : ocp.muted, fontWeight: done > 0.5 ? 600 : 500 }}>
            {profile.name} {profile.city}
            <span
              style={{
                position: "absolute",
                left: 0,
                bottom: -4,
                height: 2,
                width: `${open * 100}%`,
                background: ocp.yellow,
                borderRadius: 1,
              }}
            />
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
