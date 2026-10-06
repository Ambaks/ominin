"use client";

import { useMemo } from "react";
import { StatTile } from "@/components/admin/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { formatEuros, formatRelative } from "@/lib/admin/format";
import { fetchShopClients, type ShopClient } from "@/lib/admin/metrics";
import {
  AlertList,
  ClientsSkeleton,
  PeriodHeader,
  TABLE_HEAD,
  TABLE_ROW,
  TD_NUM,
  TH,
  TH_NUM,
  plural,
  usePeriodPair,
} from "./period";

/*
 * Synthèse Shop : ce que chaque boutique encaisse, ce qu'Ominin y prélève, ce
 * qui attend d'être expédié. Décroche une boutique qui vendait la période
 * d'avant et plus du tout sur celle-ci.
 */

/** Statuts Stripe de l'abonnement Shop. */
const SUBSCRIPTION_LABELS: Record<string, string> = {
  active: "Actif",
  trialing: "Essai",
  past_due: "Impayé",
  unpaid: "Impayé",
  incomplete: "Incomplet",
  incomplete_expired: "Expiré",
  canceled: "Résilié",
  paused: "En pause",
};

const euros = (cents: number) => formatEuros(cents / 100);

export function ShopClients() {
  const { days, setDays, data } = usePeriodPair(fetchShopClients);
  const rows = data?.rows ?? null;

  const totals = useMemo(() => {
    const all = rows ?? [];
    const sum = (pick: (row: ShopClient) => number) =>
      all.reduce((total, row) => total + pick(row), 0);
    return {
      revenue: sum((row) => row.revenue_cents),
      fees: sum((row) => row.fee_cents),
      orders: sum((row) => row.paid_orders),
      toPrepare: sum((row) => row.to_prepare),
      selling: all.filter((row) => row.paid_orders > 0).length,
    };
  }, [rows]);

  const declining = useMemo(() => {
    if (!data) return [];
    const before = new Map(
      data.previous.map((row) => [row.shop_id, row.paid_orders]),
    );
    return data.rows.flatMap((row) => {
      const previous = before.get(row.shop_id) ?? 0;
      return previous > 0 && row.paid_orders === 0
        ? [
            {
              key: row.shop_id,
              name: row.name,
              detail: `${plural(previous, "vente")} → aucune${
                row.last_paid_at
                  ? ` · dernière ${formatRelative(row.last_paid_at)}`
                  : ""
              }`,
            },
          ]
        : [];
    });
  }, [data]);

  return (
    <div className="flex flex-col gap-6">
      <PeriodHeader
        title="Synthèse"
        subtitle="Les boutiques en ligne : ce qu'elles vendent et ce qui attend d'être expédié."
        days={days}
        onDays={setDays}
      />

      {rows === null ? (
        <ClientsSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Aucune boutique"
          body="Les boutiques créées apparaîtront ici."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Encaissé"
              value={euros(totals.revenue)}
              hint={plural(
                totals.orders,
                "commande payée",
                "commandes payées",
              )}
            />
            <StatTile label="Commission" value={euros(totals.fees)} />
            <StatTile
              label="À expédier"
              value={String(totals.toPrepare)}
              hint="payées ou en préparation"
            />
            <StatTile
              label="Boutiques qui vendent"
              value={String(totals.selling)}
              hint={`sur ${plural(rows.length, "boutique")}`}
            />
          </div>

          <AlertList
            title="Boutiques qui décrochent"
            body={`Des ventes sur les ${days} jours d'avant, aucune sur les ${days} derniers.`}
            items={declining}
          />

          <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">
            <table className="w-full min-w-184 text-sm">
              <thead>
                <tr className={TABLE_HEAD}>
                  <th className={TH}>Boutique</th>
                  <th className={TH}>Abonnement</th>
                  <th className={TH_NUM}>Cmdes</th>
                  <th className={TH_NUM}>Encaissé</th>
                  <th className={TH_NUM}>Commission</th>
                  <th className={TH_NUM}>Remb.</th>
                  <th className={TH_NUM}>À expédier</th>
                  <th className={TH_NUM}>Dernière vente</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.shop_id} className={TABLE_ROW}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.name}</p>
                      <p className="text-xs text-faint">
                        {[
                          row.owner_email ?? "sans propriétaire",
                          row.is_active ? null : "hors ligne",
                          // Compte Stripe incapable d'encaisser.
                          row.charges_enabled ? null : "encaissement non relié",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {row.subscription_status
                        ? (SUBSCRIPTION_LABELS[row.subscription_status] ??
                          row.subscription_status)
                        : "Aucun"}
                    </td>
                    <td className={TD_NUM}>{row.paid_orders}</td>
                    <td className={TD_NUM}>{euros(row.revenue_cents)}</td>
                    <td className={TD_NUM}>{euros(row.fee_cents)}</td>
                    <td className={`${TD_NUM} text-muted`}>{row.refunded}</td>
                    <td className={TD_NUM}>{row.to_prepare}</td>
                    <td className={`${TD_NUM} text-muted`}>
                      {row.last_paid_at ? formatRelative(row.last_paid_at) : "—"}
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
