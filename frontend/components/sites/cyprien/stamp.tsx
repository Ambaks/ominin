/*
 * Le cachet de Cyprien redessiné en vecteur : le « C » aux grains est tracé
 * d’après leur logo, l’anneau est composé en Barlow Condensed (leur Miso n’a
 * pas d’équivalent libre). L’anneau peut tourner seul, le « C » reste droit.
 */
const C_MARK =
  "M54.2 1.8 51.5 2.1 46.8 4.2 43.8 6.4 42.1 8 40.6 10.1 39.2 13.5 38.9 16.1 39.1 22.4 39.9 25.1 40.2 25.6 41.6 25.8 45.1 24.5 48.5 22.8 50.8 21.1 52.6 19.2 54 17.2 55.4 13.6 55.9 10 55.6 6 54.9 2.6ZM48.2 -20.9 46.9 -21 43.6 -19.9 39.8 -17.9 38 -16.6 35.8 -14.4 34.5 -12.5 33.2 -9.5 32.8 -5.6 33.1 0.1 33.8 2.2 34.2 2.9 36.1 2.9 41.5 0.6 44.6 -1.5 46.5 -3.4 47.9 -5.4 48.8 -7.1 49.8 -11.8 49.6 -16.1 48.9 -19.9ZM42.1 -43.6 41 -43.8 38.2 -42.9 34.1 -40.9 31.2 -38.8 29.6 -37 28.4 -35.1 27.2 -32.5 26.8 -29.4 27 -22.9 27.4 -21.1 28.2 -19.8 29.1 -19.6 31.4 -20.2 35.8 -22.2 38.9 -24.5 41.6 -27.8 42.9 -30.5 43.6 -34 43.5 -38.9 42.8 -42.9ZM10 -74 3 -74.1 -1.1 -73.9 -7.1 -72.9 -14.4 -70.9 -20.2 -68.9 -27.4 -65.9 -33.6 -62.6 -39.5 -58.9 -44.6 -54.9 -50 -49.6 -53.2 -45.8 -56.9 -40.5 -58.9 -37 -61.9 -30.2 -63.9 -23.8 -65 -17.8 -65.6 -10.6 -65.6 -5.1 -64.9 3.9 -63.8 10.2 -61.9 18 -58.9 27.2 -54.9 36.4 -51.9 41.8 -48.9 46.2 -44 52.2 -40.5 55.8 -34.8 60.4 -29.6 63.6 -23.2 66.8 -17.6 68.8 -9 70.8 -1.1 71.5 5.6 71.5 14.2 70.8 20.8 69.6 28.5 67.8 36.8 64.8 40.8 62.8 45.8 59.6 49.9 56.4 53.5 52.9 56.5 49.4 59.6 44.9 61.9 40.8 63.2 37.2 63 36.4 62 36.4 58.4 37.4 57.5 38 54.9 43.1 50.9 48.8 46.1 53.6 40.6 57.8 36.4 60 31.4 61.9 26.4 63 19.5 63.4 14.5 62.9 7.9 60.8 4 58.8 -1.2 55 -5.8 50.6 -9 46.5 -12.8 40.6 -16 34.4 -19 27.5 -23.1 15.8 -25.9 6.1 -29 -7.4 -30 -13.1 -31.1 -23.6 -31.1 -33.5 -30 -41.5 -28.9 -45.4 -27 -50 -25 -53.6 -21.9 -57.9 -18.4 -61.4 -14.6 -64.1 -11 -66.1 -6.4 -68 -2 -69.1 2.5 -69.8 6.5 -69.9 13.6 -69 20.6 -66.9 25 -64.9 31 -61.1 32.5 -61.1 36.2 -62.2 36.5 -63.1 34 -65.2 30.1 -67.8 25.9 -69.9 17.4 -72.8Z";

/** Un grain du « C », pour les ornements. */
const GRAIN =
  "M7 -11.9 4.8 -11.8 2.4 -10.9 -1.5 -8.9 -3.2 -7.6 -5.5 -5.4 -6.7 -3.5 -8 -0.5 -8.5 3.4 -8.1 9.1 -7.5 11.2 -6.7 12 -5.1 11.9 -1.7 10.6 0.3 9.6 3.4 7.5 5.3 5.6 6.6 3.6 7.5 1.9 8.3 -1 8.5 -2.8 8.4 -7.1 7.6 -10.9Z";

const RING_RADIUS = 136;
const RING = `M ${-RING_RADIUS} 0 A ${RING_RADIUS} ${RING_RADIUS} 0 1 1 ${RING_RADIUS} 0 A ${RING_RADIUS} ${RING_RADIUS} 0 1 1 ${-RING_RADIUS} 0`;
const RING_TEXT = "BOULANGERIE & PÂTISSERIE · 100 % ARTISANALE · ";

type StampProps = {
  /** Unique sur la page : le texte de l’anneau y fait référence. */
  id: string;
  className?: string;
};

export function Stamp({ id, className }: StampProps) {
  return (
    <svg
      viewBox="-170 -170 340 340"
      className={className}
      role="img"
      aria-label="Cachet Cyprien, boulangerie et pâtisserie 100 % artisanale"
    >
      <defs>
        <path id={id} d={RING} />
      </defs>
      <g className="cy-stamp-ring">
        <text className="cy-stamp-text" textLength={Math.round(2 * Math.PI * RING_RADIUS) - 6} lengthAdjust="spacing">
          <textPath href={`#${id}`}>{RING_TEXT}</textPath>
        </text>
      </g>
      <path d={C_MARK} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

/** Le « C » seul, pour le bandeau. */
export function CMark({ className }: { className?: string }) {
  return (
    <svg viewBox="-68 -76 136 152" className={className} aria-hidden="true" focusable="false">
      <path d={C_MARK} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

export function Grain({ className }: { className?: string }) {
  return (
    <svg viewBox="-10 -14 20 28" className={className} aria-hidden="true" focusable="false">
      <path d={GRAIN} fill="currentColor" />
    </svg>
  );
}
