import { useId } from "react";
import type { BrandKit } from "@/components/pitch/brand";

/*
 * Les marques de Chicken Street pour son pitch : le logo du site (blanc et
 * jaune, publié en PNG seulement), les barres jaunes de son emblème, et les
 * rayures des boîtes en filigrane. Les règles sont dans chicken-street.css.
 */

/** « CHICKEN STREET — NAAN & FRIED CHICKEN », le logo du site : un em et demi, sa ligne de base comprise. */
function Lockup({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- logo vectorisé introuvable, PNG du site à sa taille
    <img src="/chicken-street/logo.png" alt="Chicken Street" width={3164} height={822} className={`h-[1.5em] w-auto shrink-0 ${className}`} />
  );
}

/** Les deux barres jaunes de part et d'autre du nom, sur l'emblème rond de l'enseigne. */
function Bars({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 24" className={className} aria-hidden fill="currentColor">
      <rect x="0" y="4" width="40" height="5" rx="1" />
      <rect x="0" y="15" width="40" height="5" rx="1" />
    </svg>
  );
}

/**
 * Les rayures jaunes des boîtes Chicken Street, en biais, à peine visibles,
 * nettes autour de (cx, cy) puis recouvertes vers les bords par le fond :
 * un dégradé posé dessus, pas un masque (le PDF les tramait mal).
 */
function Stripes({ cx = 50, cy = 50, className = "" }: { cx?: number; cy?: number; className?: string }) {
  const id = useId();
  const width = 1600;
  const height = 900;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <defs>
        <pattern id={`${id}-stripes`} width="120" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">
          <rect width="120" height="22" fill="#fcd403" />
        </pattern>
        <radialGradient id={`${id}-fade`} cx={(cx / 100) * width} cy={(cy / 100) * height} r={1000} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--pitch-ground)" stopOpacity="0" />
          <stop offset="0.7" stopColor="var(--pitch-ground)" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width={width} height={height} fill={`url(#${id}-stripes)`} opacity={0.05} />
      <rect width={width} height={height} fill={`url(#${id}-fade)`} />
    </svg>
  );
}

export const chickenStreetBrand: BrandKit = { Lockup, Emblem: Bars, Backdrop: Stripes };
