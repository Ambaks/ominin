import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { phone } from "../../captures";
import { fonts } from "../../brand/fonts";
import { bk } from "../../brand/tokens";
import { aim, Device, DEVICES, pose, screenScale, type Pose } from "../../kit/Device";
import { useLayout } from "../../kit/layout";
import { CLAMP, HOLD_DRIFT, mix, springs, useTrack } from "../../kit/motion";
import { onLabel, Tap } from "../../kit/Tap";
import { Highlight, Reveal } from "../../kit/type";
import { beat } from "../../timeline";
import { KITCHEN } from "../Kitchen";
import { CLAIM, Kicker, statement, STATEMENT } from "../styles";
import { CHECK, CHECK_RADIUS, ComposerSheet, Flick, MenuScroll, onScreen, Page, PAYMENT_CHECK, PaymentSheet, PhoneScreen, SheetImage, WALLET_TAP } from "./screens";

/*
 * Scenes 5–7 on one phone: the real carte snaps down to the Dak Bap Spicy,
 * its sheet takes the dolsot, the camera closes on the add button, a
 * kimchi joins, the cart goes to payment — the wallet's button tapped —
 * whose check opens out in pink under the claim. The phone opens out of the table's code the room scene
 * flies into.
 */
/** On the beat after the drop, as the dive fills the frame with the eye's black. */
export const ENTER = beat(1);
const SNAPS = [beat(3), beat(4)];
export const COMPOSE = beat(5);
const CHOICES = [7].map(beat);
/** In the tall frame the phone pulls back through the headline's band: the headline waits this many frames more, for it to settle. */
const TALL_HEADLINE_WAIT = 10;
const HEADLINE_EXIT = 7;
const ADD = beat(9);
const TO_SIDE = beat(10);
const SIDE = beat(11);
/**
 * The headline leaves as one block. In the tall frame it stays over the
 * composer's first choice, tapped with the phone still aside, before the
 * phone comes up through its band; in the wide frame, where the phone stays
 * right of it, until « Rien d'oublié » takes its place on the side's tap —
 * in the tall frame once the phone has moved aside, clear of the line.
 */
const HEADLINE_OUT = { landscape: SIDE - HEADLINE_EXIT, portrait: CHOICES[0] - 2 };
const SIDE_LINE = { landscape: SIDE, portrait: SIDE + 10 };
/** « Rien d'oublié » stays this many frames past the pay tap, until the phone comes to the centre. */
const SIDE_LINE_HOLD = 8;
const CART = beat(12);
const PAY = beat(14);
/** The sheet's wallet button, tapped: the payment's one choice. */
const WALLET = beat(15);
export const PAID = beat(17);
/** Once paid, the check's pink opens out to fill the frame: frames after PAID. */
export const IRIS = PAID + 20;
/** Frames the check takes to fill the frame; the claim follows on the pink. */
const IRIS_FRAMES = 12;
/** Frames into the iris the tick shrinks away over. */
const TICK_OUT = [5, 9];
const PAID_CLAIM = IRIS + IRIS_FRAMES + 1;
/** How much closer the claim comes on the pink, until the cut. */
const PAID_PUSH = 0.06;
/** Every tap on the phone, in order, for the sound. */
export const TAPS = [COMPOSE, ...CHOICES, ADD, SIDE, CART, PAY, WALLET];

const TIME = phone.order.at;
/** How close the camera comes on the phone's sheets — the composer, its add button, the cart — and on the payment's check. */
const PUSH = { sheet: 1.5, paid: 1.4 };
/** The payment form fades off as the wallet's touch lifts, then the payment going through fades in: frames, after the tap. */
const FORM_OUT = { at: 3, frames: 4 };
/** The payment's spinner, in degrees per frame. */
const SPIN = 18;
/** How far the phone rises before the cart tap, in the tall frame, in px. */
const CART_RISE = 75;

