import type { CSSProperties } from "react";

/*
 * Les signes du Boho : le kilim du logo, et la bulle, un hublot de verre
 * éclairé de l'intérieur, teinté de sa couleur (bulles.color).
 */

/** Le motif kilim de la carte papier (treillis à 45° autour d'un losange), en couleur du texte. */
export function KilimMark({ className }: { className?: string }) {
  return (
    <svg viewBox="-110 -110 220 220" aria-hidden className={className}>
      <g transform="rotate(45)" stroke="currentColor" strokeWidth="13" strokeLinecap="round" fill="none">
        <line x1="-74" y1="-40" x2="74" y2="-40" />
        <line x1="-74" y1="40" x2="74" y2="40" />
        <line x1="-96" y1="0" x2="-30" y2="0" />
        <line x1="30" y1="0" x2="96" y2="0" />
        <line x1="-40" y1="-74" x2="-40" y2="74" />
        <line x1="40" y1="-74" x2="40" y2="74" />
        <line x1="0" y1="-96" x2="0" y2="-30" />
        <line x1="0" y1="30" x2="0" y2="96" />
        <rect x="-22" y="-22" width="44" height="44" rx="8" />
      </g>
    </svg>
  );
}

/** Une bulle à sa couleur ; sa lueur respire, sauf en mouvement réduit. */
export function Orb({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden className={`bo-orb ${className ?? ""}`} style={{ "--orb": color } as CSSProperties} />;
}

/** Le fond de toutes les pages : le jardin flouté et ses lampes, que le verre réfracte. */
export function BohoCanvas() {
  return (
    <div aria-hidden className="bo-canvas">
      <span className="bo-lamp bo-lamp--a" />
      <span className="bo-lamp bo-lamp--b" />
    </div>
  );
}
