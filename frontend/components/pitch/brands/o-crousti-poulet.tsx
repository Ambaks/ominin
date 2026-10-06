import { useId } from "react";
import type { BrandKit } from "@/components/pitch/brand";
import { COQ_PATH, COQ_VIEWBOX } from "@/components/pitch/brands/coq-path";

/*
 * Les marques d'O'Crousti Poulet pour son pitch. Le verrou suit l'enseigne
 * lumineuse (proportions relevées pour le thème de la carte et reprises par
 * le film) ; ses règles sont dans o-crousti-poulet.css.
 */

/** Le coq du logo, vectoriel, à la couleur du texte. */
function Coq({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${COQ_VIEWBOX.width} ${COQ_VIEWBOX.height}`} className={className} aria-hidden fill="currentColor">
      <path d={COQ_PATH} />
    </svg>
  );
}

/** Le verrou de l'enseigne : le nom bicolore sur une ligne, le long trait jaune qui finit sur ORIGINAL. */
function Lockup({ className = "" }: { className?: string }) {
  return (
    <div role="img" aria-label="O’Crousti Poulet Original" className={`inline-flex flex-col items-center ${className}`}>
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

/**
 * Les rayons du panneau-menu, en vecteur : des secteurs remplis d'un dégradé
 * radial qui s'éteint vers le bord. Nets dans le PDF, sans image.
 */
function Rays({ cx = 50, cy = 50, className = "" }: { cx?: number; cy?: number; className?: string }) {
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

export const oCroustiPouletBrand: BrandKit = { Lockup, Emblem: Coq, Backdrop: Rays };
