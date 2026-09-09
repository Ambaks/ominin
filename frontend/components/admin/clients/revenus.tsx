"use client";

import { useEffect, useState } from "react";
import { BarSeries, StatTile, type BarPoint } from "@/components/admin/charts";
import { useToast } from "@/components/ui/toast";
import { formatEuros } from "@/lib/admin/format";
import {
  fetchSeries,
  theoreticalCommission,
  type ClientOverview,
  type Period,
  type SeriesPoint,
} from "@/lib/admin/metrics";

/*
 * Les recettes d'un client. Le chiffre est agrégé à la maille du règlement
 * (order_items.paid_at) et non de la commande : depuis le paiement par
 * article, une addition peut être à moitié réglée, et une commande « servie »
 * peut être entièrement payée. La date retenue est donc celle où l'argent est
 * entré — elle peut différer d'un jour de celle du tableau de bord du
 * restaurant, qui compte à la commande.
 */

function dayLabel(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toPoint(point: SeriesPoint): BarPoint {
  const orders = `${point.orders_count} commande${point.orders_count > 1 ? "s" : ""}`;
  return {
    key: point.day,
    label: dayLabel(point.day),
    value: point.revenue,
    title: `${dayLabel(point.day)} · ${orders} · ${formatEuros(point.revenue)}`,
  };
}

export function ClientRevenus({
  client,
  period,
}: {
  client: ClientOverview;
  period: Period;
}) {
  const toast = useToast();
  const [series, setSeries] = useState<SeriesPoint[] | null>(null);

  useEffect(() => {
    // Remise à zéro volontaire : la période a changé, la courbe repart en
    // chargement. La suite du setState, elle, suit la réponse réseau.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeries(null);
    fetchSeries(client.etablissement_id, period)
      .then(setSeries)
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Une erreur est survenue."
        )
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.etablissement_id, period.from, period.to]);

  const theoretical = theoreticalCommission(client);
  const basket =
    client.orders_count === 0 ? 0 : client.revenue / client.orders_count;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Encaissé"
          value={formatEuros(client.revenue)}
          hint={`${client.orders_count} commande${client.orders_count > 1 ? "s" : ""}`}
        />
        <StatTile label="Panier moyen" value={formatEuros(basket)} />
        <StatTile
          label="Commission facturée"
          value={formatEuros(client.commission)}
          hint={`${client.fee_percent} % · ${formatEuros(theoretical)} si tout passait en ligne`}
        />
        <StatTile
          label="Pourboires"
          value={formatEuros(client.tips)}
          hint="reversés au restaurant, hors chiffre d'affaires"
        />
      </div>

      <section className="rounded-2xl border border-hairline bg-surface p-5">
        <h2 className="font-display text-lg font-medium">Encaissé par jour</h2>
        <p className="mt-1 mb-4 text-xs text-muted">
          À la date du règlement, pourboires exclus.
        </p>
        {series === null ? (
          <div aria-busy className="shimmer h-52 rounded-2xl" />
        ) : (
          <BarSeries
            data={series.map(toPoint)}
            ariaLabel="Encaissé par jour"
            formatTick={(value) => formatEuros(value)}
            empty="Aucun règlement sur la période."
          />
        )}
      </section>
    </div>
  );
}
