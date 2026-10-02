import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { phone } from "../captures";
import { fonts } from "../brand/fonts";
import { ocp } from "../brand/tokens";
import { Stage } from "../kit/atmosphere";
import { aim, Device, DEVICES, pose, screenScale, type Pose } from "../kit/Device";
import { useLayout } from "../kit/layout";
import { HOLD_DRIFT, mix, springs, useTrack } from "../kit/motion";
import { Counter, Reveal } from "../kit/type";
import { beat } from "../timeline";
import { KITCHEN } from "./Kitchen";
import { onScreen, PhoneScreen, SheetShot } from "./phone/screens";
import { ClockChip, STATEMENT } from "./styles";

/*
 * Scene 8: the number slams on the bass hit, shrinks into the real ticket's
 * own number, then the camera moves down to the ready time — about 6
 * minutes, around 12:41 — while a time-lapse runs the clock on, 6, 5, 4,
 * before the phone steps aside for the claim.
 */
export const SLAM = beat(24);
/**
 * From MORPH to TO_ETA the slammed number shrinks to the ticket's size.
 * Once it is LOCK times that size, the phone takes over, held so that its
 * own « N° 39 » is exactly where the slammed one was, and keeps pulling
 * back while the ticket opens out around the number.
 */
const MORPH = beat(26);
const TO_ETA = beat(27);
const LOCK = 1.7;
/** The slammed number's size on its first frame, relative to where it settles. */
const SLAM_FROM = 1.12;
const REVEAL_FRAMES = 10;
const BODY_FRAMES = 10;
/** Beats of the time-lapse: each one moves the clock a minute on, the last under the AI line. */
export const LAPSE = [beat(28), beat(29), beat(34)];
const CLAIM = beat(30);
const AI = beat(32);
/** The clock chip leaves before the kitchen, which gets the order at 12:35. */
const CHIP_OUT = beat(35);
const ORDER_MINUTE = 35;
const ETA_MINUTES = [6, 5, 4, 3] as const;

const PHONE_SIZE = 1300;
/**
 * The ticket's « N° » beside its digits, in its own px (order-ticket.tsx:
 * Poppins medium, text-2xl with its 2rem line, mt-3, gap-1.5): the slammed
 * one is set the same, relative to the digits, so the two coincide.
 */
const PREFIX = { size: 24, line: 32, top: 12, gap: 6, weight: 500 };
/** The ticket's number box on screen, as a share of the digits' height: N° and digits, with a margin. */
const NUMBER_FRAME = { width: 2.3, height: 1.5, radius: 0.18 };
/** Room kept above the digits for the ticket's « VOTRE NUMÉRO » label, in page px. */
const LABEL_ROOM = 34;
/** Beside the claim, the phone this much smaller, the label's top this far below the frame's top: nothing cut through. */
const ASIDE = { scale: 0.85, top: 130 };

const { viewport } = DEVICES.phone;
const { etaBox, numberBox, sheetTop, eta } = phone.ticket;
/** The ticket from its number's label to the ready time's foot, in screen px of the page. */
const ticketSpan = { top: onScreen(numberBox.y) - LABEL_ROOM, bottom: onScreen(etaBox.y + etaBox.height) };
const numberCenter = { x: numberBox.x + numberBox.width / 2, y: onScreen(numberBox.y + numberBox.height / 2) };
const onNumber = (push: number) => pose(aim(DEVICES.phone, PHONE_SIZE, numberCenter, undefined, push));

