import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { phone } from "../../captures";
import { fonts } from "../../brand/fonts";
import { ocp } from "../../brand/tokens";
import { aim, Device, DEVICES, pose, screenScale, type Pose } from "../../kit/Device";
import { useLayout } from "../../kit/layout";
import { HOLD_DRIFT, mix, springs, useTrack, type Key } from "../../kit/motion";
import { Tap } from "../../kit/Tap";
import { Highlight, Reveal } from "../../kit/type";
import { beat } from "../../timeline";
import { SLAM } from "../NumberEta";
import { CLAIM, Kicker, STATEMENT } from "../styles";
import { CHECK, CHECK_RADIUS, ComposerSheet, Flick, MenuScroll, onScreen, Page, PAYMENT_CHECK, PaymentSheet, PhoneScreen, SheetImage } from "./screens";

/*
 * Scenes 5–7 on one phone: the real carte snaps down to the Menu Duo, the
 * composer takes one choice per beat — the camera on each row as it is
 * tapped — a dessert joins, the cart goes to payment, whose check opens
 * out in yellow under the claim. The phone opens out of the QR code the
 * street scene flies into.
 */
/** On the beat after the drop, as the dive fills the frame with the eye's black. */
export const ENTER = beat(1);
const SNAPS = [beat(3), beat(4)];
export const COMPOSE = beat(5);
const CHOICES = [6, 7, 8, 9, 10].map(beat);
/** The headline stays over the composer's first choice, tapped with the phone still aside, then leaves as one block. */
const HEADLINE_OUT = CHOICES[0] - 2;
const HEADLINE_EXIT = 7;
const ADD = beat(11);
const TO_DESSERT = beat(12);
const DESSERT = beat(13);
const CART = beat(15);
const PAY = beat(17);
export const PAID = beat(19);
/** Once paid, the check's yellow opens out to fill the frame, under the claim: frames after PAID, and how long it takes. */
export const IRIS = PAID + 20;
/** Frames the sheet's text takes to give way before the check opens out over it. */
const QUIET_FRAMES = 3;
const IRIS_FRAMES = 12;
/** Frames into the iris the tick shrinks away over. */
const TICK_OUT = [5, 9];
const PAID_CLAIM = IRIS + IRIS_FRAMES + 1;
/** How much closer the claim comes on the yellow, until the cut. */
const PAID_PUSH = 0.06;
/** Every tap on the phone, in order, for the sound. */
export const TAPS = [COMPOSE, ...CHOICES, ADD, DESSERT, CART, PAY];

