"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { XIcon } from "@/components/gestion/icons";
import { GlassButton } from "./glass-button";
import { Plate } from "./plate";

/**
 * Feuille de verre : collée en bas au téléphone, dialogue centré dès 1024 px
 * (`wide` : pleine largeur sous 1024, 1120 px au-delà). Dialogue natif ouvert
 * en modal : le fond devient inerte, Échap ferme, le focus revient au bouton
 * d'origine ; la page ne défile plus dessous. À monter conditionnellement
 * (`{open && <Sheet …>}`) ; le champ attendu porte `data-autofocus`.
 * Compte pour un élément de verre.
 */
export function Sheet({
  title,
  description,
  onClose,
  size = "md",
  footer,
  children,
}: {
  title: string;
  /** Une phrase sous le titre, lue avec lui par les lecteurs d'écran. */
  description?: string;
  onClose: () => void;
  size?: "md" | "wide";
  /** Les commandes, à droite ; un `<p>` en premier y pose la phrase d'aide d'un bouton désactivé. */
  footer?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-desc` : undefined}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={`g-dialog g-glass ${size === "wide" ? "g-dialog-wide" : ""}`}
    >
      <span className="g-dialog-handle" aria-hidden />
      <header className="g-dialog-head">
        <h2 id={`${id}-title`} className="font-display">
          {title}
        </h2>
        <GlassButton variant="icon" aria-label="Fermer" onClick={onClose}>
          <XIcon />
        </GlassButton>
      </header>
      <Plate className="g-dialog-body">
        {description && (
          <p id={`${id}-desc`} className="mb-4 text-g-body text-muted">
            {description}
          </p>
        )}
        {children}
      </Plate>
      {footer && <footer className="g-dialog-foot">{footer}</footer>}
    </dialog>
  );
}

/**
 * Confirmation : le titre nomme le geste et l'objet (« Supprimer “Tiramisù” ? »),
 * le texte dit ce qui est perdu, le bouton porte un verbe et l'objet — jamais
 * « Oui ». Destructeur : filet grenat, le mot fait le reste.
 */
export function ConfirmSheet({
  title,
  text,
  confirmLabel,
  cancelLabel = "Annuler",
  destructive = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Le geste est en cours : le bouton se désactive, la phrase dit pourquoi. */
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        <>
          {busy && <p>Un instant…</p>}
          <GlassButton onClick={onClose} data-autofocus>
            {cancelLabel}
          </GlassButton>
          <GlassButton variant={destructive ? "danger" : "primary"} disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </GlassButton>
        </>
      }
    >
      <p className="text-g-body text-muted">{text}</p>
    </Sheet>
  );
}
