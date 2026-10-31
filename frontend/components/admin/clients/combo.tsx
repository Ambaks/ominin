"use client";

import { useEffect, useState } from "react";
import { StatTile, VolumeBar } from "@/components/admin/charts";
import { SUGGESTION_LABELS } from "@/components/admin/clients/pilotage";
import { useToast } from "@/components/ui/toast";
import { formatEuros, formatPercent } from "@/lib/admin/format";
import { fetchCombo, type ComboStats, type Period } from "@/lib/admin/metrics";
import { ACCORD_SOURCE_LABELS } from "@/lib/gestion/constants";
import type { AccordSource } from "@/lib/menu/cart";

/*
 * Ce que les suggestions du menu ont fait commander. Sans établissement, la
 * flotte entière, démos exclues.
 */
export function ComboParfait({
  etablissementId,
  period,
}: {
  etablissementId: string | null;
  period: Period;
}) {
  const toast = useToast();
  const [stats, setStats] = useState<ComboStats | null>(null);

  useEffect(() => {
    let current = true;
    // La période a changé : le panneau repart en chargement.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStats(null);
    fetchCombo(etablissementId, period)
      .then((next) => {
        if (current) setStats(next);
      })
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.")
      );
    return () => {
      current = false;
    };
    // toast est stable (contexte).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etablissementId, period.from, period.to]);

  const sources = (Object.keys(ACCORD_SOURCE_LABELS) as AccordSource[]).map((source) => ({
    source,
    lines: stats?.by_source.find((entry) => entry.source === source)?.lines ?? 0,
    revenue: stats?.by_source.find((entry) => entry.source === source)?.revenue ?? 0,
  }));
  const topSource = Math.max(1, ...sources.map((entry) => entry.revenue));
  const topDish = Math.max(1, ...(stats?.top ?? []).map((entry) => entry.quantity));

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5">
      <div>
        <h2 className="font-display text-lg font-medium">Le combo parfait</h2>
        <p className="mt-1 text-xs text-muted">
          Ce que les suggestions du menu ont fait commander, annulations exclues.
        </p>
      </div>
      {stats === null ? (
        <div aria-busy className="shimmer h-52 rounded-2xl" />
      ) : stats.lines === 0 ? (
        <p className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-hairline text-sm text-muted">
          Aucune suggestion vendue sur la période.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile label="CA des suggestions" value={formatEuros(stats.revenue)} />
            <StatTile
              label="Lignes suggérées"
              value={String(stats.lines)}
              hint="une ligne fusionnée compte en entier"
            />
            <StatTile
              label="Part du CA"
              value={formatPercent(stats.total > 0 ? stats.revenue / stats.total : 0)}
              hint="du chiffre des commandes de la période"
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="min-w-0">
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
                Par origine
              </h3>
              <ul className="flex flex-col gap-3 text-sm">
                {sources.map((entry) => (
                  <li key={entry.source}>
                    <div className="mb-1 flex flex-wrap justify-between gap-x-3">
                      <span>{ACCORD_SOURCE_LABELS[entry.source]}</span>
                      <span className="tabular-nums text-muted">
                        {entry.lines} ligne{entry.lines > 1 ? "s" : ""} · {formatEuros(entry.revenue)}
                      </span>
                    </div>
                    <VolumeBar ratio={entry.revenue / topSource} />
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
                Plats suggérés les plus vendus
              </h3>
              <ul className="flex flex-col gap-3 text-sm">
                {stats.top.map((entry) => (
                  <li key={entry.name}>
                    <div className="mb-1 flex flex-wrap justify-between gap-x-3">
                      <span className="min-w-0 break-words">{entry.name}</span>
                      <span className="tabular-nums text-muted">
                        ×{entry.quantity} · {formatEuros(entry.revenue)}
                      </span>
                    </div>
                    <VolumeBar ratio={entry.quantity / topDish} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
      {stats !== null && (
        <div className="min-w-0">
          <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
            Proposées puis retenues
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[10px] uppercase tracking-[0.18em] text-faint">
                  <th className="py-2 font-semibold">Où</th>
                  <th className="py-2 text-right font-semibold">Proposées</th>
                  <th className="py-2 text-right font-semibold">Retenues</th>
                  <th className="py-2 text-right font-semibold">Taux</th>
                  <th className="py-2 text-right font-semibold">Recette</th>
                </tr>
              </thead>
              <tbody>
                {stats.suggestions.map((row) => (
                  <tr key={row.kind} className="border-b border-hairline last:border-0">
                    <td className="py-2.5 pr-3">{SUGGESTION_LABELS[row.kind]}</td>
                    <td className="py-2.5 text-right tabular-nums">{row.shown}</td>
                    <td className="py-2.5 text-right tabular-nums">{row.orders}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      {row.shown > 0 ? formatPercent(row.orders / row.shown) : "—"}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-muted">
                      {formatEuros(row.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
