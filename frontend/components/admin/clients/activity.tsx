"use client";

import { useEffect, useState } from "react";
import { StatTile } from "@/components/admin/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { ACTIVITY_FEED_LIMIT, LIVE_REFRESH_MS } from "@/lib/admin/constants";
import { formatEuros, formatRelative } from "@/lib/admin/format";
import {
  fetchFeed,
  fetchLive,
  type FeedRow,
  type LiveRow,
} from "@/lib/admin/metrics";

export function ClientActivity({
  etablissementId,
}: {
  etablissementId: string;
}) {
  const toast = useToast();
  const [live, setLive] = useState<LiveRow | null>(null);
  const [feed, setFeed] = useState<FeedRow[] | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [liveRows, feedRows] = await Promise.all([
          fetchLive(),
          fetchFeed(ACTIVITY_FEED_LIMIT, etablissementId),
        ]);
        if (!active) return;
        setLive(
          liveRows.find((r) => r.etablissement_id === etablissementId) ?? null
        );
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
  }, [etablissementId]);

  if (feed === null) {
    return (
      <div aria-busy className="flex flex-col gap-4">
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
      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile
          label="Sessions en cours"
          value={String(live?.live_sessions ?? 0)}
          hint={
            live?.last_order_at
              ? `Dernière commande ${formatRelative(live.last_order_at)}`
              : undefined
          }
        />
        <StatTile
          label="Commandes ouvertes"
          value={String(live?.open_orders ?? 0)}
        />
      </div>

      {feed.length === 0 ? (
        <EmptyState
          title="Aucune commande"
          body="Les commandes récentes apparaîtront ici."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[10px] uppercase tracking-[0.18em] text-faint">
                <th className="px-4 py-3 font-semibold">Quand</th>
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
      )}
    </div>
  );
}
