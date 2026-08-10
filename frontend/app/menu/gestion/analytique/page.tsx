"use client";

import { useState } from "react";
import { StatCard } from "@/components/gestion/apercu/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ANALYTICS_PERIOD_DAYS } from "@/lib/gestion/constants";
import {
  ordersByHour,
  periodStats,
  revenueByDay,
  topVentes,
  type DayPoint,
} from "@/lib/gestion/selectors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import { formatPrice } from "@/lib/menu-data";

type Period = (typeof ANALYTICS_PERIOD_DAYS)[number];

/*
 * Graphiques sans librairie : barres CSS ancrées à la ligne de base,
 * bout arrondi, infobulle par barre au survol, labels directs sélectifs
 * (le maximum), texte toujours en tokens de texte — la couleur de série
 * vit sur la marque (token --chart-mark, validé sur les deux thèmes).
 */

function Tooltip({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-left shadow-lg group-hover:block">
      <p className="text-[11px] font-semibold capitalize">{title}</p>
      {lines.map((line) => (
        <p key={line} className="text-[11px] text-muted">
          {line}
        </p>
      ))}
    </div>
  );
}

function RevenueChart({ points }: { points: DayPoint[] }) {
  const max = Math.max(...points.map((p) => p.revenue));
  const maxIndex = points.findIndex((p) => p.revenue === max);
  const dense = points.length > 10;

  return (
    <div>
      <div className="flex h-44 items-end gap-[2px]">
        {points.map((point, index) => (
          <div
            key={point.full}
            className="group relative flex h-full flex-1 flex-col justify-end"
          >
            <Tooltip
              title={point.full}
              lines={[
                `${formatPrice(point.revenue)} encaissés`,
                `${point.orders} commande${point.orders > 1 ? "s" : ""}`,
              ]}
            />
            {index === maxIndex && max > 0 && (
              <p className="mb-1 text-center text-[10px] font-semibold text-foreground">
                {formatPrice(point.revenue)}
              </p>
            )}
            <div
              className="w-full rounded-t bg-chart-mark transition-opacity group-hover:opacity-80"
              style={{
                height: max > 0 ? `${(point.revenue / max) * 100}%` : "0%",
                minHeight: point.revenue > 0 ? "4px" : "1px",
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-[2px] border-t border-hairline pt-1.5">
        {points.map((point, index) => (
          <p
            key={point.full}
            className="flex-1 overflow-visible whitespace-nowrap text-center text-[10px] text-faint"
          >
            {dense ? (index % 5 === 0 ? String(point.day) : "") : point.label}
          </p>
        ))}
      </div>
    </div>
  );
}

function TopVentesChart({
  entries,
}: {
  entries: { name: string; quantity: number; revenue: number }[];
}) {
  const max = Math.max(...entries.map((entry) => entry.quantity));
  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => (
        <div key={entry.name} className="group relative">
          <div className="mb-1 flex items-baseline justify-between gap-4">
            <p className="truncate text-sm font-medium">{entry.name}</p>
            <p className="shrink-0 text-xs text-muted">
              × {entry.quantity} · {formatPrice(entry.revenue)}
            </p>
          </div>
          <div className="h-2 rounded-full bg-surface-raised">
            <div
              className="h-full rounded-full bg-chart-mark"
              style={{ width: `${(entry.quantity / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function HoursChart({ buckets }: { buckets: { hour: number; orders: number }[] }) {
  const max = Math.max(...buckets.map((b) => b.orders));
  return (
    <div>
      <div className="flex h-28 items-end gap-[2px]">
        {buckets.map((bucket) => (
          <div
            key={bucket.hour}
            className="group relative flex h-full flex-1 flex-col justify-end"
          >
            <Tooltip
              title={`${bucket.hour} h – ${bucket.hour + 1} h`}
              lines={[`${bucket.orders} commande${bucket.orders > 1 ? "s" : ""}`]}
            />
            <div
              className="w-full rounded-t bg-chart-mark transition-opacity group-hover:opacity-80"
              style={{
                height: max > 0 ? `${(bucket.orders / max) * 100}%` : "0%",
                minHeight: bucket.orders > 0 ? "4px" : "1px",
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-[2px] border-t border-hairline pt-1.5">
        {buckets.map((bucket) => (
          <p
            key={bucket.hour}
            className="flex-1 text-center text-[10px] text-faint"
          >
            {bucket.hour % 6 === 0 ? `${bucket.hour}h` : ""}
          </p>
        ))}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-medium">{title}</h2>
      <div className="rounded-2xl border border-hairline bg-surface p-5">
        {children}
      </div>
    </section>
  );
}

export default function AnalytiquePage() {
  const state = useGestion();
  const { hasFeature } = useGestionAccess();
  const [period, setPeriod] = useState<Period>(ANALYTICS_PERIOD_DAYS[0]);

  if (!state) return null;

  if (!hasFeature("commandes")) {
    return (
      <EmptyState
        title="Analytique"
        body="Les statistiques de vente s'appuient sur la commande à table, disponible avec les offres Smart et Connect."
      />
    );
  }

  const stats = periodStats(state, period);
  const byDay = revenueByDay(state, period);
  const ventes = topVentes(state, period);
  const hours = ordersByHour(state, period);
  const hasData = stats.orders > 0 || ventes.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
            Analytique
          </h1>
          <p className="mt-1 text-sm text-muted">
            Vos ventes sur la période, mises à jour en direct.
          </p>
        </div>
        <div className="flex rounded-full border border-hairline p-1">
          {ANALYTICS_PERIOD_DAYS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setPeriod(days)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                period === days
                  ? "ember-gradient text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {days} jours
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="CA encaissé"
          value={formatPrice(stats.revenue)}
          hint={`Commandes payées sur ${period} jours`}
        />
        <StatCard
          label="Commandes payées"
          value={String(stats.orders)}
          hint={`Sur ${period} jours`}
        />
        <StatCard
          label="Panier moyen"
          value={formatPrice(stats.avgTicket)}
          hint="CA ÷ commandes payées"
        />
      </div>

      {!hasData ? (
        <EmptyState
          title="Pas encore de ventes sur la période"
          body="Dès que des commandes seront encaissées, vos courbes de CA, top ventes et heures de pointe apparaîtront ici."
        />
      ) : (
        <>
          <Section title="CA par jour">
            <RevenueChart points={byDay} />
          </Section>

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-6">
            <Section title="Top ventes">
              {ventes.length ? (
                <TopVentesChart entries={ventes} />
              ) : (
                <p className="text-sm text-muted">
                  Aucune vente sur la période.
                </p>
              )}
            </Section>
            <Section title="Heures de pointe">
              <HoursChart buckets={hours} />
            </Section>
          </div>

          <details className="rounded-2xl border border-hairline bg-surface">
            <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-muted">
              Données détaillées (tableau)
            </summary>
            <div className="overflow-x-auto border-t border-hairline">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-faint">
                    <th className="px-5 py-3 font-semibold">Jour</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Commandes payées
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      CA encaissé
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {byDay.map((point) => (
                    <tr key={point.full} className="border-t border-hairline">
                      <td className="px-5 py-2.5 capitalize">{point.full}</td>
                      <td className="px-5 py-2.5 text-right">{point.orders}</td>
                      <td className="px-5 py-2.5 text-right">
                        {formatPrice(point.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
