"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { setCategoryLayout } from "@/lib/gestion/api";
import { CATEGORY_LAYOUTS } from "@/lib/menu/category-layouts";
import type { CategoryLayout } from "@/lib/menu-data";

/*
 * Présentation des catégories du menu QR (gérant) : la barre de pastilles
 * collée en haut, ou un rail d'icônes à gauche, à côté des plats. Le menu
 * public suit à sa prochaine revalidation (une minute).
 */

/* Pictogramme de chaque présentation, dans la carte du réglage. */
const ICONS: Record<CategoryLayout, React.ReactNode> = {
  top: <path d="M4 5h16v4H4zM4 13h16M4 17h16M4 21h10" />,
  rail: <path d="M4 4h4v16H4zM12 5h8M12 9h8M12 13h8M12 17h5" />,
};

export function CategoryLayoutSettings({ initialLayout }: { initialLayout: CategoryLayout }) {
  const toast = useToast();
  const [layout, setLayout] = useState(initialLayout);
  const [busy, setBusy] = useState(false);

  const choose = async (next: CategoryLayout) => {
    if (next === layout || busy) return;
    setBusy(true);
    const previous = layout;
    setLayout(next);
    try {
      await setCategoryLayout(next);
      toast.success(
        next === "rail"
          ? "Catégories à gauche : votre menu les affiche en icônes."
          : "Catégories en haut : votre menu les affiche en barre."
      );
    } catch (error) {
      setLayout(previous);
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex max-w-xl flex-col gap-5 rounded-2xl border border-hairline bg-surface p-5 lg:p-6">
      <div>
        <h2 className="font-display text-lg font-medium">Catégories du menu</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Comment vos clients passent d&rsquo;une catégorie à l&rsquo;autre sur le
          menu en ligne. Le menu suit votre choix en une minute.
        </p>
      </div>
      <div role="radiogroup" aria-label="Catégories du menu" className="grid gap-3 sm:grid-cols-2">
        {CATEGORY_LAYOUTS.map((option) => {
          const selected = layout === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={busy}
              onClick={() => void choose(option.id)}
              className={`flex flex-col gap-2 rounded-2xl border p-4 text-left transition-colors disabled:cursor-wait ${
                selected ? "border-ember-2/60 bg-surface-raised" : "border-hairline hover:border-ember-2/30"
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5">
                  <svg
                    viewBox="0 0 24 24"
                    className={`size-5 ${selected ? "text-ember-1" : "text-muted"}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    {ICONS[option.id]}
                  </svg>
                  <span className="font-display text-base font-medium">{option.label}</span>
                </span>
                <span
                  aria-hidden
                  className={`flex size-5 items-center justify-center rounded-full border ${
                    selected ? "border-ember-2" : "border-hairline"
                  }`}
                >
                  {selected && <span className="ember-gradient size-2.5 rounded-full" />}
                </span>
              </span>
              <span className="text-xs leading-relaxed text-muted">{option.body}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
