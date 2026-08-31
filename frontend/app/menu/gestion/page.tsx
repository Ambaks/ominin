"use client";

import { useState } from "react";
import Link from "next/link";
import { EmployeeApercu } from "@/components/gestion/apercu/employee-apercu";
import { StatCard } from "@/components/gestion/apercu/stat-card";
import { SumUpPrompt } from "@/components/gestion/sumup-prompt";
import { ANALYTICS_PERIOD_DAYS } from "@/lib/gestion/constants";
import { formatPrice } from "@/lib/menu-data";
import {
  inProgressOrders,
  ordersByHour,
  periodStats,
  revenueByDay,
  revenueToday,
  tipsByServer,
  topVentes,
  topVentesToday,
  unavailableItems,
  type DayPoint,
} from "@/lib/gestion/selectors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";

type Period = (typeof ANALYTICS_PERIOD_DAYS)[number];

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

function ChartSection({
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

export default function ApercuPage() {
  const state = useGestion();
  const { hasFeature } = useGestionAccess();
  const [period, setPeriod] = useState<Period>(ANALYTICS_PERIOD_DAYS[0]);

  if (!state) return null;

  // Les employés n'ont pas l'analytique : leur aperçu est un poste de
  // pilotage du service, taillé pour leur rôle.
  if (state.role !== "gerant") return <EmployeeApercu state={state} />;

  const indispo = unavailableItems(state);
  const hasCommandes = hasFeature("commandes");
  const topVentesJour = hasCommandes ? topVentesToday(state) : [];
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const stats = hasCommandes ? periodStats(state, period) : null;
  const byDay = hasCommandes ? revenueByDay(state, period) : [];
  const ventesTop = hasCommandes ? topVentes(state, period) : [];
  const hours = hasCommandes ? ordersByHour(state, period) : [];
  const tips = hasCommandes ? tipsByServer(state, period) : [];
  const hasAnalyticsData = stats ? stats.orders > 0 || ventesTop.length > 0 : false;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
          Aperçu
        </h1>
        <p className="mt-1 text-sm capitalize text-muted">{today}</p>
      </div>

      <SumUpPrompt />

      {hasCommandes && (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Commandes en cours"
            value={String(inProgressOrders(state).length)}
            href="/gestion/commandes"
            hint="En attente, en préparation ou prêtes"
          />
          <StatCard
            label="CA du jour"
            value={formatPrice(revenueToday(state))}
            href="/gestion/commandes"
            hint="Commandes encaissées aujourd'hui"
          />
        </div>
      )}

      {topVentesJour.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-medium">
            Top ventes du jour
          </h2>
          <div className="rounded-2xl border border-hairline bg-surface">
            {topVentesJour.map((entry, index) => (
              <div
                key={`${index}-${entry.name}`}
                className={`flex items-center gap-4 px-5 py-3.5 ${
                  index > 0 ? "border-t border-hairline" : ""
                }`}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-hairline text-[11px] font-bold text-faint">
                  {index + 1}
                </span>
                <p className="flex-1 truncate text-sm font-medium">
                  {entry.name}
                </p>
                <span className="text-sm font-semibold text-ember-1">
                  × {entry.quantity}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {indispo.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-medium">
            À remettre en vente
          </h2>
          <div className="rounded-2xl border border-hairline bg-surface">
            {indispo.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-4 px-5 py-3.5 ${
                  index > 0 ? "border-t border-hairline" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-faint">
                    {item.stock === 0 ? "Stock épuisé" : "Retiré de la vente"}
                  </p>
                </div>
                <Link
                  href="/gestion/menu"
                  className="text-xs font-semibold text-ember-1 transition-opacity hover:opacity-80"
                >
                  Gérer
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {hasCommandes && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4 border-t border-hairline pt-8">
            <div>
              <h2 className="font-display text-lg font-medium">Analytique</h2>
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
              value={formatPrice(stats!.revenue)}
              hint={`Commandes payées sur ${period} jours`}
            />
            <StatCard
              label="Commandes payées"
              value={String(stats!.orders)}
              hint={`Sur ${period} jours`}
            />
            <StatCard
              label="Panier moyen"
              value={formatPrice(stats!.avgTicket)}
              hint="CA ÷ commandes payées"
            />
          </div>

          {hasAnalyticsData && (
            <>
              <ChartSection title="CA par jour">
                <RevenueChart points={byDay} />
              </ChartSection>

              <div className="grid gap-8 lg:grid-cols-2 lg:gap-6">
                <ChartSection title="Top ventes">
                  {ventesTop.length ? (
                    <TopVentesChart entries={ventesTop} />
                  ) : (
                    <p className="text-sm text-muted">
                      Aucune vente sur la période.
                    </p>
                  )}
                </ChartSection>
                <ChartSection title="Heures de pointe">
                  <HoursChart buckets={hours} />
                </ChartSection>
              </div>

              {tips.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="font-display text-lg font-medium">
                    Pourboires par serveur
                  </h2>
                  <div className="rounded-2xl border border-hairline bg-surface">
                    {tips.map((entry, index) => (
                      <div
                        key={entry.name}
                        className={`flex items-center justify-between gap-4 px-5 py-3.5 ${
                          index > 0 ? "border-t border-hairline" : ""
                        }`}
                      >
                        <p className="truncate text-sm font-medium">
                          {entry.name}
                        </p>
                        <span className="shrink-0 font-display text-ember-1">
                          {formatPrice(entry.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

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
        </>
      )}
    </div>
  );
}
