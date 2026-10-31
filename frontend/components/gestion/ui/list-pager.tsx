"use client";

import { LIST_PAGE_SIZES } from "@/lib/gestion/constants";
import { GlassButton } from "./glass-button";
import { Segmented } from "./segmented";

const OPTIONS = LIST_PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }));

/**
 * Le pied d'une longue liste : où l'on en est, combien de lignes à la fois, et
 * « Voir plus » pour la page suivante. Une liste qui tient sur la plus petite
 * page n'en a pas besoin.
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
    <div className="flex flex-wrap items-center gap-3 border-t border-hairline px-5 py-3">
      <p className="text-g-meta text-muted tabular-nums" role="status">
        {shown.toLocaleString("fr-FR")} sur {total.toLocaleString("fr-FR")}
      </p>
      <div className="ml-auto flex items-center gap-3">
        <Segmented
          glass={false}
          label="Lignes par page"
          options={OPTIONS}
          value={String(pageSize)}
          onChange={(value) => onPageSize(Number(value))}
        />
        {shown < total && (
          <GlassButton onClick={onMore} disabled={loading}>
            {loading ? "Chargement…" : "Voir plus"}
          </GlassButton>
        )}
      </div>
    </div>
  );
}
