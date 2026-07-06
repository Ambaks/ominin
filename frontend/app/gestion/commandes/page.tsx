"use client";

import { useState } from "react";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { OrderCard } from "@/components/gestion/commandes/order-card";
import { OrderGroupCard } from "@/components/gestion/commandes/order-group-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import {
  groupTableNumbers,
  isHistoryStatus,
} from "@/lib/gestion/selectors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import type { Order } from "@/lib/gestion/types";

const FILTERS = [
  { id: "toutes", label: "Toutes" },
  { id: "en_attente", label: "En attente" },
  { id: "en_preparation", label: "En préparation" },
  { id: "prete", label: "Prêtes" },
  { id: "servie", label: "Servies" },
  { id: "historique", label: "Historique" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function matchesFilter(order: Order, filter: FilterId): boolean {
  if (filter === "toutes") return !isHistoryStatus(order.status);
  if (filter === "historique") return isHistoryStatus(order.status);
  return order.status === filter;
}

export default function CommandesPage() {
  const state = useGestion();
  const { hasFeature } = useGestionAccess();
  const [filter, setFilter] = useState<FilterId>("toutes");

  if (!state) return null;
  if (!hasFeature("commandes")) return <FeatureLocked />;

  const visible = state.orders
    .filter((order) => matchesFilter(order, filter))
    .sort((a, b) =>
      filter === "historique"
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt)
    );

  const grouped = new Map<string, Order[]>();
  const singles: Order[] = [];
  for (const order of visible) {
    if (order.groupeId && !isHistoryStatus(order.status)) {
      const list = grouped.get(order.groupeId) ?? [];
      list.push(order);
      grouped.set(order.groupeId, list);
    } else {
      singles.push(order);
    }
  }

  const tableNumbersById = new Map(
    state.tables.map((table) => [table.id, table.number])
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
        Commandes
      </h1>

      <PillTabs
        tabs={FILTERS.map(({ id, label }) => ({
          id,
          label,
          count: state.orders.filter((order) => matchesFilter(order, id)).length,
        }))}
        activeId={filter}
        onSelect={(id) => setFilter(id as FilterId)}
      />

      {visible.length === 0 ? (
        <EmptyState
          title="Aucune commande"
          body={
            filter === "historique"
              ? "Les commandes payées ou annulées apparaîtront ici."
              : "Les commandes passées depuis le menu QR apparaîtront ici en temps réel."
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {[...grouped.entries()].map(([groupeId, orders]) => {
            const group = state.groups.find((g) => g.id === groupeId);
            const numbers = group
              ? groupTableNumbers(state, group.tableIds)
              : [...new Set(orders.map((o) => tableNumbersById.get(o.tableId) ?? 0))];
            return (
              <OrderGroupCard
                key={groupeId}
                orders={orders}
                title={`Tables ${numbers.join(" + ")}`}
                tableNumbersById={tableNumbersById}
              />
            );
          })}
          {singles.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              tableNo={tableNumbersById.get(order.tableId) ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
