"use client";

import { useEffect, useState } from "react";
import { Funnel, StatTile, VolumeBar } from "@/components/admin/charts";
import { useToast } from "@/components/ui/toast";
import { ITEM_RANKING_COUNT } from "@/lib/admin/constants";
import { formatEuros, formatPercent } from "@/lib/admin/format";
import {
  conversionRate,
  fetchFunnel,
  fetchItemRanking,
  type ClientOverview,
  type Funnel as FunnelData,
  type ItemRanking,
  type Period,
} from "@/lib/admin/metrics";

/*
 * Ce que fait le menu, pas ce qu'il rapporte. L'entonnoir répond à « où on
 * perd les gens », le palmarès à « ce qu'on regarde contre ce qui se vend » —
 * l'écart entre les deux est la seule donnée qu'un restaurateur ne peut
 * obtenir nulle part ailleurs, et le meilleur argument de vente d'Ominin.
 */

export function ClientAnalytique({
  client,
  period,
}: {
  client: ClientOverview;
  period: Period;
}) {
  const toast = useToast();
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [items, setItems] = useState<ItemRanking[] | null>(null);

  useEffect(() => {
    setFunnel(null);
    setItems(null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.all([
      fetchFunnel(client.etablissement_id, period),
      fetchItemRanking(client.etablissement_id, period),
    ])
      .then(([nextFunnel, nextItems]) => {
        setFunnel(nextFunnel);
        setItems(nextItems);
      })
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Une erreur est survenue."
        )
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.etablissement_id, period.from, period.to]);

  const topClicks = Math.max(1, ...(items ?? []).map((item) => item.clicks));
  const ranked = (items ?? []).slice(0, ITEM_RANKING_COUNT);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Visites" value={String(client.sessions)} />
        <StatTile
          label="Conversion"
          value={formatPercent(
            conversionRate(client.sessions, client.converted)
          )}
          hint="visites ayant abouti à une commande"
        />
        <StatTile label="Commandes" value={String(client.converted)} />
        <StatTile
          label="Plats consultés"
          value={String(funnel?.item_clicks ?? 0)}
        />
      </div>

      <section className="rounded-2xl border border-hairline bg-surface p-5">
        <h2 className="font-display text-lg font-medium">Entonnoir</h2>
        <p className="mt-1 mb-4 text-xs text-muted">
          Part des visites ayant atteint chaque étape.
        </p>
        {funnel === null ? (
          <div aria-busy className="shimmer h-40 rounded-2xl" />
        ) : (
          <Funnel
            steps={[
              { label: "Menu ouvert", value: funnel.sessions },
              { label: "Catégorie", value: funnel.categories },
              { label: "Plat consulté", value: funnel.plats },
              { label: "Panier", value: funnel.paniers },
              { label: "Commande", value: funnel.commandes },
              { label: "Paiement", value: funnel.paiements },
            ]}
          />
        )}
      </section>

      <section className="rounded-2xl border border-hairline bg-surface p-5">
        <h2 className="font-display text-lg font-medium">
          Vu contre vendu
        </h2>
        <p className="mt-1 mb-4 text-xs text-muted">
          Un plat très consulté qui ne se vend pas est un plat mal décrit, mal
          photographié ou mal placé.
        </p>
        {items === null ? (
          <div aria-busy className="shimmer h-52 rounded-2xl" />
        ) : ranked.length === 0 ? (
          <p className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-hairline text-sm text-muted">
            Aucun plat consulté sur la période.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[10px] uppercase tracking-[0.18em] text-faint">
                <th className="py-2 font-semibold">Plat</th>
                <th className="w-32 py-2 font-semibold">Consultations</th>
                <th className="py-2 text-right font-semibold">Vus</th>
                <th className="py-2 text-right font-semibold">Vendus</th>
                <th className="py-2 text-right font-semibold">Recette</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((item) => (
                <tr
                  key={item.item_id}
                  className="border-b border-hairline last:border-0"
                >
                  <td className="py-2.5 pr-3">{item.name}</td>
                  <td className="py-2.5 pr-3">
                    <VolumeBar ratio={item.clicks / topClicks} />
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {item.clicks}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {item.sold}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-muted">
                    {formatEuros(item.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
