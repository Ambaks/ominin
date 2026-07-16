"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RefreshIcon } from "@/components/clip/espace/icons";
import { ClipLoader } from "@/components/clip/espace/loader";
import { PostAnalyticsCard } from "@/components/clip/espace/post-analytics-card";
import { StatCard } from "@/components/gestion/apercu/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useClipData } from "@/lib/clip/context";
import { PLATFORM_LABELS } from "@/lib/clip/constants";
import type { PlatformAnalytics } from "@/lib/clip/provider/types";

/*
 * Analytique en deux vues : « Par réseau » (audiences des comptes, lues en
 * direct chez le prestataire à l'arrivée et via Actualiser) et « Par
 * publication » (métriques de chaque clip publié, chargées carte par carte à
 * l'apparition à l'écran). Portée en barres CSS sur le token --chart-mark,
 * même technique que la page Analytique de gestion.
 */

const compact = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const VIEWS = [
  ["reseaux", "Par réseau"],
  ["publications", "Par publication"],
] as const;
type AnalyticsView = (typeof VIEWS)[number][0];

const VIEW_SUBTITLES: Record<AnalyticsView, string> = {
  reseaux: "Vos audiences, tous réseaux confondus.",
  publications: "Les performances de chaque clip publié.",
};

export default function AnalytiquePage() {
  const { state, basePath, actions } = useClipData();
  const [view, setView] = useState<AnalyticsView>("reseaux");
  const [analytics, setAnalytics] = useState<PlatformAnalytics[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    actions
      .fetchAnalytics()
      .then((next) => {
        setAnalytics(next);
        setError(null);
      })
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false));
  }, [actions]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = () => {
    setLoading(true);
    load();
  };

  if (!state) return null;

  const totals = (analytics ?? []).reduce(
    (sum, entry) => ({
      followers: sum.followers + entry.followers,
      views: sum.views + entry.views,
      likes: sum.likes + entry.likes,
      comments: sum.comments + entry.comments,
    }),
    { followers: 0, views: 0, likes: 0, comments: 0 }
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            Analytique
          </h1>
          <p className="mt-1 text-sm text-muted">{VIEW_SUBTITLES[view]}</p>
        </div>
        {view === "reseaux" && (
          <button
            type="button"
            disabled={loading}
            onClick={refresh}
            className="flex items-center gap-2 rounded-full border border-hairline px-4 py-2 text-xs font-medium text-muted transition-colors hover:border-ember-2/40 hover:text-foreground disabled:opacity-60"
          >
            <RefreshIcon className="size-3.5" />
            {loading ? "Actualisation…" : "Actualiser"}
          </button>
        )}
      </header>

      <div
        role="tablist"
        aria-label="Vue des statistiques"
        className="rise inline-flex w-fit rounded-full border border-hairline bg-surface p-1"
      >
        {VIEWS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            onClick={() => setView(key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              view === key
                ? "ember-gradient text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "publications" ? (
        <PostAnalyticsList />
      ) : state.accounts.length === 0 ? (
        <EmptyState
          title="Aucun compte connecté"
          body="Connectez vos réseaux pour suivre abonnés, vues et engagement ici."
          action={
            <Link
              href={`${basePath}/comptes`}
              className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
            >
              Connecter mes comptes
            </Link>
          }
        />
      ) : analytics == null ? (
        error ? (
          <p className="rounded-xl border border-hairline bg-surface px-4 py-3 text-sm text-muted">
            {error}
          </p>
        ) : (
          <ClipLoader label="Lecture de vos audiences…" />
        )
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["Abonnés", totals.followers],
                ["Vues", totals.views],
                ["J'aime", totals.likes],
                ["Commentaires", totals.comments],
              ] as const
            ).map(([label, value], index) => (
              <div
                key={label}
                className="rise"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <StatCard label={label} value={compact.format(value)} />
              </div>
            ))}
          </div>

          {error && (
            <p className="rounded-xl border border-hairline bg-surface px-4 py-3 text-sm text-muted">
              {error}
            </p>
          )}

          {analytics.map((entry, index) => (
            <section
              key={entry.platform}
              style={{ animationDelay: `${240 + index * 80}ms` }}
              className="rise flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-lg font-medium">
                  {PLATFORM_LABELS[entry.platform]}
                </h2>
                <p className="text-xs text-faint">
                  {compact.format(entry.followers)} abonnés
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat label="Vues" value={entry.views} />
                <MiniStat label="Portée" value={entry.reach} />
                <MiniStat label="J'aime" value={entry.likes} />
                <MiniStat label="Partages" value={entry.shares} />
              </dl>

              {entry.reachTimeseries.length > 1 && (
                <ReachChart points={entry.reachTimeseries} />
              )}
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function PostAnalyticsList() {
  const { state, basePath } = useClipData();
  const posts = (state?.posts ?? []).filter(
    (post) => post.status === "publie" || post.status === "partiel"
  );

  if (posts.length === 0) {
    return (
      <EmptyState
        title="Aucune publication à analyser"
        body="Publiez un premier clip pour suivre ici ses vues, j'aime, commentaires et partages."
        action={
          <Link
            href={basePath}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
          >
            Publier un clip
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {posts.map((post, index) => (
        <PostAnalyticsCard
          key={post.id}
          post={post}
          style={{ animationDelay: `${index * 80}ms` }}
        />
      ))}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-faint">
        {label}
      </dt>
      <dd className="font-display text-xl font-medium">
        {compact.format(value)}
      </dd>
    </div>
  );
}

function ReachChart({ points }: { points: { date: string; value: number }[] }) {
  const max = Math.max(...points.map((point) => point.value), 1);
  return (
    <div>
      <div className="flex h-24 items-end gap-0.5">
        {points.map((point, index) => (
          <div
            key={point.date}
            className="flex h-full flex-1 items-end"
            title={`${new Date(point.date).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })} — ${compact.format(point.value)}`}
          >
            <div
              className="bar-rise w-full rounded-t bg-chart-mark transition-opacity hover:opacity-80"
              style={{
                height: `${Math.max((point.value / max) * 100, 2)}%`,
                animationDelay: `${index * 18}ms`,
              }}
            />
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-faint">Portée par jour</p>
    </div>
  );
}
