import { useId } from "react";
import { COQ_PATH, COQ_VIEWBOX } from "@/components/pitch/coq-path";

/*
 * Les marques du pitch, en em : chaque pièce prend la taille de police de son
 * parent, d'une couverture à 1 920 px comme d'un en-tête de téléphone. Le
 * verrou suit l'enseigne lumineuse (proportions relevées pour le thème de la
 * carte et reprises par le film) ; le dégradé braise ne sert qu'à Ominin.
 */

/** Le coq du logo, vectoriel, à la couleur du texte. */
export function Coq({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${COQ_VIEWBOX.width} ${COQ_VIEWBOX.height}`}
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d={COQ_PATH} />
    </svg>
  );
}

/**
 * Le verrou de l'enseigne : le coq perché sur « Crousti », le nom bicolore
 * sur une ligne, le long trait jaune qui finit sur ORIGINAL.
 */
export function OcpLockup({ coq = true, className = "" }: { coq?: boolean; className?: string }) {
  return (
    <div role="img" aria-label="O’Crousti Poulet Original" className={`inline-flex flex-col items-center ${className}`}>
      {coq && <Coq className="ocp-lockup-coq h-[1.3125em] text-(--ocp-white)" />}
      <div className="ocp-lockup-grid">
        <p aria-hidden className="ocp-lockup-name">
          <span>
            <span className="ocp-lit">O’</span>Crousti
          </span>
          <span className="ocp-lit">Poulet</span>
        </p>
        <span aria-hidden className="ocp-lockup-rule" />
        <span aria-hidden className="ocp-lockup-tag">
          ORIGINAL
        </span>
      </div>
    </div>
  );
}

/** Les chevrons d'Ominin (public/logo.png, redessinés) et son mot-symbole. */
export function OmininMark({ className = "" }: { className?: string }) {
  const gradient = useId();
  return (
    <div role="img" aria-label="Ominin" className={`inline-flex items-center gap-[0.42em] ${className}`}>
      <svg viewBox="116 107 280 300" aria-hidden className="h-[0.98em] w-auto overflow-visible">
        <defs>
          <linearGradient id={gradient} x1="0" y1="107" x2="0" y2="407" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffd65a" />
            <stop offset="0.48" stopColor="#ffa662" />
            <stop offset="1" stopColor="#ff97a8" />
          </linearGradient>
        </defs>
        {[0, 63, 126].map((dy) => (
          <path
            key={dy}
            d={`M256 ${107 + dy} L396 ${247 + dy} V${281 + dy} L256 ${141 + dy} L116 ${281 + dy} V${247 + dy} Z`}
            fill={`url(#${gradient})`}
          />
        ))}
      </svg>
      <span aria-hidden className="om-wordmark">
        Ominin
      </span>
    </div>
  );
}

/** « O’Crousti Poulet × Ominin », les deux marques côte à côte. */
export function PartnerMarks({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-[1.1em] ${className}`}>
      <OcpLockup coq={false} className="text-[1em]" />
      <span aria-hidden className="text-[0.7em] font-light text-(--ocp-faint)">
        ×
      </span>
      <OmininMark className="text-[0.92em]" />
    </div>
  );
}

/**
 * Le ticket du client, en objet : le jaune de l'enseigne, le numéro en
 * Anton, la découpe et ses encoches — le même que dans le film.
 */
export function TicketCard({ number, className = "" }: { number: number; className?: string }) {
  return (
    <div className={`ocp-ticket ${className}`}>
      <p className="ocp-ticket-label">Votre numéro</p>
      <p className="ocp-ticket-number">
        <span className="ocp-ticket-no">N°</span>
        <span>{number}</span>
      </p>
      <div aria-hidden className="ocp-ticket-tear" />
      <div className="ocp-ticket-foot">
        <Coq className="h-[1.1em] shrink-0" />
        <p>
          <span className="ocp-ticket-brand">O’Crousti Poulet</span>
          <span className="block">À retirer au comptoir</span>
        </p>
      </div>
    </div>
  );
}

/**
 * Les rayons du panneau-menu, en vecteur : des secteurs remplis d'un dégradé
 * radial qui s'éteint vers le bord. Nets dans le PDF, sans image.
 */
export function Rays({
  cx = 50,
  cy = 50,
  className = "",
}: {
  /** Centre des rayons, en % de la boîte. */
  cx?: number;
  cy?: number;
  className?: string;
}) {
  const fade = useId();
  const width = 1600;
  const height = 900;
  const x = (cx / 100) * width;
  const y = (cy / 100) * height;
  const reach = 1500;
  const count = 36;
  const wedges = Array.from({ length: count }, (_, i) => {
    const a = (i * 2 * Math.PI) / count;
    const b = a + Math.PI / count;
    return `M${x} ${y}L${x + reach * Math.cos(a)} ${y + reach * Math.sin(a)}L${x + reach * Math.cos(b)} ${y + reach * Math.sin(b)}Z`;
  }).join("");
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <defs>
        <radialGradient id={fade} cx={x} cy={y} r={1000} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f7f7f2" stopOpacity="0.075" />
          <stop offset="0.55" stopColor="#f7f7f2" stopOpacity="0.03" />
          <stop offset="1" stopColor="#f7f7f2" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={wedges} fill={`url(#${fade})`} />
    </svg>
  );
}
