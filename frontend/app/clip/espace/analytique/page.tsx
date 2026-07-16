"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RefreshIcon } from "@/components/clip/espace/icons";
import { StatCard } from "@/components/gestion/apercu/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchAnalytics } from "@/lib/clip/api";
import { PLATFORM_LABELS } from "@/lib/clip/constants";
import type { PlatformAnalytics } from "@/lib/clip/provider/types";
import { useClip } from "@/lib/clip/store";

/*
 * Analytics par plateforme, lues en direct chez le prestataire à l'arrivée
 * sur la page (et via Actualiser). Portée en barres CSS sur le token
 * --chart-mark, même technique que la page Analytique de gestion.
 */

const compact = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export default function AnalytiquePage() {
  const state = useClip();
  const [analytics, setAnalytics] = useState<PlatformAnalytics[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetchAnalytics()
      .then((next) => {
        setAnalytics(next);
        setError(null);
      })
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false));
  }, []);

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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            Analytique
          </h1>
          <p className="mt-1 text-sm text-muted">
            Vos audiences, tous réseaux confondus.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={refresh}
          className="flex items-center gap-2 rounded-full border border-hairline px-4 py-2 text-xs font-medium text-muted transition-colors hover:border-ember-2/40 hover:text-foreground disabled:opacity-60"
        >
          <RefreshIcon className="size-3.5" />
          {loading ? "Actualisation…" : "Actualiser"}
        </button>
      </header>

      {state.accounts.length === 0 ? (
        <EmptyState
          title="Aucun compte connecté"
          body="Connectez vos réseaux pour suivre abonnés, vues et engagement ici."
          action={
            <Link
              href="/espace/comptes"
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
          <div aria-busy className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="shimmer h-28 rounded-2xl" />
              <div className="shimmer h-28 rounded-2xl" />
              <div className="shimmer h-28 rounded-2xl" />
              <div className="shimmer h-28 rounded-2xl" />
            </div>
            <div className="shimmer h-44 rounded-2xl" />
          </div>
        )
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Abonnés" value={compact.format(totals.followers)} />
            <StatCard label="Vues" value={compact.format(totals.views)} />
            <StatCard label="J'aime" value={compact.format(totals.likes)} />
            <StatCard
              label="Commentaires"
              value={compact.format(totals.comments)}
            />
          </div>

          {error && (
            <p className="rounded-xl border border-hairline bg-surface px-4 py-3 text-sm text-muted">
              {error}
            </p>
          )}

          {analytics.map((entry) => (
            <section
              key={entry.platform}
              className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5"
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
      <div className="flex h-24 items-end gap-[2px]">
        {points.map((point) => (
          <div
            key={point.date}
            className="flex h-full flex-1 items-end"
            title={`${new Date(point.date).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })} — ${compact.format(point.value)}`}
          >
            <div
              className="w-full rounded-t bg-chart-mark transition-opacity hover:opacity-80"
              style={{ height: `${Math.max((point.value / max) * 100, 2)}%` }}
            />
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-faint">Portée par jour</p>
    </div>
  );
}
