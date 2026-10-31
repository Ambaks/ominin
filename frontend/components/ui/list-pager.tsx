"use client";

import { LIST_PAGE_SIZES } from "@/lib/gestion/constants";

/**
 * Le pied d'une longue liste, hors espace de gestion restaurant (où vit son
 * pendant vitré) : où l'on en est, combien de lignes à la fois, « Voir plus ».
 */
export function ListPager({
  shown,
  total,
  pageSize,
  loading,
  onPageSize,
  onMore,
}: {
  shown: number;
  total: number;
  pageSize: number;
  loading: boolean;
  onPageSize: (size: number) => void;
  onMore: () => void;
}) {
  if (total <= LIST_PAGE_SIZES[0]) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 px-1 py-2">
      <p className="text-xs tabular-nums text-muted" role="status">
        {shown.toLocaleString("fr-FR")} sur {total.toLocaleString("fr-FR")}
      </p>
      <div className="ml-auto flex items-center gap-3">
        <div role="group" aria-label="Lignes par page" className="flex gap-1">
          {LIST_PAGE_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={size === pageSize}
              onClick={() => onPageSize(size)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium tabular-nums transition-colors ${
                size === pageSize ? "bg-surface-raised text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
        {shown < total && (
          <button
            type="button"
            onClick={onMore}
            disabled={loading}
            className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            {loading ? "Chargement…" : "Voir plus"}
          </button>
        )}
      </div>
    </div>
  );
}
