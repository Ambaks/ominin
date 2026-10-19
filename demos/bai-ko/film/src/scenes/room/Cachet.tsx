import QRCode from "qrcode";
import { AbsoluteFill, Img, interpolateColors, staticFile } from "remotion";
import { phone } from "../../captures";
import { fonts } from "../../brand/fonts";
import { bk, PINK_RGB } from "../../brand/tokens";
import { DEVICES } from "../../kit/Device";

/** What the table's code opens: the demo carte at this table (menuSiteUrl in frontend/lib/site.ts). */
export const MENU_URL = `https://menu.ominin.com/demo/bai-ko?table=${phone.table}`;
const MODULES = QRCode.create(MENU_URL, { errorCorrectionLevel: "M" }).modules;
/** The code's side, in modules. */
export const QR_MODULES = MODULES.size;

/** The Cachet, Ominin's table card, at Baï-Kō's colours: its size, the code's size and its top. */
export const CACHET = { w: 340, h: 480, qr: 236, qrTop: 132, pad: 18 };
/** The centre of the code's top-left eye, in Cachet px: the camera flies into it. */
export const QR_EYE = {
  x: (CACHET.w - CACHET.qr) / 2 + (3.5 * CACHET.qr) / MODULES.size,
  y: CACHET.qrTop + (3.5 * CACHET.qr) / MODULES.size,
};

/** The code, drawn module by module: dark on its white plate. */
export const Qr = ({ size }: { size: number }) => {
  const n = MODULES.size;
  const cells: string[] = [];
  for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) if (MODULES.get(row, col)) cells.push(`M${col} ${row}h1v1h-1z`);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" style={{ display: "block" }}>
      <path d={cells.join("")} fill={bk.black} />
    </svg>
  );
};

/** The table's Cachet: the logo, the code on a white plate, the table's number, the three verbs. */
export const Cachet = ({ scale = 1 }: { scale?: number }) => {
  const s = scale;
  return (
    <div
      style={{
        position: "relative",
        width: CACHET.w * s,
        height: CACHET.h * s,
        borderRadius: 30 * s,
        background: "linear-gradient(165deg, #1A1A21, #0E0E12 60%)",
        boxShadow: `0 0 0 ${2 * s}px rgb(${PINK_RGB} / 0.7), 0 0 ${40 * s}px rgb(${PINK_RGB} / 0.35), 0 ${24 * s}px ${60 * s}px rgb(0 0 0 / 0.6)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Img src={staticFile("brand/logo.png")} style={{ marginTop: 26 * s, height: 78 * s, width: "auto" }} />
      <div
        style={{
          position: "absolute",
          left: (CACHET.w - CACHET.qr) / 2 * s - CACHET.pad * s,
          top: CACHET.qrTop * s - CACHET.pad * s,
          padding: CACHET.pad * s,
          borderRadius: 18 * s,
          background: "#fff",
        }}
      >
        <Qr size={CACHET.qr * s} />
      </div>
      <div
        style={{
          position: "absolute",
          top: (CACHET.qrTop + CACHET.qr + CACHET.pad + 16) * s,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4 * s,
        }}
      >
        <div style={{ fontFamily: fonts.display, fontSize: 46 * s, lineHeight: 1, letterSpacing: "0.04em", color: bk.white }}>
          Table <span style={{ color: bk.pink }}>{phone.table}</span>
        </div>
        <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 13 * s, letterSpacing: "0.22em", textTransform: "uppercase", color: bk.muted }}>
          Scannez · commandez · payez
        </div>
      </div>
    </div>
  );
};

const { width: W, height: H } = DEVICES.phone.viewport;
const ZOOM = 1.15;
const CORNER = 38;
const FLASH = 0.7;
/** The detected link: its type size and top edge, in screen px — two lines, read while the phone holds them out. */
const LINK = { size: 24, top: H - 190 };

/** The phone's camera on the table: the Cachet, framing brackets turning pink, and the detected link. */
export const Viewfinder = ({ scanned }: { scanned: number }) => {
  const cachetTop = H * 0.46 - (CACHET.h * ZOOM) / 2;
  const qr = { left: W / 2 - (CACHET.qr * ZOOM) / 2, top: cachetTop + CACHET.qrTop * ZOOM, size: CACHET.qr * ZOOM };
  const inset = 26 - scanned * 18;
  const color = interpolateColors(scanned, [0, 1], ["#FFFFFF", bk.pink]);
  const corners = [
    [0, 0, 0],
    [1, 0, 90],
    [1, 1, 180],
    [0, 1, 270],
  ] as const;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #2A1D2C, #0B0B0E 70%)" }}>
      <div style={{ position: "absolute", left: (W - CACHET.w * ZOOM) / 2, top: cachetTop, filter: "blur(0.6px)" }}>
        <Cachet scale={ZOOM} />
      </div>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgb(0 0 0 / 0.4))" }} />
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
      <AbsoluteFill style={{ background: "#fff", opacity: scanned > 0.001 ? FLASH * (1 - Math.min(1, scanned * 1.4)) : 0 }} />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: LINK.top,
          translate: `-50% ${(1 - scanned) * 30}px`,
          opacity: scanned,
          padding: `${LINK.size * 0.55}px ${LINK.size * 1.1}px`,
          borderRadius: LINK.size,
          background: bk.pink,
          color: bk.black,
          fontFamily: fonts.sans,
          fontWeight: 700,
          fontSize: LINK.size,
          lineHeight: 1.25,
          textAlign: "center",
          whiteSpace: "nowrap",
          boxShadow: "0 10px 30px rgb(0 0 0 / 0.35)",
        }}
      >
        <div>{`Baï-Kō · Table ${phone.table}`}</div>
        <div style={{ fontWeight: 600 }}>Voir la carte →</div>
      </div>
    </AbsoluteFill>
  );
};
