"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PLATFORM_LABELS } from "@/lib/clip/constants";
import { useClipData } from "@/lib/clip/context";
import type {
  PostAnalytics,
  PostPlatformMetrics,
} from "@/lib/clip/provider/types";
import type { ClipPost } from "@/lib/clip/types";
import { RefreshIcon } from "./icons";

/*
 * Carte de l'onglet Par publication : les métriques ne sont demandées au
 * prestataire qu'à l'apparition de la carte à l'écran (IntersectionObserver)
 * — pas de rafale d'appels pour un historique que personne ne fait défiler.
 */

const compact = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const METRIC_COLUMNS: [keyof PostPlatformMetrics, string][] = [
  ["views", "Vues"],
  ["likes", "J'aime"],
  ["comments", "Commentaires"],
  ["shares", "Partages"],
  ["saves", "Enregistrements"],
];

type LoadedRow = PostAnalytics & { metrics: PostPlatformMetrics };

export function PostAnalyticsCard({
  post,
  style,
}: {
  post: ClipPost;
  /** Délai d'entrée en cascade, posé par la liste (animationDelay). */
  style?: React.CSSProperties;
}) {
  const { actions } = useClipData();
  const containerRef = useRef<HTMLElement>(null);
  const requestedRef = useRef(false);
  const [analytics, setAnalytics] = useState<PostAnalytics[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    requestedRef.current = true;
    setLoading(true);
    actions
      .fetchPostAnalytics(post.id)
      .then((next) => {
        setAnalytics(next);
        setError(null);
      })
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false));
  }, [actions, post.id]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (
        !requestedRef.current &&
        entries.some((entry) => entry.isIntersecting)
      ) {
        observer.disconnect();
        load();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [load]);

  const date = new Date(
    post.publishedAt ?? post.createdAt
  ).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const rows = (analytics ?? []).filter(
    (entry): entry is LoadedRow => entry.metrics != null
  );
  const pending = (analytics ?? []).filter((entry) => entry.metrics == null);
  const totals = rows.reduce(
    (sum, row) => ({
      views: sum.views + row.metrics.views,
      likes: sum.likes + row.metrics.likes,
      comments: sum.comments + row.metrics.comments,
      shares: sum.shares + row.metrics.shares,
      saves: sum.saves + row.metrics.saves,
    }),
    { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 }
  );

  return (
    <article
      ref={containerRef}
      style={style}
      className="rise flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-base font-medium">
            {post.title}
          </h2>
          <p className="mt-0.5 text-xs text-faint">{date}</p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={load}
          aria-label="Actualiser les statistiques"
          className="shrink-0 rounded-full border border-hairline p-2 text-muted transition-colors hover:border-ember-2/40 hover:text-foreground disabled:opacity-60"
        >
          <RefreshIcon className="size-3.5" />
        </button>
      </div>

      {analytics == null ? (
        error ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted">{error}</p>
            <button
              type="button"
              onClick={load}
              className="rounded-full border border-hairline px-4 py-1.5 text-xs font-medium text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
            >
              Réessayer
            </button>
          </div>
        ) : (
          <div aria-hidden className="flex animate-pulse flex-col gap-2.5">
            <div className="h-3.5 w-2/5 rounded bg-foreground/10" />
            <div className="h-3.5 w-full rounded bg-foreground/10" />
            <div className="h-3.5 w-3/4 rounded bg-foreground/10" />
          </div>
        )
      ) : rows.length === 0 && pending.length === 0 ? (
        <p className="text-sm text-muted">
          Aucune statistique disponible pour cette publication.
        </p>
      ) : (
        <>
          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                    <th className="pb-2 text-left font-semibold">Réseau</th>
                    {METRIC_COLUMNS.map(([, label]) => (
                      <th key={label} className="pb-2 text-right font-semibold">
                        {label}
                      </th>
                    ))}
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.platform} className="border-t border-hairline">
                      <td className="py-2.5 font-medium">
                        {PLATFORM_LABELS[row.platform]}
                      </td>
                      {METRIC_COLUMNS.map(([key]) => (
                        <td
                          key={key}
                          className="py-2.5 text-right font-display"
                        >
                          {compact.format(row.metrics[key])}
                        </td>
                      ))}
                      <td className="py-2.5 text-right">
                        {row.postUrl && (
                          <a
                            href={row.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-ember-2 hover:underline"
                          >
                            Voir ↗
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                  {rows.length > 1 && (
                    <tr className="border-t border-hairline">
                      <td className="py-2.5 font-semibold">Total</td>
                      {METRIC_COLUMNS.map(([key]) => (
                        <td
                          key={key}
                          className="py-2.5 text-right font-display font-semibold"
                        >
                          {compact.format(totals[key])}
                        </td>
                      ))}
                      <td />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {pending.length > 0 && (
            <ul className="flex flex-col gap-1 text-xs text-muted">
              {pending.map((entry) => (
                <li key={entry.platform}>
                  <span className="font-medium text-foreground">
                    {PLATFORM_LABELS[entry.platform]}
                  </span>{" "}
                  : {entry.error ?? "statistiques pas encore disponibles"}
                </li>
              ))}
            </ul>
          )}

          {error && <p className="text-xs text-muted">{error}</p>}
        </>
      )}
    </article>
  );
}