export const NumberEta = ({ from }: { from: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height, portrait, pick } = useLayout();
  const at = (abs: number) => abs - from;
  const since = (abs: number, config = springs.smooth, duration?: number) =>
    spring({ frame: frame - at(abs), fps, config, durationInFrames: duration });

  const slam = since(SLAM, springs.snappy);
  const shake = Math.exp(-Math.max(0, frame - at(SLAM)) / 5) * Math.sin(frame * 2.6) * 10;
  // The number's height on screen, from slammed to the ticket's own, in one ease.
  const digits = numberBox.height * screenScale(DEVICES.phone, PHONE_SIZE);
  const number = pick(560, 520);
  const shownAt = (f: number) =>
    mix(number, digits, interpolate(f - at(MORPH), [0, TO_ETA - MORPH], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) }));
  const shown = shownAt(frame);
  // The first frame the phone holds the number.
  let lockedAt = at(MORPH);
  while (shownAt(lockedAt) > digits * LOCK) lockedAt++;
  const locked = frame >= lockedAt;
  const reveal = interpolate(frame - lockedAt, [0, REVEAL_FRAMES], [0, 1], { ...clamp, easing: Easing.out(Easing.poly(5)) });
  // The phone's body comes in around its screen; the slammed number stays over the ticket's until it has.
  const bodyIn = interpolate(frame - lockedAt, [0, BODY_FRAMES], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const handedOver = frame >= lockedAt + BODY_FRAMES;
  const rays = 1 - interpolate(frame - lockedAt, [-4, 5], [0, 1], clamp);
  const minutesGone = LAPSE.filter((abs) => frame >= at(abs)).length;

  // The number and the ready time framed together at the center; in
  // portrait low enough that the phone clears the time-lapse clock.
  const onEta = (push: number, tilt: Partial<Pose>) =>
    pose({ ...aim(DEVICES.phone, PHONE_SIZE, { x: viewport.width / 2, y: (ticketSpan.top + ticketSpan.bottom) / 2 }, { x: 0, y: pick(0, 480) }, push), ...tilt });
  // Right of the big clock in 16:9.
  const eta1 = pose({ ...onEta(1, { rotateX: 6, rotateY: -6, rotateZ: 1 }), x: pick(300, 0) });
  // Far enough back that the ticket's label stays whole, well inside the frame.
  const aside = pick(
    pose({ ...aim(DEVICES.phone, PHONE_SIZE, { x: viewport.width / 2, y: ticketSpan.top }, { x: 470, y: ASIDE.top - height / 2 }, ASIDE.scale), rotateX: 6, rotateY: -16, rotateZ: 3 }),
    pose({ ...eta1, y: eta1.y + 420, rotateX: 8, rotateY: -8, rotateZ: 2, scale: 0.9 }),
  );
  const tracked = useTrack<Pose>([
    { at: 0, value: onNumber(1) },
    { at: at(TO_ETA), value: eta1, config: springs.heavy },
    { at: at(LAPSE[0]), value: pose({ ...onEta(1.12, { rotateX: 5, rotateY: -5, rotateZ: 1 }), x: eta1.x }), duration: 30 },
    { at: at(CLAIM) - 8, value: aside, config: springs.heavy },
    { at: at(AI), value: { ...aside, scale: aside.scale * HOLD_DRIFT }, duration: KITCHEN - AI },
  ]);

  // Until TO_ETA the phone follows the number's height; then its moves take over.
  const phonePose = frame < at(TO_ETA) ? onNumber(shown / digits) : tracked;
  // Whole from its first frame, a touch large, settling on the hit.
  const numberScale = frame < at(MORPH) ? SLAM_FROM - (SLAM_FROM - 1) * slam : shown / number;
  const prefix = (px: number) => (px / numberBox.height) * number;
  // On the phone's screen, the ticket opens out from the number's box.
  const box = { width: NUMBER_FRAME.width * numberBox.height, height: NUMBER_FRAME.height * numberBox.height };
  const inset = {
    top: (numberCenter.y - box.height / 2) * (1 - reveal),
    bottom: (viewport.height - numberCenter.y - box.height / 2) * (1 - reveal),
    left: (numberCenter.x - box.width / 2) * (1 - reveal),
    right: (viewport.width - numberCenter.x - box.width / 2) * (1 - reveal),
  };

  const text = {
    fontFamily: fonts.poppins,
    fontWeight: 800,
    fontSize: pick(STATEMENT.landscape, STATEMENT.portrait),
    lineHeight: 1.06,
    letterSpacing: "-0.025em",
    color: ocp.white,
    textAlign: portrait ? "center" : "left",
  } as const;

  return (
    <Stage rays={{ x: width / 2, y: pick(height * 0.5, height * 0.4), radius: Math.max(width, height) * 0.8 }} light={rays}>
      {locked && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: bodyIn }}>
          <Device model={DEVICES.phone} size={PHONE_SIZE} pose={phonePose} float={5 * since(TO_ETA)}>
            <AbsoluteFill
              style={{
                clipPath: `inset(${inset.top}px ${inset.right}px ${inset.bottom}px ${inset.left}px round ${NUMBER_FRAME.radius * numberBox.height * (1 - reveal)}px)`,
              }}
            >
              <PhoneScreen time={`12:${ORDER_MINUTE + minutesGone}`}>
                <SheetShot src={eta[ETA_MINUTES[minutesGone]]} top={sheetTop} />
              </PhoneScreen>
            </AbsoluteFill>
          </Device>
        </AbsoluteFill>
      )}

      {!handedOver && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", translate: `${shake}px ${shake * 0.4}px` }}>
          <div
            style={{
              position: "relative",
              scale: String(numberScale),

            }}
          >
            {/* Over the phone, the ticket's own number stays hidden under this one until the hand-over: one swap, no double image. */}
            {locked && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: NUMBER_FRAME.width * number,
                  height: NUMBER_FRAME.height * number,
                  translate: "-50% -50%",
                  borderRadius: NUMBER_FRAME.radius * number,
                  background: ocp.black,
                }}
              />
            )}
            <span
              style={{
                position: "absolute",
                right: "100%",
                marginRight: prefix(PREFIX.gap),
                top: prefix(PREFIX.top),
                fontFamily: fonts.poppins,
                fontWeight: PREFIX.weight,
                fontSize: prefix(PREFIX.size),
                lineHeight: `${prefix(PREFIX.line)}px`,
                color: ocp.muted,
              }}
            >
              N°
            </span>
            <span
              style={{
                position: "relative",
                display: "block",
                // Set like the ticket's digits (semibold, tight), so the two match.
                fontFamily: fonts.anton,
                fontWeight: 600,
                letterSpacing: "-0.025em",
                fontSize: number,
                lineHeight: 1,
                color: ocp.yellow,
              }}
            >
              {phone.orderNumber}
            </span>
          </div>
        </AbsoluteFill>
      )}

      <AbsoluteFill
        style={{
          alignItems: portrait ? "center" : "flex-start",
          justifyContent: portrait ? "flex-start" : "center",
          padding: pick("0 0 0 170px", "200px 60px 0"),
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: portrait ? "center" : "flex-start", gap: pick(40, 34), maxWidth: pick(860, 960) }}>
          <TimeLapse from={from} />
          <Reveal fade delay={at(CLAIM)} stagger={2} style={text}>
            {["Il sait exactement", <span style={{ color: ocp.yellow }}>quand c’est prêt.</span>]}
          </Reveal>
          <Reveal fade delay={at(AI)}>
            <div
              style={{
                maxWidth: pick(700, 860),
                fontFamily: fonts.poppins,
                fontWeight: 500,
                fontSize: pick(36, 38),
                lineHeight: 1.35,
                color: ocp.white,
                textAlign: portrait ? "center" : "left",
              }}
            >
              <b style={{ fontWeight: 700 }}>Estimation par IA&nbsp;:</b> elle apprend le rythme de chaque cuisine.
            </div>
          </Reveal>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * The time-lapse clock: big like the opening's, one minute per beat, then
 * shrunk into a chip above the claim.
 */
const TimeLapse = ({ from }: { from: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { pick } = useLayout();
  const at = (abs: number) => abs - from;
  const passed = LAPSE.filter((abs) => frame >= at(abs));
  const minute = ORDER_MINUTE + passed.length;
  const lapse = passed.at(-1);
  const appear = spring({ frame: frame - at(TO_ETA + 8), fps, config: springs.snappy });
  const shrink = spring({ frame: frame - at(CLAIM) + 8, fps, config: springs.smooth, durationInFrames: 12 });
  const leave = spring({ frame: frame - at(CHIP_OUT), fps, config: springs.smooth, durationInFrames: 10 });
  const pulse = lapse === undefined ? 0 : interpolate(frame - at(lapse), [0, 3, 12], [0, 1, 0], { extrapolateRight: "clamp" });
  const size = mix(pick(170, 120), pick(40, 44), shrink);
  return (
    <div style={{ opacity: appear * (1 - leave), scale: String(0.8 + appear * 0.2) }}>
      <ClockChip size={size} pill={shrink} glow={pulse}>
        12:
        {lapse === undefined ? minute : <Counter key={lapse} from={minute - 1} to={minute} delay={at(lapse)} duration={8} />}
      </ClockChip>
    </div>
  );
};

