import QRCode from "qrcode";

/**
 * QR code vectoriel, calculé au rendu serveur : un seul chemin SVG, net à
 * toute taille et léger dans le PDF. La marge (zone calme) est à la charge
 * du fond qui l'entoure.
 */
export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
  const { size } = modules;
  let d = "";
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (modules.get(row, col)) d += `M${col} ${row}h1v1h-1z`;
    }
  }
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <path d={d} fill="currentColor" />
    </svg>
  );
}
