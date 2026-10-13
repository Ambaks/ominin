import { useId } from "react";
import type { BrandKit } from "@/components/pitch/brand";
import { MONOGRAM, WORDMARK } from "@/components/pitch/brands/big-smash-marks";

/*
 * Les marques de Big Smash pour son pitch : le mot-symbole et le monogramme
 * du site, vectoriels, à la couleur du texte ; le zigzag peint de son fond en
 * filigrane. Les règles sont dans big-smash.css.
 */

/** « BIG SMASH », le mot-symbole du site : haut d'un em. */
function Lockup({ className = "" }: { className?: string }) {
  const { width, height } = WORDMARK.viewBox;
  return (
    <svg
      role="img"
      aria-label="Big Smash"
      viewBox={`0 0 ${width} ${height}`}
      fill="currentColor"
      className={`h-[1em] w-auto shrink-0 text-(--pitch-ink) ${className}`}
    >
      <path d={WORDMARK.path} />
    </svg>
  );
}

/** Le monogramme « BIG », celui des cornets de frites et des gobelets. */
function Monogram({ className }: { className?: string }) {
  return (
    <svg viewBox={MONOGRAM.viewBox} className={className} aria-hidden fill="currentColor">
      <path d={MONOGRAM.path} />
    </svg>
  );
}

/**
 * Le zigzag peint du fond de bigsmash.fr, blanc à peine visible sur le noir,
 * net autour de (cx, cy) et éteint vers les bords. À l'écran, en SVG, masque
 * compris (un masque CSS sortait en carreau sombre dans le PDF). À
 * l'impression, le motif déjà posé sur le noir (motif-zigzag-imprime.jpg),
 * tel que le PDF le rendait : Chrome y ignorait le masque, mais le tramait à
 * 6 000 px dans chaque page — 25 Mo pour treize diapositives.
 */
function Zigzag({ cx = 50, cy = 50, className = "" }: { cx?: number; cy?: number; className?: string }) {
  const id = useId();
  const width = 1600;
  const height = 900;
  return (
    <>
      <svg
        aria-hidden
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid slice"
        className={`pointer-events-none absolute inset-0 h-full w-full print:hidden ${className}`}
      >
        <defs>
          <radialGradient id={`${id}-fade`} cx={(cx / 100) * width} cy={(cy / 100) * height} r={1000} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.75" stopColor="#000" />
          </radialGradient>
          <mask id={`${id}-mask`}>
            <rect width={width} height={height} fill={`url(#${id}-fade)`} />
          </mask>
        </defs>
        <image
          href="/big-smash/motif-zigzag.webp"
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid slice"
          mask={`url(#${id}-mask)`}
          opacity={0.045}
        />
      </svg>
      {/* eslint-disable-next-line @next/next/no-img-element -- fond imprimé, à sa taille d'origine */}
      <img
        aria-hidden
        alt=""
        src="/big-smash/motif-zigzag-imprime.jpg"
        className={`pointer-events-none absolute inset-0 hidden h-full w-full object-cover print:block ${className}`}
      />
    </>
  );
}

export const bigSmashBrand: BrandKit = { Lockup, Emblem: Monogram, Backdrop: Zigzag };
