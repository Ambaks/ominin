"use client";

import { useCallback, useState } from "react";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { OrderCard } from "@/components/gestion/commandes/order-card";
import { OrderGroupCard } from "@/components/gestion/commandes/order-group-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useToast } from "@/components/ui/toast";
import {
  groupTableNumbers,
  isHistoryStatus,
} from "@/lib/gestion/selectors";
import {
  fetchOrderHistory,
  useGestion,
  useGestionAccess,
} from "@/lib/gestion/store";
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

function dedupeById(orders: Order[]): Order[] {
  const byId = new Map<string, Order>();
  for (const order of orders) byId.set(order.id, order);
  return [...byId.values()];
}

export default function CommandesPage() {
  const state = useGestion();
  const { hasFeature } = useGestionAccess();
  const toast = useToast();
  const [filter, setFilter] = useState<FilterId>("toutes");
  // L'historique n'est pas dans le fetch initial borné : il se charge à la
  // demande, page par page, quand l'onglet Historique est ouvert.
  const [history, setHistory] = useState<Order[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = useCallback(
    async (before: string | null) => {
      setLoadingHistory(true);
      try {
        const page = await fetchOrderHistory(before);
        setHistory((current) =>
          before ? [...current, ...page.orders] : page.orders
        );
        setCursor(page.nextCursor);
        setHistoryLoaded(true);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Une erreur est survenue."
        );
      } finally {
        setLoadingHistory(false);
      }
    },
    [toast]
  );

  const selectFilter = (id: FilterId) => {
    setFilter(id);
    if (id === "historique" && !historyLoaded && !loadingHistory) {
      void loadHistory(null);
    }
  };

  if (!state) return null;
  if (!hasFeature("commandes")) return <FeatureLocked />;

  // Onglet Historique : les commandes clôturées du jour (déjà dans l'état) sont
  // fusionnées avec les pages plus anciennes chargées à la demande.
  const visible =
    filter === "historique"
      ? dedupeById([
          ...state.orders.filter((order) => isHistoryStatus(order.status)),
          ...history,
        ]).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : state.orders
          .filter((order) => matchesFilter(order, filter))
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

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
          // L'historique est borné/paginé : pas de total fiable à afficher.
          count:
            id === "historique"
              ? undefined
              : state.orders.filter((order) => matchesFilter(order, id)).length,
        }))}
        activeId={filter}
        onSelect={(id) => selectFilter(id as FilterId)}
      />

      {visible.length === 0 ? (
        filter === "historique" && !historyLoaded ? (
          <div aria-busy className="flex flex-col gap-3">
            <div className="shimmer h-24 rounded-2xl" />
            <div className="shimmer h-24 rounded-2xl" />
          </div>
        ) : (
          <EmptyState
            title="Aucune commande"
            body={
              filter === "historique"
                ? "Les commandes payées, retirées ou annulées apparaîtront ici."
                : "Les commandes passées depuis le menu QR ou le click & collect apparaîtront ici en temps réel."
            }
          />
        )
      ) : (
        <div className="flex flex-col gap-4">
          {[...grouped.entries()].map(([groupeId, orders]) => {
            const group = state.groups.find((g) => g.id === groupeId);
            const numbers = group
              ? groupTableNumbers(state, group.tableIds)
              : [...new Set(orders.map((o) => tableNumbersById.get(o.tableId!) ?? 0))];
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
              tableNo={order.tableId ? (tableNumbersById.get(order.tableId) ?? 0) : 0}
            />
          ))}
          {filter === "historique" && cursor && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => void loadHistory(cursor)}
                disabled={loadingHistory}
                className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-60"
              >
                {loadingHistory ? "Chargement…" : "Charger plus"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
