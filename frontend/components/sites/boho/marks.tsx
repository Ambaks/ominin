import type { CSSProperties } from "react";

/*
 * Les signes du Boho : le kilim du logo, et la bulle, un hublot de verre
 * éclairé de l'intérieur, teinté de sa couleur (bulles.color).
 */

/**
 * Le kilim du logo, relevé sur celui du gérant (public/boho/logo.svg) : un
 * carré de deux traits par côté, tourné à 45°, prolongé aux angles, une
 * branche vers l'extérieur au milieu de chaque côté, un carré au centre.
 * Traits droits, angles vifs ; en couleur du texte.
 */
export function KilimMark({ className }: { className?: string }) {
  return (
    <svg viewBox="-84 -84 168 168" aria-hidden className={className}>
      <g transform="rotate(45)" stroke="currentColor" strokeWidth="10" strokeLinejoin="miter" fill="none">
        <line x1="-70" y1="-40" x2="70" y2="-40" />
        <line x1="-70" y1="40" x2="70" y2="40" />
        <line x1="-40" y1="-70" x2="-40" y2="70" />
        <line x1="40" y1="-70" x2="40" y2="70" />
        <line x1="-68" y1="0" x2="-40" y2="0" />
        <line x1="40" y1="0" x2="68" y2="0" />
        <line x1="0" y1="-68" x2="0" y2="-40" />
        <line x1="0" y1="40" x2="0" y2="68" />
        <rect x="-13" y="-13" width="26" height="26" />
      </g>
    </svg>
  );
}

/** Le filet du logo, entre le nom et la signature : deux traits et un losange. */
export function LogoFilet({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 12" aria-hidden className={className} preserveAspectRatio="xMidYMid meet">
      <g stroke="currentColor" strokeWidth="1.5" fill="none">
        <line x1="0" y1="6" x2="110" y2="6" />
        <line x1="130" y1="6" x2="240" y2="6" />
        <rect x="115.8" y="1.8" width="8.4" height="8.4" transform="rotate(45 120 6)" />
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
