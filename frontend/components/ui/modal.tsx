"use client";

import { useEffect, useRef } from "react";

/**
 * Boîte de dialogue native : bottom sheet sur mobile, fenêtre centrée sur
 * desktop. À monter conditionnellement (`{open && <Modal …>}`) — le montage
 * ouvre le dialogue, Échap et le clic sur le fond appellent `onClose`.
 */
export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-0 mt-auto max-h-[85dvh] w-full max-w-none bg-transparent p-0 text-foreground backdrop:bg-background/70 backdrop:backdrop-blur-sm lg:m-auto lg:max-w-lg"
    >
      <div className="flex max-h-[85dvh] flex-col overflow-hidden rounded-t-3xl border border-hairline bg-surface-raised lg:rounded-3xl">
        <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4">
          <h2 className="font-display text-lg font-medium">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full border border-hairline p-1.5 text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-hairline px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
