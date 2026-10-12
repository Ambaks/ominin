import type { CSSProperties } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { fonts } from "../brand/fonts";
import { Logo, OmininMark } from "../brand/marks";
import { bk, ominin } from "../brand/tokens";
import { Stage } from "../kit/atmosphere";
import { useLayout } from "../kit/layout";
import { CLAMP, springs, useSpring } from "../kit/motion";
import { beat } from "../timeline";
import { MENU_URL, Qr, QR_MODULES } from "./room/Cachet";

/**
 * Scene 16: Baï-Kō × Ominin, then their carte to try — its line, the code of
 * table 7's Cachet, its address and ours, each on a hit of the music's last
 * bars — centered as one block.
 */
export const END_CARD = beat(87);
export const LAST_HIT = beat(95);
const SETTLE_FRAMES = 8;
/** On the track's last hit the lockup answers it, a small punch: the film's loudest sound landed on a still frame. */
const HIT_PUNCH = 0.05;
/** Frames after the hit the × between the marks draws on. */
const CROSS_AT = 9;
/** The carte to try, piece by piece, on the hits after the marks'. */
const CONTACT = { line: beat(88), code: beat(91), address: beat(92), ours: beat(93) };
/** Ominin's mark, a little under Baï-Kō's: the restaurant leads. */
const OMININ = { landscape: 96, portrait: 104 };
/** The address under the marks: the gap to them, in px. */
const CONTACT_GAP = 150;
/** The demo's code beside (below, in the tall frame) its address: the code's side and its plate's corner radius, in px. */
const CODE = { landscape: 196, portrait: 280, radius: 16 };
/** The white margin the QR spec asks around a code, in modules: phones read it on the black end card. */
const QUIET_ZONE = 4;
/** The demo's address as it reads: no scheme, no table. */
const DEMO = new URL(MENU_URL);
const DEMO_LABEL = `${DEMO.host}${DEMO.pathname}`;

export const EndCard = ({ from }: { from: number }) => {
  const { width, height, portrait, pick } = useLayout();
  const frame = useCurrentFrame();
  // Both marks cut in whole on the scene's first hit, settling from a touch large; the × follows.
  const hit = useSpring(LAST_HIT - from, springs.snappy);
  const punch = 1 + HIT_PUNCH * Math.sin(Math.min(1, hit) * Math.PI);
  const land = { scale: String(interpolate(frame, [0, SETTLE_FRAMES], [1.04, 1], { ...CLAMP, easing: Easing.out(Easing.exp) }) * punch) };
  const cross = useSpring(CROSS_AT, springs.snappy);
  const rise = (t: number) => ({ opacity: t, translate: `0 ${(1 - t) * 18}px` });
  const line = rise(useSpring(CONTACT.line - from, springs.smooth, 10));
  const address = rise(useSpring(CONTACT.address - from, springs.smooth, 10));
  const ours = rise(useSpring(CONTACT.ours - from, springs.smooth, 10));
  const code = useSpring(CONTACT.code - from, springs.snappy);
  const codeIn = { opacity: Math.min(1, code * 1.5), scale: String(0.85 + code * 0.15) };
  const crossSize = pick(40, 46);
  const lockup = pick(200, 210);

  return (
    <Stage grid={{ x: width / 2, y: height * pick(0.5, 0.42), radius: Math.max(width, height) * 0.75, opacity: 0.04 }}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: portrait ? "1fr" : "auto auto auto",
            justifyContent: "center",
            gridTemplateRows: portrait ? "auto auto auto" : "1fr",
            alignItems: "center",
            justifyItems: portrait ? "center" : undefined,
            gap: pick(110, 120),
          }}
        >
          <div style={{ ...land, justifySelf: portrait ? "center" : "end" }}>
            <Logo size={lockup} glow={1} />
          </div>
          <svg
            width={crossSize}
            height={crossSize}
            viewBox="0 0 10 10"
            style={{ opacity: cross * 0.6, rotate: `${(1 - cross) * -90}deg`, flexShrink: 0 }}
          >
            <path d="M1 1 9 9M9 1 1 9" stroke={bk.white} strokeWidth="0.7" strokeLinecap="round" />
          </svg>
          <div style={{ ...land, justifySelf: portrait ? "center" : "start" }}>
            <OmininMark size={pick(OMININ.landscape, OMININ.portrait)} />
          </div>
        </div>
        {/* What the film asks of the owner: their carte, to try, at its address or by its code; then where we are. */}
        <div
          style={{
            marginTop: CONTACT_GAP,
            display: "flex",
            flexDirection: portrait ? "column" : "row",
            alignItems: "center",
            gap: pick(48, 36),
            fontFamily: fonts.sans,
            color: bk.white,
          }}
        >
          {!portrait && <Code size={CODE.landscape} style={codeIn} />}
          <div style={{ display: "flex", flexDirection: "column", alignItems: portrait ? "center" : "flex-start", gap: pick(14, 26), textAlign: portrait ? "center" : "left" }}>
            <div style={{ fontWeight: 700, fontSize: pick(44, 48), ...line }}>
              {"Votre carte est "}
              <span style={{ color: bk.pink }}>prête à tester</span>
              {"."}
            </div>
            {portrait && <Code size={CODE.portrait} style={codeIn} />}
            <div style={{ fontWeight: 700, fontSize: pick(46, 48), letterSpacing: "0.02em", ...address }}>{DEMO_LABEL}</div>
            <div style={{ fontWeight: 600, fontSize: pick(30, 34), letterSpacing: "0.03em", color: bk.muted, ...ours }}>{ominin.url.replace(/^https?:\/\//, "")}</div>
          </div>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

/** Table 7's code, on its white plate: it opens the demo carte. */
const Code = ({ size, style }: { size: number; style: CSSProperties }) => (
  <div style={{ padding: (size / QR_MODULES) * QUIET_ZONE, borderRadius: CODE.radius, background: "#fff", flexShrink: 0, ...style }}>
    <Qr size={size} />
  </div>
);
