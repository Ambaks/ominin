import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { collect } from "../captures";
import { fonts } from "../brand/fonts";
import { bk, PINK_RGB } from "../brand/tokens";
import { Stage } from "../kit/atmosphere";
import { Device, DEVICES, pose } from "../kit/Device";
import { useLayout } from "../kit/layout";
import { CLAMP, springs, useSpring } from "../kit/motion";
import { onLabel, Tap } from "../kit/Tap";
import { Reveal } from "../kit/type";
import { beat } from "../timeline";
import { Page, PhoneScreen } from "./phone/screens";
import { Kicker, neon, statement, STATEMENT } from "./styles";

/**
 * Scene 13: the lunch takeaway. First their takeaway page itself (the
 * demo's customer phone, scripts/capture.mjs): the Pad Thaï Chicken, a
 * pickup slot, paid. Then the dish in Baï-Kō's photo, at the price of its
 * Uber Eats page (read on 2026-10-12), struck through, and at its carte's
 * own (bai-ko.com). Their student Bento Box, sold on their site, closes
 * it, alone on screen once the card has settled. One beat per step: the
 * offer's slams take the scene's last bars.
 */
export const TAKEAWAY = beat(56);
/** « Payer » tapped once the phone has landed; the confirmation follows as the touch lifts. */
export const TAKEAWAY_PAY = beat(58);
const PAID = TAKEAWAY_PAY + 4;
const LINE = beat(58);
/** The price card takes the phone's place. */
const CARD = beat(59);
const UBER = beat(60);
const STRIKE = beat(61);
export const OURS = beat(62);
const BOX = beat(63);
const PRICES = { dish: collect.dish, uber: "19,90 €", site: "14,90 €", read: "12/10/2026" };
/** In the tall frame, the card's width, its photo's height, and its foot above the frame's bottom, in px: wide, under the words. */
const TALL_CARD = { width: 820, photo: 600, bottom: 320 };
/** The phone: its length in px, and where it stands, in px from the frame's center — where the card comes. */
const PHONE = { size: { landscape: 960, portrait: 1300 }, at: { landscape: { x: 470, y: -40 }, portrait: { x: 0, y: 250 } } };

export const Takeaway = ({ from }: { from: number }) => {
  const frame = useCurrentFrame();
  const { portrait, pick } = useLayout();
  const at = (abs: number) => abs - from;
  const phoneIn = useSpring(at(TAKEAWAY), springs.heavy);
  const phoneOut = useSpring(at(CARD) - 4, springs.smooth, 10);
  const card = useSpring(at(CARD), springs.snappy);
  const uber = useSpring(at(UBER), springs.smooth);
  const strike = interpolate(frame - at(STRIKE), [0, 8], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
  const ours = useSpring(at(OURS), springs.snappy);
  const photo = { w: pick(560, TALL_CARD.width), h: pick(380, TALL_CARD.photo) };
  const stand = pick(PHONE.at.landscape, PHONE.at.portrait);
  // The capture is the demo's phone screen at the film phone's page proportions.
  const k = DEVICES.phone.viewport.width / collect.viewport.width;
  const payAt = onLabel(collect.payTap);
  const pay = { x: payAt.x * k, y: payAt.y * k };
  const row = (label: string, price: string, tone: string, struck: number, size: number) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 40 }}>
      <span style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: pick(30, 32), letterSpacing: "0.12em", textTransform: "uppercase", color: bk.muted }}>{label}</span>
      <span style={{ position: "relative", fontFamily: fonts.display, fontSize: size, lineHeight: 1, color: tone }}>
        {price}
        {struck > 0 && <span style={{ position: "absolute", left: -6, top: "48%", height: 6, width: `calc(${struck * 100}% + 12px)`, background: bk.pink, borderRadius: 3 }} />}
      </span>
    </div>
  );
  return (
    <Stage grid={{ x: pick(1300, 540), y: pick(500, 1100), radius: 1100 }}>
      <AbsoluteFill
        style={{
          alignItems: portrait ? "center" : "flex-start",
          justifyContent: portrait ? "flex-start" : "center",
          padding: pick("0 0 0 170px", "170px 60px 0"),
        }}
      >
        <Kicker delay={at(TAKEAWAY) + 2}>Et le midi, à emporter</Kicker>
        <Reveal
          fade
          delay={at(LINE)}
          stagger={3}
          style={{ ...statement, fontSize: pick(STATEMENT.landscape, STATEMENT.portrait), marginTop: 30, display: "flex", flexDirection: "column", alignItems: portrait ? "center" : "flex-start", textAlign: portrait ? "center" : "left" }}
        >
          {["Commandé d’avance,", <span style={neon}>à votre prix.</span>]}
        </Reveal>
        <Reveal fade delay={at(BOX)} style={{ marginTop: 28, fontFamily: fonts.sans, fontWeight: 600, fontSize: pick(36, 34), lineHeight: 1.35, color: bk.white, maxWidth: pick(820, 900), textWrap: "balance", textAlign: portrait ? "center" : "left" }}>
          Votre Bento Box étudiante aussi&nbsp;: commandée entre deux cours.
        </Reveal>
      </AbsoluteFill>
      {phoneOut < 0.999 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - phoneOut }}>
          <Device
            model={DEVICES.phone}
            size={pick(PHONE.size.landscape, PHONE.size.portrait)}
            pose={pose({ x: stand.x, y: stand.y + (1 - phoneIn) * 900 + phoneOut * 400, rotateX: 6, rotateY: pick(-14, -6), rotateZ: 2 })}
            float={6}
          >
            <PhoneScreen time={collect.at}>
              <Page src={frame < at(PAID) ? collect.checkout : collect.paid} />
              <Tap {...pay} at={at(TAKEAWAY_PAY)} />
            </PhoneScreen>
          </Device>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ alignItems: portrait ? "center" : "flex-end", justifyContent: portrait ? "flex-end" : "center", padding: pick("0 170px 0 0", `0 0 ${TALL_CARD.bottom}px`) }}>
        <div
          style={{
            width: photo.w,
            borderRadius: 32,
            overflow: "hidden",
            background: bk.surface,
            boxShadow: `0 0 0 2px rgb(${PINK_RGB} / 0.45), 0 30px 70px rgb(0 0 0 / 0.6)`,
            opacity: Math.min(1, card * 1.6),
            translate: `0 ${(1 - card) * 60}px`,
            rotate: `${(1 - card) * -4 - 1.5}deg`,
          }}
        >
          <Img src={staticFile("photos/room-pad-thai.jpg")} style={{ display: "block", width: "100%", height: photo.h, objectFit: "cover", objectPosition: "50% 62%" }} />
          <div style={{ padding: "26px 34px 32px", display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: pick(40, 42), color: bk.white }}>{PRICES.dish}</div>
            <div style={{ opacity: uber }}>{row("Uber Eats", PRICES.uber, bk.muted, strike, pick(72, 76))}</div>
            <div style={{ opacity: ours, translate: `0 ${(1 - ours) * 16}px` }}>{row("En direct", PRICES.site, bk.gold, 0, pick(96, 100))}</div>
          </div>
        </div>
        {/* When the Uber Eats price was read. */}
        <div style={{ marginTop: 22, width: photo.w, opacity: uber, fontFamily: fonts.sans, fontWeight: 600, fontSize: pick(24, 26), color: bk.muted, textAlign: "center" }}>
          {`Prix Uber Eats relevé le ${PRICES.read}`}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
