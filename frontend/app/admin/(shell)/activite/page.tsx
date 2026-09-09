"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatTile } from "@/components/admin/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { useAdminBasePath } from "@/lib/admin/base-path";
import { ACTIVITY_FEED_LIMIT, LIVE_REFRESH_MS } from "@/lib/admin/constants";
import { formatEuros, formatRelative } from "@/lib/admin/format";
import {
  fetchFeed,
  fetchLive,
  type FeedRow,
  type LiveRow,
} from "@/lib/admin/metrics";

export default function ActivitePage() {
  const toast = useToast();
  const { basePath } = useAdminBasePath();
  const [live, setLive] = useState<LiveRow[] | null>(null);
  const [feed, setFeed] = useState<FeedRow[] | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [liveRows, feedRows] = await Promise.all([
          fetchLive(),
          fetchFeed(ACTIVITY_FEED_LIMIT),
        ]);
        if (!active) return;
        setLive(liveRows);
        setFeed(feedRows);
      } catch (error) {
        if (!active) return;
        toast.error(
          error instanceof Error ? error.message : "Une erreur est survenue."
        );
      }
    }

    load();
    const interval = setInterval(load, LIVE_REFRESH_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
    // toast est stable (contexte).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalSessions =
    live?.reduce((sum, r) => sum + r.live_sessions, 0) ?? 0;
  const totalOpenOrders =
    live?.reduce((sum, r) => sum + r.open_orders, 0) ?? 0;
  const activeLive = live?.filter((r) => r.live_sessions > 0) ?? [];

  if (live === null) {
    return (
      <div aria-busy className="flex flex-col gap-4">
        <div className="shimmer h-9 w-52 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="shimmer h-24 rounded-2xl" />
          <div className="shimmer h-24 rounded-2xl" />
        </div>
        <div className="shimmer h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-medium">Activité</h1>
        <p className="mt-1 text-sm text-muted">
          Ce qui se passe en ce moment sur les menus.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile
          label="Sessions en cours"
          value={String(totalSessions)}
          hint={`${activeLive.length} établissement${activeLive.length !== 1 ? "s" : ""} actif${activeLive.length !== 1 ? "s" : ""}`}
        />
        <StatTile
          label="Commandes ouvertes"
          value={String(totalOpenOrders)}
        />
      </div>

      {activeLive.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[10px] uppercase tracking-[0.18em] text-faint">
                <th className="px-4 py-3 font-semibold">Restaurant</th>
                <th className="px-4 py-3 text-right font-semibold">Sessions</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Cmdes ouvertes
                </th>
                <th className="px-4 py-3 font-semibold">Dernière cmde</th>
              </tr>
            </thead>
            <tbody>
              {activeLive.map((row) => (
                <tr
                  key={row.etablissement_id}
                  className="border-b border-hairline last:border-0 transition-colors hover:bg-surface-raised"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`${basePath}/clients/${row.slug}?vue=activite`}
                      className="font-medium hover:text-ember-1"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.live_sessions}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.open_orders}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {row.last_order_at
                      ? formatRelative(row.last_order_at)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {feed && feed.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[10px] uppercase tracking-[0.18em] text-faint">
                <th className="px-4 py-3 font-semibold">Quand</th>
                <th className="px-4 py-3 font-semibold">Restaurant</th>
                <th className="px-4 py-3 font-semibold">Table</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Paiement</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody>
              {feed.map((row) => (
                <tr
                  key={row.order_id}
                  className="border-b border-hairline last:border-0"
                >
                  <td className="px-4 py-3 text-muted">
                    {formatRelative(row.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`${basePath}/clients/${row.slug}?vue=activite`}
                      className="hover:text-ember-1"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {row.table_number != null ? `#${row.table_number}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatEuros(row.total)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {row.paid_online ? "En ligne" : "Sur place"}
                  </td>
                  <td className="px-4 py-3 text-muted">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="Aucune commande récente"
          body="Les commandes apparaîtront ici dès qu'un client passera commande."
        />
      )}
    </div>
  );
}