const TIME = phone.order.at;
/** How close the camera comes on a tapped row, on the add button, on the payment's check. */
const PUSH = { row: 1.8, add: 1.5, paid: 1.4 };

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
  const side = pick(
    pose({ x: 360, y: -10, rotateX: 6, rotateY: -18, rotateZ: 2.5 }),
    pose({ y: 300, rotateX: 8, rotateY: -10, rotateZ: 2 }),
  );
  const center = pick(
    pose({ y: 0, rotateX: 4, rotateY: -6, scale: 1 }),
    pose({ y: 110, rotateX: 4, rotateY: -4, scale: 1.08 }),
  );
  const close = { rotateX: 3, rotateY: -4 };
  const closeTarget = pick({ x: 0, y: 0 }, { x: 0, y: 120 });
  // The add button sits at the sheet's foot: low in the frame, the phone fills it.
  const addTarget = pick({ x: 0, y: 330 }, { x: 0, y: 520 });
  const addTap = middle(composer.addTap);
  // Centered: the sheet is read alone, then its check opens out from the frame's middle.
  const paidAt = pick({ x: 0, y: 0 }, { x: 0, y: 330 });
  const onPaid = (push: number) => onPage(phone.viewport.width / 2, PAYMENT_CHECK, paidAt, push, { rotateX: 4, rotateY: pick(-10, -5) });
  const iris = interpolate(frame - at(IRIS), [0, IRIS_FRAMES], [0, 1], { easing: Easing.in(Easing.exp), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const disc = mix(CHECK_RADIUS * screenScale(DEVICES.phone, size) * PUSH.paid, Math.hypot(width / 2 + Math.abs(paidAt.x), height / 2 + Math.abs(paidAt.y)), iris);
  // The tick rides its disc, then shrinks away over a few frames before the yellow is full.
  const tickSize = ((disc * CHECK.box) / CHECK.disc) * interpolate(frame - at(IRIS), TICK_OUT, [1, 0], { easing: Easing.in(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const phonePose = useTrack<Pose>([
    // Out of the QR code: the screen fills the frame, then the phone pulls back.
    { at: 0, value: pose({ scale: 2.8 }) },
    { at: 2, value: side, config: springs.heavy },
    // The first choice is tapped with the phone aside, under the headline; the camera comes in from the second.
    ...CHOICES.slice(1).map(
      (_, i): Key<Pose> => ({
        at: at(CHOICES[i] + 6),
        value: onPage(phone.viewport.width / 2, choiceTap(i + 1).y, closeTarget, PUSH.row, close),
        config: springs.push,
      }),
    ),
    { at: at(CHOICES[CHOICES.length - 1]) + 6, value: onPage(addTap.x, addTap.y, addTarget, PUSH.add, close), config: springs.push },
    { at: at(TO_DESSERT) - 6, value: center, config: springs.push },
    { at: at(DESSERT), value: side, config: springs.heavy },
    // Through the music's stop, the phone keeps drifting closer.
    { at: at(DESSERT) + 10, value: pose({ ...side, scale: HOLD_DRIFT }), duration: CART - DESSERT - 10 },
    { at: at(PAY) + 8, value: onPaid(PUSH.paid), config: springs.heavy },
    { at: at(PAID), value: onPaid(PUSH.paid * HOLD_DRIFT), duration: SLAM - PAID },
  ]);

  const headlineOut = interpolate(frame - at(HEADLINE_OUT), [0, HEADLINE_EXIT], [0, 1], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
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
  ) : !after(TO_DESSERT) ? (
    <Page src={added.duo} />
  ) : !after(DESSERT + 3) ? (
    <Flick from={added.duo} to={added.dessert.src} t={since(TO_DESSERT, springs.smooth, 10)} />
  ) : (
    <Page src={added.src} />
  );

  const text = {
    fontFamily: fonts.poppins,
    fontWeight: 800,
    fontSize: pick(STATEMENT.landscape, STATEMENT.portrait),
    lineHeight: 1.04,
    letterSpacing: "-0.025em",
    color: ocp.white,
    textAlign: portrait ? "center" : "left",
  } as const;
  const lines = { display: "flex", flexDirection: "column", alignItems: portrait ? "center" : "flex-start" } as const;
  const words = { display: "flex", gap: "0.25em", justifyContent: portrait ? "center" : "flex-start" } as const;

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          alignItems: portrait ? "center" : "flex-start",
          justifyContent: portrait ? "flex-start" : "center",
          padding: pick("0 0 0 170px", "190px 0 0"),
        }}
      >
        <div style={{ display: "grid" }}>
          <div style={{ gridArea: "1 / 1", ...lines, gap: 34, opacity: 1 - headlineOut, translate: `0 ${-24 * headlineOut}px` }}>
            <Kicker delay={at(ENTER + 10)}>Commande sur mobile</Kicker>
            <Reveal fade delay={at(ENTER + 12)} stagger={2} style={{ ...text, ...lines }}>
              {[
                "Commandez",
                <span style={words}>
                  depuis <Highlight delay={at(ENTER + 22)}>la file.</Highlight>
                </span>,
              ]}
            </Reveal>
          </div>
          <div style={{ gridArea: "1 / 1", alignSelf: "center", ...text }}>
            {/* Once the phone has moved aside, clear of the line. */}
            <Reveal fade delay={at(DESSERT) + 10} exitAt={at(PAY)}>
              Rien d’oublié.
            </Reveal>
          </div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Device model={DEVICES.phone} size={size} pose={phonePose} float={8}>
          <PhoneScreen time={TIME}>
            {page}
            {after(ADD + 3) && <UnderBar bar={added.cartTap} />}
            {/* A tap that opens a sheet stays under it. */}
            <Tap {...middle(menu.composerTap)} at={at(COMPOSE)} />
            <Tap {...middle(added.dessert.tap)} at={at(DESSERT)} />
            <Added {...middle(added.dessert.tap)} width={added.dessert.tap.width} at={at(DESSERT) + 2} label={`+${added.dessert.price}`} />
            <Tap {...middle(added.cartTap)} at={at(CART)} />
            {composerOpen > 0.001 && <ComposerSheet index={chosen} scroll={bodyScroll} open={composerOpen} />}
            {CHOICES.map((tap, k) => (
              <Tap key={tap} {...choiceTap(k)} at={at(tap)} />
            ))}
            <Tap {...addTap} at={at(ADD)} />
            {after(CART + 4) && <SheetImage src={phone.cart.src} top={phone.cart.sheetTop} open={since(CART + 4, springs.smooth, 12)} />}
            <Tap {...middle(phone.cart.payTap)} at={at(PAY)} />
            {after(PAY + 4) && (
              <PaymentSheet
                open={since(PAY + 4, springs.smooth, 12)}
                done={since(PAID, springs.snappy)}
                quiet={interpolate(frame - at(IRIS) + QUIET_FRAMES, [0, QUIET_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
              />
            )}
          </PhoneScreen>
        </Device>
      </AbsoluteFill>

      {after(IRIS) && (
        <AbsoluteFill style={{ background: ocp.yellow, clipPath: `circle(${disc}px at ${width / 2 + paidAt.x}px ${height / 2 + paidAt.y}px)` }}>
          {/* The tick opens out with its disc, then gives way to the claim, which rises in once the yellow is full. */}
          <svg
            width={tickSize}
            height={tickSize}
            viewBox={`0 0 ${CHECK.box} ${CHECK.box}`}
            style={{ position: "absolute", left: width / 2 + paidAt.x - tickSize / 2, top: height / 2 + paidAt.y - tickSize / 2 }}
          >
            <path d={CHECK.tick} fill="none" stroke={ocp.black} strokeWidth={CHECK.stroke} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", scale: String(1 + PAID_PUSH * interpolate(frame - at(PAID_CLAIM), [0, SLAM - PAID_CLAIM], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) }}>
        <Reveal
          delay={at(PAID_CLAIM)}
          stagger={2}
          style={{ ...text, ...lines, alignItems: "center", textAlign: "center", fontSize: pick(CLAIM.landscape, CLAIM.portrait), lineHeight: 1.12, letterSpacing: "-0.035em", color: ocp.black }}
        >
          {["Payé", "depuis la file."]}
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

/** The dessert's price, sliding out of its button as it joins the order: what the order gained. */
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
        background: ocp.yellow,
        color: ocp.black,
        fontFamily: fonts.poppins,
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

/** Under the floating order bar, the page's own black: the menu scrolled behind it does not show below it. */
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
        boxShadow: `0 0 0 ${bar.height}px ${ocp.black}`,
      }}
    />
  </div>
);
