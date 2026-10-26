"use client";

import { useId, useState, type ReactNode } from "react";
import { Sheet } from "./sheet";

/**
 * Une pastille d'offres en bas à gauche (la happy hour, les formules) : sa
 * pièce tourne de temps en temps (globals.css), elle ouvre ses offres en
 * feuille.
 */
export function OfferPill({
  className,
  icon,
  label,
  detail,
  ariaLabel,
  children,
}: {
  /** Son nom (happy-hour-pill, formules-pill) : l'animation de son dessin. */
  className: string;
  icon: ReactNode;
  label: string;
  detail: string;
  ariaLabel?: string;
  children: (titleId: string, close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
        className={`offer-pill ${className}`}
      >
        <span className="offer-coin" aria-hidden>
          {icon}
        </span>
        <span className="flex flex-col text-left leading-tight">
          {label}
          <small>{detail}</small>
        </span>
      </button>
      {open && (
        <Sheet card backdropCloses labelledBy={titleId} onClosed={() => setOpen(false)}>
          {(close) => <div className="offer-sheet">{children(titleId, close)}</div>}
        </Sheet>
      )}
    </>
  );
}

/** L'en-tête d'une feuille d'offres ; `children` : ce qui suit le titre (le compte à rebours). */
export function OfferHead({
  kicker,
  title,
  titleId,
  close,
  children,
}: {
  kicker: string;
  title: string;
  titleId: string;
  close: () => void;
  children?: ReactNode;
}) {
  return (
    <header className="offer-head">
      <button type="button" onClick={close} aria-label="Fermer" className="offer-close">
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <path d="M3.5 3.5l9 9m0-9-9 9" />
        </svg>
      </button>
      <p className="offer-kicker">{kicker}</p>
      <h2 id={titleId} className="font-display text-2xl leading-tight">
        {title}
      </h2>
      {children}
    </header>
  );
}
