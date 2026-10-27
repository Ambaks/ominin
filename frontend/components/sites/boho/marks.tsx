import type { CSSProperties } from "react";

/*
 * Les signes de la DA « automne bohème » : le kilim du logo, la feuille
 * d'érable, et la bulle — un hublot éclairé de l'intérieur, teinté de sa
 * couleur (bulles.color).
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

export function Leaf({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className} style={style}>
      <path
        fill="currentColor"
        d="M50 4 58 24 70 16 67 36 86 30 78 46 96 52 78 60 84 74 64 70 62 84 54 76 52 96 48 96 46 76 38 84 36 70 16 74 22 60 4 52 22 46 14 30 33 36 30 16 42 24Z"
      />
    </svg>
  );
}

/** Une bulle à sa couleur ; sa lueur respire, sauf en mouvement réduit. */
export function Orb({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden className={`bo-orb ${className ?? ""}`} style={{ "--orb": color } as CSSProperties} />;
}

/** Les feuilles qui tombent dans un ciel : décor, à poser dans un conteneur en position relative. */
export function FallingLeaves() {
  return (
    <div aria-hidden className="bo-leaves">
      <Leaf className="bo-leaf" style={{ left: "8%", width: 46, color: "var(--bo-erable)", animationDuration: "14s" }} />
      <Leaf className="bo-leaf" style={{ left: "27%", width: 30, color: "var(--bo-lampe)", animationDuration: "19s", animationDelay: "-6s" }} />
      <Leaf className="bo-leaf" style={{ left: "63%", width: 40, color: "var(--bo-rouge)", animationDuration: "16s", animationDelay: "-3s" }} />
      <Leaf className="bo-leaf" style={{ left: "85%", width: 34, color: "var(--bo-caramel)", animationDuration: "21s", animationDelay: "-11s" }} />
    </div>
  );
}
