import { useId } from "react";
import type { BrandKit } from "@/components/pitch/brand";

/*
 * Les marques de Baï-Kō pour son pitch : le logo du site (bol, 바이코 et
 * « BAÏ-KŌ » au pinceau, publié en PNG seulement), son nom coréen en
 * emblème, et la grille néon du fond de son site. Les règles sont dans
 * bai-ko.css.
 */

/**
 * Le logo du site, rogné à son dessin, avec le halo violet que lui donne la
 * carte (globals.css, .theme-bai-ko .hero-logo) cuit dans l'image : un filtre
 * CSS sortirait du PDF en rectangle translucide. 2,8 em de haut, le dessin
 * seul deux fois la hauteur des chevrons d'Ominin ; la marge négative rend
 * au halo la place qu'il déborde, le dessin s'aligne sur la marge. Taille
 * posée en style (une feuille en retard l'étalait).
 */
function Lockup({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- logo publié en PNG seulement, à sa taille
    <img src="/pitch/bai-ko/logo-neon.png" alt="Baï-Kō" width={420} height={197} style={{ height: "2.8em", width: "auto", margin: "-0.4em" }} className={`shrink-0 ${className}`} />
  );
}

/** 바이코, le nom coréen du logo, à la couleur du texte. */
function Hangul({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 66 24" className={className} aria-hidden>
      <text x="0" y="20" fontFamily="var(--font-pitch-flourish), sans-serif" fontWeight="700" fontSize="21" fill="currentColor">
        바이코
      </text>
    </svg>
  );
}

/** Les lignes de la grille, tous les 64 px de la vue de 1 600 × 900. */
const gridStep = 64;
const gridLines = [
  ...Array.from({ length: 1600 / gridStep + 1 }, (_, i) => `M${i * gridStep} 0V900`),
  ...Array.from({ length: Math.floor(900 / gridStep) + 1 }, (_, i) => `M0 ${i * gridStep}H1600`),
].join("");

/**
 * Le fond et les lignes, du centre de la lueur au bord : une lueur violette
 * qui vire au cyan, puis le noir du site. Les couleurs sont celles que
 * donnaient la grille blanche à 4,5 %, la lueur et le fondu superposés, mais
 * opaques : Chrome tramait chaque dégradé transparent en deux images pleine
 * page, le PDF pesait 2 Mo de plus ; opaque, il reste vectoriel.
 */
const glowStops = [
  { offset: 0, ground: "#231f34", line: "#2c283d" },
  { offset: 0.25, ground: "#121a22", line: "#1a2129" },
  { offset: 0.5, ground: "#0b1012", line: "#111517" },
  { offset: 1, ground: "var(--pitch-ground)", line: "var(--pitch-ground)" },
];

/** La grille du fond de bai-ko.com et ses lueurs, nettes autour de (cx, cy), fondues dans le noir vers les bords. */
function NeonGrid({ cx = 50, cy = 50, className = "" }: { cx?: number; cy?: number; className?: string }) {
  const id = useId();
  const glow = { cx: (cx / 100) * 1600, cy: (cy / 100) * 900, r: 675, gradientUnits: "userSpaceOnUse" } as const;
  return (
    <svg aria-hidden viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}>
      <defs>
        {(["ground", "line"] as const).map((layer) => (
          <radialGradient key={layer} id={`${id}-${layer}`} {...glow}>
            {glowStops.map((stop) => (
              <stop key={stop.offset} offset={stop.offset} stopColor={stop[layer]} />
            ))}
          </radialGradient>
        ))}
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-ground)`} />
      <path d={gridLines} fill="none" stroke={`url(#${id}-line)`} strokeWidth="1" />
    </svg>
  );
}

export const baiKoBrand: BrandKit = { Lockup, Emblem: Hangul, Backdrop: NeonGrid };
