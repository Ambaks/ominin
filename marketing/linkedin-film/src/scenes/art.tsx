import QRCode from "qrcode";

const qr = QRCode.create("https://ominin.com", { errorCorrectionLevel: "M" });
const QR_SIZE = qr.modules.size;
const QR_PATH = Array.from({ length: QR_SIZE * QR_SIZE }, (_, i) =>
  qr.modules.data[i] ? `M${i % QR_SIZE} ${Math.floor(i / QR_SIZE)}h1v1h-1z` : "",
).join("");

export const Qr = ({ size, color = "#1A1512" }: { size: number; color?: string }) => (
  <svg viewBox={`-2 -2 ${QR_SIZE + 4} ${QR_SIZE + 4}`} width={size} height={size} style={{ display: "block", background: "#fff", borderRadius: size * 0.05 }}>
    <path d={QR_PATH} fill={color} shapeRendering="crispEdges" />
  </svg>
);

export type Food = "burger" | "fries" | "cookie" | "drink";

/** Flat food pictograms on a warm tile, for the menu's dish rows. */
export const FoodTile = ({ kind, size }: { kind: Food; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ flexShrink: 0, borderRadius: size * 0.22, background: TILE[kind] }}>
    {kind === "burger" && (
      <>
        <path d="M14 30c0-9 8-15 18-15s18 6 18 15z" fill="#E9A54B" />
        <rect x="12" y="31" width="40" height="4" rx="2" fill="#F2C94C" />
        <rect x="13" y="35" width="38" height="7" rx="3.5" fill="#6B3A22" />
        <path d="M14 43h36v3a5 5 0 0 1-5 5H19a5 5 0 0 1-5-5z" fill="#E09A45" />
        <circle cx="26" cy="22" r="1.2" fill="#FCE7B8" />
        <circle cx="34" cy="20" r="1.2" fill="#FCE7B8" />
        <circle cx="39" cy="24" r="1.2" fill="#FCE7B8" />
      </>
    )}
    {kind === "fries" && (
      <>
        {[22, 27, 32, 37, 42].map((x, i) => (
          <rect key={x} x={x - 2} y={12 + (i % 2) * 4} width="4.5" height="24" rx="2" fill="#F6C453" />
        ))}
        <path d="M17 30h30l-4 22H21z" fill="#D9473A" />
        <path d="M24 38h16" stroke="#F6E7D8" strokeWidth="2.4" strokeLinecap="round" />
      </>
    )}
    {kind === "cookie" && (
      <>
        <circle cx="32" cy="33" r="17" fill="#C98A4B" />
        {[
          [25, 27],
          [37, 26],
          [31, 36],
          [40, 38],
          [24, 39],
        ].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r="2.6" fill="#5B341E" />
        ))}
      </>
    )}
    {kind === "drink" && (
      <>
        <path d="M21 18h22l-3 32a3 3 0 0 1-3 3H27a3 3 0 0 1-3-3z" fill="#F7E9A6" />
        <path d="M22.5 28h19l-2 22H24.5z" fill="#F2D35B" />
        <circle cx="40" cy="20" r="6" fill="#B9D86A" stroke="#8DB43F" strokeWidth="1.5" />
        <path d="M30 18l6-8" stroke="#E2764B" strokeWidth="2.4" strokeLinecap="round" />
      </>
    )}
  </svg>
);

const TILE: Record<Food, string> = { burger: "#FBE6CF", fries: "#FCE3D6", cookie: "#F4E3CF", drink: "#EEF2D5" };
