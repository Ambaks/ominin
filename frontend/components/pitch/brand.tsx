import { useId, type ComponentType } from "react";

/*
 * Les marques du pitch, en em : chaque pièce prend la taille de police de son
 * parent, d'une couverture à 1 920 px comme d'un en-tête de téléphone.
 * L'enseigne apporte les siennes (components/pitch/brands/<slug>) ; le
 * dégradé braise ne sert qu'à Ominin.
 */

/** Ce qu'une enseigne prête à son pitch : son logo, son emblème et le motif de ses fonds. */
export interface BrandKit {
  /** Le verrou de l'enseigne, à la taille de police du parent. */
  Lockup: ComponentType<{ className?: string }>;
  /** L'emblème seul, à la couleur du texte : pied du ticket, note des sources. */
  Emblem: ComponentType<{ className?: string }>;
  /** Le motif posé derrière une section ou une diapositive ; cx, cy : son centre, en %. */
  Backdrop: ComponentType<{ cx?: number; cy?: number; className?: string }>;
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

/** « L'enseigne × Ominin », les deux marques côte à côte. */
export function PartnerMarks({ brand, className = "" }: { brand: BrandKit; className?: string }) {
  return (
    <div className={`flex items-center gap-[1.1em] ${className}`}>
      <brand.Lockup className="text-[1em]" />
      <span aria-hidden className="text-[0.7em] font-light text-(--pitch-faint)">
        ×
      </span>
      <OmininMark className="text-[0.92em]" />
    </div>
  );
}

/**
 * Le ticket du client, en objet : l'aplat de l'enseigne, le numéro dans ses
 * chiffres, la découpe et ses encoches — le même que dans le film.
 */
export function TicketCard({
  brand,
  name,
  number,
  className = "",
}: {
  brand: BrandKit;
  /** Le nom de l'enseigne imprimé au pied du ticket. */
  name: string;
  number: number;
  className?: string;
}) {
  return (
    <div className={`pitch-ticket ${className}`}>
      <p className="pitch-ticket-label">Votre numéro</p>
      <p className="pitch-ticket-number">
        <span className="pitch-ticket-no">N°</span>
        <span>{number}</span>
      </p>
      <div aria-hidden className="pitch-ticket-tear" />
      <div className="pitch-ticket-foot">
        <brand.Emblem className="h-[1.1em] shrink-0" />
        <p>
          <span className="pitch-ticket-brand">{name}</span>
          <span className="block">À retirer au comptoir</span>
        </p>
      </div>
    </div>
  );
}
