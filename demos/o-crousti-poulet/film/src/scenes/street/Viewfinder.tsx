import { AbsoluteFill, interpolateColors } from "remotion";
import { fonts } from "../../brand/fonts";
import { ocp } from "../../brand/tokens";
import { DEVICES } from "../../kit/Device";
import { QR, STICKER, Sticker, Swirls } from "./world";

const { width: W, height: H } = DEVICES.phone.viewport;
const ZOOM = 1.2;
const CORNER = 38;
const FLASH = 0.7;

/** The phone's camera on the window: the sticker, framing brackets, and the detected link. */
export const Viewfinder = ({ scanned }: { scanned: number }) => {
  const stickerTop = H * 0.47 - (STICKER.h * ZOOM) / 2;
  const qr = {
    left: W / 2 - (QR.size * ZOOM) / 2,
    top: stickerTop + QR.top * ZOOM,
    size: QR.size * ZOOM,
  };
  const inset = 26 - scanned * 18;
  const color = interpolateColors(scanned, [0, 1], ["#FFFFFF", ocp.yellow]);
  const corners = [
    [0, 0, 0],
    [1, 0, 90],
    [1, 1, 180],
    [0, 1, 270],
  ] as const;
  return (
    <AbsoluteFill style={{ background: "#F6F4EE" }}>
      <div style={{ position: "absolute", inset: -40, filter: "blur(1.5px)", scale: "1.4" }}>
        <Swirls width={W + 80} height={H + 80} id="viewfinder-film" />
      </div>
      <div style={{ position: "absolute", left: (W - STICKER.w * ZOOM) / 2, top: stickerTop }}>
        <Sticker scale={ZOOM} />
      </div>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgb(0 0 0 / 0.35))" }} />
      {corners.map(([cx, cy, rotation]) => (
        <svg
          key={rotation}
          width={CORNER}
          height={CORNER}
          viewBox="0 0 38 38"
          style={{
            position: "absolute",
            left: qr.left - inset + cx * (qr.size + inset * 2) - (cx ? CORNER : 0),
            top: qr.top - inset + cy * (qr.size + inset * 2) - (cy ? CORNER : 0),
            rotate: `${rotation}deg`,
            filter: "drop-shadow(0 1px 3px rgb(0 0 0 / 0.4))",
          }}
        >
          <path d="M4 34 V12 a8 8 0 0 1 8 -8 H34" fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" />
        </svg>
      ))}
      {/* The capture's flash, on the screen itself. */}
      <AbsoluteFill style={{ background: "#fff", opacity: scanned > 0.001 ? FLASH * (1 - Math.min(1, scanned * 1.4)) : 0 }} />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: H - 190,
          translate: `-50% ${(1 - scanned) * 30}px`,
          opacity: scanned,
          padding: "13px 22px",
          borderRadius: 999,
          background: ocp.yellow,
          color: ocp.black,
          fontFamily: fonts.poppins,
          fontWeight: 700,
          fontSize: 15,
          whiteSpace: "nowrap",
          boxShadow: "0 10px 30px rgb(0 0 0 / 0.35)",
        }}
      >
        O’Crousti Poulet · Voir la carte →
      </div>
    </AbsoluteFill>
  );
};
