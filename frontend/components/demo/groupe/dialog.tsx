"use client";

import { useId } from "react";
import { ICON } from "./ui";

/**
 * Une fenêtre modale native, que la page ouvre par `ref.current?.showModal()` :
 * le reste de la page devient inerte, Échap ferme, le focus revient au bouton
 * qui l'a ouverte. Un clic sur le fond la ferme aussi : la cible est alors le
 * `<dialog>` lui-même, que son contenu recouvre entièrement (marge intérieure
 * et défilement portés par le bloc intérieur).
 */
export function Dialog({ ref, title, children }: { ref: React.Ref<HTMLDialogElement>; title: string; children: React.ReactNode }) {
  const titleId = useId();
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className="groupe-dialog m-auto max-h-[calc(100dvh-2rem)] w-[min(38rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-2xl border border-hairline bg-surface p-0 text-foreground shadow-2xl shadow-black/60 open:flex open:flex-col"
    >
      <div className="min-h-0 overflow-y-auto overscroll-contain p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-display text-xl font-medium text-balance">
            {title}
          </h2>
          {/* Un formulaire `method="dialog"` : son bouton ferme la fenêtre nativement. */}
          <form method="dialog" className="shrink-0">
            <button
              aria-label="Fermer"
              className="flex size-8 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </form>
        </div>
        <div className="mt-4 text-sm text-pretty text-muted">{children}</div>
      </div>
    </dialog>
  );
}
