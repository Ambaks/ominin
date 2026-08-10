"use client";

import Link from "next/link";
import { StatCard } from "@/components/gestion/apercu/stat-card";
import { formatPrice } from "@/lib/menu-data";
import {
  inProgressOrders,
  revenueToday,
  topVentesToday,
  unavailableItems,
} from "@/lib/gestion/selectors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";

export default function ApercuPage() {
  const state = useGestion();
  const { hasFeature } = useGestionAccess();
  if (!state) return null;

  const indispo = unavailableItems(state);
  const topVentes = hasFeature("commandes") ? topVentesToday(state) : [];
  const itemCount = state.categories.reduce(
    (sum, category) => sum + category.items.length,
    0
  );
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
          Aperçu
        </h1>
        <p className="mt-1 text-sm capitalize text-muted">{today}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {hasFeature("commandes") && (
          <>
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
          </>
        )}
        <StatCard
          label="Articles indisponibles"
          value={String(indispo.length)}
          href="/gestion/menu"
          hint="Épuisés ou retirés de la vente"
        />
        <StatCard
          label="Articles au menu"
          value={String(itemCount)}
          href="/gestion/menu"
          hint={`${state.categories.length} catégories · ${state.formules.length} formule${state.formules.length > 1 ? "s" : ""}`}
        />
      </div>

      {topVentes.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-medium">
            Top ventes du jour
          </h2>
          <div className="rounded-2xl border border-hairline bg-surface">
            {topVentes.map((entry, index) => (
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
    </div>
  );
}