type Box = { x: number; y: number; width: number; height: number };
const middle = (box: Box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

const { menu, composer, added } = phone;
const { states } = composer;
/**
 * The composer's scroll as each choice is tapped, its row centered in the
 * sheet's body (the app moves on to the next group by itself), then the
 * scroll the sheet ends on.
 */
const choiceScroll = [
  ...states.slice(0, -1).map(({ tap, body, contentHeight }) =>
    Math.min(Math.max(0, tap!.y + tap!.height / 2 - body.height / 2), contentHeight - body.height),
  ),
  states[states.length - 1].scrollTop,
];
/** Where choice k is tapped, on its radio, in page px. */
const choiceTap = (k: number) => {
  const radio = states[k].radio!;
  return { x: radio.x + radio.width / 2, y: states[k].body.y + radio.y - choiceScroll[k] + radio.height / 2 };
};

export const PhoneFlow = ({ from }: { from: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height, portrait, pick } = useLayout();
  const at = (abs: number) => abs - from;
  const since = (abs: number, config = springs.smooth, duration?: number) =>
    spring({ frame: frame - at(abs), fps, config, durationInFrames: duration });
  const after = (abs: number) => frame >= at(abs);

  // The whole phone in frame, with room around it, wherever it stands.
  const size = pick(840, 1180);
  /** The pose that brings page point (x, y) to `target`, `push` times closer. */
  const onPage = (x: number, y: number, target: { x: number; y: number }, push: number, tilt: Partial<Pose>) =>
    pose({ ...aim(DEVICES.phone, size, { x, y: onScreen(y) }, target, push), ...tilt });
  const aside = pick(
    pose({ x: 360, y: -10, rotateX: 6, rotateY: -18, rotateZ: 2.5 }),
    // In the tall frame, a bigger phone: at 55 % of the width the cart could not be read.
    pose({ y: 260, rotateX: 8, rotateY: -10, rotateZ: 2, scale: 1.25 }),
  );
  // The flick to the sides: centered in the tall frame; in the wide frame the phone stays aside, clear of the headline.
  const flick = pick(aside, pose({ y: 110, rotateX: 4, rotateY: -4, scale: 1.3 }));
  const close = { rotateX: 3, rotateY: -4 };
  // The add button sits at the sheet's foot: low in the frame, the phone fills it; in the wide frame, where the phone stands aside.
  const addTarget = pick({ x: aside.x, y: 330 }, { x: 0, y: 520 });
  const addTap = middle(composer.addTap);
  // In the wide frame the camera comes in on each sheet as it opens — the composer, then the cart — where the phone stands aside;
  // in the tall frame the phone is already large, and the composer opens under the headline.
  const composerBody = composer.states[0].body;
  const onComposer = pick(onPage(phone.viewport.width / 2, composerBody.y + composerBody.height / 2, { x: aside.x, y: 150 }, PUSH.sheet, close), aside);
  const onCart = (rest: Pose) => pick(onPage(phone.viewport.width / 2, (phone.cart.sheetTop + phone.viewport.height) / 2, { x: aside.x, y: 0 }, PUSH.sheet, close), rest);
  // Centered: the sheet is read alone, then its check opens out from the frame's middle.
  const paidAt = pick({ x: 0, y: 0 }, { x: 0, y: 330 });
  const onPaid = (push: number) => onPage(phone.viewport.width / 2, PAYMENT_CHECK, paidAt, push, { rotateX: 4, rotateY: pick(-10, -5) });
  const iris = interpolate(frame - at(IRIS), [0, IRIS_FRAMES], [0, 1], { easing: Easing.in(Easing.exp), ...CLAMP });
  const disc = mix(CHECK_RADIUS * screenScale(DEVICES.phone, size) * PUSH.paid, Math.hypot(width / 2 + Math.abs(paidAt.x), height / 2 + Math.abs(paidAt.y)), iris);
  // The tick rides its disc, then shrinks away over a few frames before the pink is full.
  const tickSize = ((disc * CHECK.box) / CHECK.disc) * interpolate(frame - at(IRIS), TICK_OUT, [1, 0], { easing: Easing.in(Easing.cubic), ...CLAMP });

  const phonePose = useTrack<Pose>([
    // Out of the QR code: the screen fills the frame, then the phone pulls back.
    { at: 0, value: pose({ scale: 2.8 }) },
    { at: 2, value: aside, config: springs.heavy },
    { at: at(COMPOSE) + 4, value: onComposer, config: springs.push },
    // The one choice is tapped under the headline; then the camera comes in on the add button.
    { at: at(CHOICES[CHOICES.length - 1]) + 6, value: onPage(addTap.x, addTap.y, addTarget, PUSH.sheet, close), config: springs.push },
    { at: at(TO_SIDE) - 6, value: flick, config: springs.push },
    { at: at(SIDE), value: aside, config: springs.heavy },
    // Through the music's stop, the phone keeps drifting closer; in the tall frame it rises instead, its order bar into the frame for the tap.
    { at: at(SIDE) + 10, value: pick(pose({ ...aside, scale: aside.scale * HOLD_DRIFT }), pose({ ...aside, y: aside.y - CART_RISE })), duration: CART - SIDE - 10 },
    { at: at(CART) + 4, value: onCart(pose({ ...aside, y: aside.y - CART_RISE })), config: springs.push },
    { at: at(PAY) + 8, value: onPaid(PUSH.paid), config: springs.heavy },
    { at: at(PAID), value: onPaid(PUSH.paid * HOLD_DRIFT), duration: KITCHEN - PAID },
  ]);

  const headlineAt = ENTER + pick(0, TALL_HEADLINE_WAIT);
  const headlineOut = interpolate(frame - at(pick(HEADLINE_OUT.landscape, HEADLINE_OUT.portrait)), [0, HEADLINE_EXIT], [0, 1], {
    easing: Easing.in(Easing.cubic),
    ...CLAMP,
  });
  const scroll = SNAPS.reduce((top, snap) => top + (menu.scrollTo / SNAPS.length) * since(snap, springs.smooth, 12), 0);
  const chosen = CHOICES.filter((tap) => after(tap + 2)).length;
  const bodyScroll = CHOICES.reduce(
    (top, tap, k) => top + (choiceScroll[k + 1] - choiceScroll[k]) * since(tap + 6, springs.smooth, 14),
    choiceScroll[0],
  );
  // The composer opens, and goes on the beat: a cut, not two headers sliding past each other.
  const composerOpen = after(ADD + 3) ? 0 : since(COMPOSE + 5, springs.smooth, 12);

  const page = !after(ADD + 3) ? (
    <MenuScroll scroll={scroll} />
  ) : !after(TO_SIDE) ? (
    <Page src={added.main} />
  ) : !after(SIDE + 3) ? (
    <Flick from={added.main} to={added.side.src} t={since(TO_SIDE, springs.smooth, 10)} />
  ) : (
    <Page src={added.src} />
  );

  const text = {
    ...statement,
    fontSize: pick(STATEMENT.landscape, STATEMENT.portrait),
    textAlign: portrait ? "center" : "left",
  } as const;
  const lines = { display: "flex", flexDirection: "column", alignItems: portrait ? "center" : "flex-start" } as const;
  const words = { display: "flex", gap: "0.25em", justifyContent: portrait ? "center" : "flex-start" } as const;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Device model={DEVICES.phone} size={size} pose={phonePose} float={8}>
          <PhoneScreen time={TIME}>
            {page}
            {after(ADD + 3) && <UnderBar bar={added.cartTap} />}
            {/* A tap that opens a sheet stays under it. */}
            <Tap {...middle(menu.composerTap)} at={at(COMPOSE)} />
            <Tap {...middle(added.side.tap)} at={at(SIDE)} />
            <Added {...middle(added.side.tap)} width={added.side.tap.width} at={at(SIDE) + 2} label={`+${added.side.price}`} />
            <Tap {...middle(added.cartTap)} at={at(CART)} />
            {composerOpen > 0.001 && <ComposerSheet index={chosen} scroll={bodyScroll} open={composerOpen} />}
            {CHOICES.map((tap, k) => (
              <Tap key={tap} {...choiceTap(k)} at={at(tap)} />
            ))}
            {/* The add button's touch goes with its sheet: no ripple left over the order bar. */}
            {!after(ADD + 3) && <Tap {...onLabel(composer.addTap)} at={at(ADD)} />}
            {after(CART + 4) && <SheetImage src={phone.cart.src} top={phone.cart.sheetTop} open={since(CART + 4, springs.smooth, 12)} />}
            <Tap {...middle(phone.cart.payTap)} at={at(PAY)} />
            <Tap {...WALLET_TAP} at={at(WALLET)} />
            {after(PAY + 4) && (
              <PaymentSheet
                open={since(PAY + 4, springs.smooth, 12)}
                form={1 - interpolate(frame - at(WALLET) - FORM_OUT.at, [0, FORM_OUT.frames], [0, 1], CLAMP)}
                chosen={interpolate(frame - at(WALLET) - FORM_OUT.at - FORM_OUT.frames, [0, FORM_OUT.frames], [0, 1], CLAMP)}
                spin={Math.max(0, frame - at(WALLET)) * SPIN}
                done={since(PAID, springs.snappy)}
                // The text gives way as the iris reaches it, not before: never a lone tick on an empty sheet.
                quiet={interpolate(frame - at(IRIS), [IRIS_FRAMES * 0.35, IRIS_FRAMES * 0.55], [0, 1], CLAMP)}
              />
            )}
          </PhoneScreen>
        </Device>
      </AbsoluteFill>
      {/* The words over the phone: as it pulls back out of the code, it never cuts through them. */}
      <AbsoluteFill
        style={{
          alignItems: portrait ? "center" : "flex-start",
          justifyContent: portrait ? "flex-start" : "center",
          padding: pick("0 0 0 170px", "135px 0 0"),
        }}
      >
        <div style={{ display: "grid" }}>
          <div style={{ gridArea: "1 / 1", ...lines, gap: 34, opacity: 1 - headlineOut, translate: `0 ${-24 * headlineOut}px` }}>
            <Kicker delay={at(headlineAt + 10)}>Sans attendre personne</Kicker>
            <Reveal fade delay={at(headlineAt + 12)} stagger={2} style={{ ...text, ...lines }}>
              {[
                "Commandé",
                <span style={words}>
                  depuis <Highlight delay={at(headlineAt + 22)}>la table.</Highlight>
                </span>,
              ]}
            </Reveal>
          </div>
          <div style={{ gridArea: "1 / 1", alignSelf: "center", ...text }}>
            <Reveal fade delay={at(pick(SIDE_LINE.landscape, SIDE_LINE.portrait))} exitAt={at(PAY) + SIDE_LINE_HOLD}>
              Rien d’oublié.
            </Reveal>
          </div>
        </div>
      </AbsoluteFill>


      {after(IRIS) && (
        <AbsoluteFill style={{ background: bk.pink, clipPath: `circle(${disc}px at ${width / 2 + paidAt.x}px ${height / 2 + paidAt.y}px)` }}>
          {/* The tick opens out with its disc, then gives way to the claim, which rises in once the pink is full. */}
          <svg
            width={tickSize}
            height={tickSize}
            viewBox={`0 0 ${CHECK.box} ${CHECK.box}`}
            style={{ position: "absolute", left: width / 2 + paidAt.x - tickSize / 2, top: height / 2 + paidAt.y - tickSize / 2 }}
          >
            <path d={CHECK.tick} fill="none" stroke={bk.black} strokeWidth={CHECK.stroke} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", scale: String(1 + PAID_PUSH * interpolate(frame - at(PAID_CLAIM), [0, KITCHEN - PAID_CLAIM], [0, 1], CLAMP)) }}>
        <Reveal
          delay={at(PAID_CLAIM)}
          stagger={2}
          style={{ ...text, ...lines, alignItems: "center", textAlign: "center", fontSize: pick(CLAIM.landscape, CLAIM.portrait), lineHeight: 0.95, color: bk.black }}
        >
          {["Payé", "à table."]}
        </Reveal>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * The price added: the frames it shows for; where it appears, left of its
 * button by its own half-width and a gap, clear of the button's label and of
 * the item's price; how much further left it slides as it fades.
 */
const ADDED = { frames: 20, clear: 48, slide: 50 };

/** The kimchi's price, sliding out of its button as it joins the order: what the order gained. */
const Added = ({ x, y, width, at, label }: { x: number; y: number; width: number; at: number; label: string }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > ADDED.frames) return null;
  const slide = interpolate(t, [0, ADDED.frames], [0, 1], { easing: Easing.out(Easing.cubic) });
  return (
    <div
      style={{
        position: "absolute",
        left: x - width / 2 - ADDED.clear,
        top: y,
        translate: `calc(-50% - ${slide * ADDED.slide}px) -50%`,
        opacity: interpolate(t, [0, 3, ADDED.frames - 6, ADDED.frames], [0, 1, 1, 0]),
        padding: "6px 12px",
        borderRadius: 999,
        background: bk.pink,
        color: bk.black,
        fontFamily: fonts.sans,
        fontWeight: 800,
        fontSize: 16,
        whiteSpace: "nowrap",
        boxShadow: "0 6px 18px rgb(0 0 0 / 0.4)",
      }}
    >
      {label}
    </div>
  );
};

/** Under the floating order bar, the page's own night: the menu scrolled behind it does not show below it. */
const UnderBar = ({ bar }: { bar: Box }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: bar.y + bar.height / 2, bottom: 0, overflow: "hidden" }}>
    <div
      style={{
        position: "absolute",
        left: bar.x,
        top: -bar.height / 2,
        width: bar.width,
        height: bar.height,
        borderRadius: bar.height / 2,
        boxShadow: `0 0 0 ${bar.height}px ${bk.black}`,
      }}
    />
  </div>
);
