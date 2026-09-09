"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatTile } from "@/components/admin/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useToast } from "@/components/ui/toast";
import { useAdminBasePath } from "@/lib/admin/base-path";
import { CLIENT_PERIOD_DAYS } from "@/lib/admin/constants";
import { formatEuros, formatPercent } from "@/lib/admin/format";
import {
  conversionRate,
  fetchOverview,
  periodOf,
  theoreticalCommission,
  type ClientOverview,
} from "@/lib/admin/metrics";
import { OFFRE_LABELS } from "@/lib/gestion/constants";

/*
 * Vue d'ensemble des clients. Deux questions, et rien d'autre : combien ils
 * encaissent, et est-ce que leur menu convertit. La commission théorique est
 * posée à côté de la facturée parce que l'écart entre les deux — l'espèce et
 * le comptoir — est le seul chiffre qui dise ce que vaudrait un client
 * entièrement digitalisé.
 */

const PERIOD_TABS = CLIENT_PERIOD_DAYS.map((days) => ({
  id: String(days),
  label: `${days} j`,
}));

export default function ClientsPage() {
  const toast = useToast();
  const { basePath } = useAdminBasePath();
  const [days, setDays] = useState<number>(CLIENT_PERIOD_DAYS[1]);
  const [rows, setRows] = useState<ClientOverview[] | null>(null);

  const load = useCallback(async (period: number) => {
    setRows(await fetchOverview(periodOf(period)));
  }, []);

  useEffect(() => {
    setRows(null);
    // Faux positif : le setState de load() suit la réponse réseau.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(days).catch((error) =>
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      )
    );
    // toast est stable (contexte).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, days]);

  const totals = useMemo(() => {
    const active = (rows ?? []).filter(
      (row) => row.revenue > 0 || row.sessions > 0
    );
    return {
      active: active.length,
      revenue: active.reduce((sum, row) => sum + row.revenue, 0),
      commission: active.reduce((sum, row) => sum + row.commission, 0),
      theoretical: active.reduce((sum, row) => sum + theoreticalCommission(row), 0),
      orders: active.reduce((sum, row) => sum + row.orders_count, 0),
      sessions: active.reduce((sum, row) => sum + row.sessions, 0),
      converted: active.reduce((sum, row) => sum + row.converted, 0),
    };
  }, [rows]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium">Vue d&apos;ensemble</h1>
          <p className="mt-1 text-sm text-muted">
            Les établissements qui tournent — ce qu&apos;ils encaissent et ce que
            leur menu convertit.
          </p>
        </div>
        <PillTabs
          tabs={PERIOD_TABS}
          activeId={String(days)}
          onSelect={(id) => setDays(Number(id))}
        />
      </div>

      {rows === null ? (
        <div aria-busy className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="shimmer h-24 rounded-2xl" />
            <div className="shimmer h-24 rounded-2xl" />
            <div className="shimmer h-24 rounded-2xl" />
            <div className="shimmer h-24 rounded-2xl" />
          </div>
          <div className="shimmer h-64 rounded-2xl" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Aucun client"
          body="Les établissements signés apparaîtront ici dès leur première commande."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Encaissé"
              value={formatEuros(totals.revenue)}
              hint={`${totals.orders} commande${totals.orders > 1 ? "s" : ""}`}
            />
            <StatTile
              label="Commission facturée"
              value={formatEuros(totals.commission)}
              hint={`${formatEuros(totals.theoretical)} si tout passait en ligne`}
            />
            <StatTile
              label="Visites du menu"
              value={String(totals.sessions)}
              hint={`${formatPercent(conversionRate(totals.sessions, totals.converted))} ont commandé`}
            />
            <StatTile
              label="Clients actifs"
              value={String(totals.active)}
              hint={`sur ${rows.length} établissement${rows.length > 1 ? "s" : ""}`}
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">
            <table className="w-full min-w-184 text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[10px] uppercase tracking-[0.18em] text-faint">
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Offre</th>
                  <th className="px-4 py-3 text-right font-semibold">Visites</th>
                  <th className="px-4 py-3 text-right font-semibold">Conv.</th>
                  <th className="px-4 py-3 text-right font-semibold">Cmdes</th>
                  <th className="px-4 py-3 text-right font-semibold">Encaissé</th>
                  <th className="px-4 py-3 text-right font-semibold">Commission</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.etablissement_id}
                    className="border-b border-hairline last:border-0 transition-colors hover:bg-surface-raised"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`${basePath}/clients/${row.slug}`}
                        className="font-medium hover:text-ember-1"
                      >
                        {row.name}
                      </Link>
                      {!row.provider_ready && (
                        <span
                          className="ml-2 text-xs text-muted"
                          title="Le compte d'encaissement n'est pas relié : aucun paiement en ligne possible."
                        >
                          · encaissement non relié
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {OFFRE_LABELS[row.offre]}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.sessions}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {formatPercent(conversionRate(row.sessions, row.converted))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.orders_count}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatEuros(row.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatEuros(row.commission)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
