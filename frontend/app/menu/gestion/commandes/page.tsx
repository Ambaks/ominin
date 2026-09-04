"use client";

import { useCallback, useState } from "react";
import { CreateOrderFab } from "@/components/gestion/commandes/create-order-fab";
import { EncaisserCard } from "@/components/gestion/commandes/encaisser-card";
import { OrderCard } from "@/components/gestion/commandes/order-card";
import { ServirCard } from "@/components/gestion/commandes/servir-card";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { PushPrompt } from "@/components/gestion/push-prompt";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useToast } from "@/components/ui/toast";
import {
  awaitsPayment,
  awaitsService,
  isHistoryStatus,
} from "@/lib/gestion/selectors";
import {
  fetchOrderHistory,
  useGestion,
  useGestionAccess,
  useRealtimeLive,
} from "@/lib/gestion/store";
import type { Order } from "@/lib/gestion/types";
import { usePrinterOffline } from "@/lib/gestion/use-printer-health";

/*
 * La salle ne connaît que trois moments : les additions à encaisser (la
 * commande part en cuisine une fois réglée), les tables à servir, puis
 * l'historique. Les commandes collect, payées en ligne, se suivent depuis
 * À servir avec leurs propres étapes. La cuisine, qui travaille sur les
 * tickets imprimés, retrouve ici en lecture seule ce qui est parti chez elle
 * — le filet quand l'imprimante fait défaut.
 */
const FILTERS = [
  { id: "a_encaisser", label: "À encaisser" },
  { id: "a_servir", label: "À servir" },
  { id: "historique", label: "Historique" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const EMPTY_BODIES: Record<FilterId, string> = {
  a_encaisser:
    "Les commandes passées depuis le menu QR ou prises en salle apparaîtront ici, article par article.",
  a_servir:
    "Les commandes encaissées, parties en cuisine, apparaîtront ici jusqu'à leur service.",
  historique: "Les commandes servies, retirées ou annulées apparaîtront ici.",
};

function matchesFilter(order: Order, filter: FilterId): boolean {
  if (filter === "a_encaisser") return awaitsPayment(order);
  if (filter === "a_servir") return awaitsService(order);
  return isHistoryStatus(order.status);
}

function dedupeById(orders: Order[]): Order[] {
  const byId = new Map<string, Order>();
  for (const order of orders) byId.set(order.id, order);
  return [...byId.values()];
}

export default function CommandesPage() {
  const state = useGestion();
  const { hasFeature } = useGestionAccess();
  const live = useRealtimeLive();
  const printerOffline = usePrinterOffline(state?.etablissement.id ?? "");
  const toast = useToast();
  // Onglet choisi ; avant tout choix, celui du rôle (la cuisine n'encaisse pas).
  const [chosenFilter, setChosenFilter] = useState<FilterId | null>(null);
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
    setChosenFilter(id);
    if (id === "historique" && !historyLoaded && !loadingHistory) {
      void loadHistory(null);
    }
  };

  if (!state) return null;
  if (!hasFeature("commandes")) return <FeatureLocked />;

  const isServeur = state.role === "serveur";
  const isCuisinier = state.role === "cuisinier";
  const tabs = isCuisinier
    ? FILTERS.filter((tab) => tab.id !== "a_encaisser")
    : FILTERS;
  const filter = chosenFilter ?? (isCuisinier ? "a_servir" : "a_encaisser");
  const tableNumbersById = new Map(
    state.tables.map((table) => [table.id, table.number])
  );
  const tableNo = (order: Order) =>
    order.tableId ? (tableNumbersById.get(order.tableId) ?? 0) : 0;

  // Onglet Historique : les commandes closes du jour (déjà dans l'état) sont
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

  // Une carte par table pour l'addition et le service ; les commandes collect
  // et l'historique restent des cartes individuelles.
  const byTable = new Map<string, Order[]>();
  const singles: Order[] = [];
  for (const order of visible) {
    if (filter !== "historique" && order.type === "sur_place" && order.tableId) {
      const list = byTable.get(order.tableId) ?? [];
      list.push(order);
      byTable.set(order.tableId, list);
    } else {
      singles.push(order);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
            Commandes
          </h1>
          {isServeur && (
            <p className="mt-1 text-sm text-muted">La salle, en direct.</p>
          )}
          {isCuisinier && (
            <p className="mt-1 text-sm text-muted">
              Ce qui est parti en cuisine, en direct.
            </p>
          )}
        </div>
        {live !== null && (
          <span
            className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${
              live ? "text-muted" : "text-ember-3"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                live ? "animate-pulse bg-ember-2" : "bg-ember-3"
              }`}
              aria-hidden
            />
            {live ? "En direct" : "Reconnexion…"}
          </span>
        )}
      </div>

      {printerOffline && (
        <p
          role="alert"
          className="rounded-2xl border border-ember-3/40 bg-ember-3/10 px-4 py-3 text-sm leading-relaxed"
        >
          <strong>Boîtier Omilink hors ligne</strong> — les tickets cuisine ne
          sortent pas. Suivez les commandes dans « À servir » en attendant.
        </p>
      )}

      <PushPrompt />

      <PillTabs
        tabs={tabs.map(({ id, label }) => ({
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
          <EmptyState title="Aucune commande" body={EMPTY_BODIES[filter]} />
        )
      ) : (
        <div className="flex flex-col gap-4">
          {[...byTable.entries()].map(([tableId, orders]) =>
            filter === "a_encaisser" ? (
              <EncaisserCard
                key={tableId}
                orders={orders}
                title={`Table ${tableNumbersById.get(tableId) ?? 0}`}
              />
            ) : (
              <ServirCard
                key={tableId}
                orders={orders}
                title={`Table ${tableNumbersById.get(tableId) ?? 0}`}
                readOnly={isCuisinier}
              />
            )
          )}
          {singles.map((order) =>
            isServeur ? (
              <div key={order.id} className="order-pop">
                <OrderCard order={order} tableNo={tableNo(order)} />
              </div>
            ) : (
              <OrderCard key={order.id} order={order} tableNo={tableNo(order)} />
            )
          )}
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

      {/* Prise de commande en salle : le client commande au serveur. */}
      {!isCuisinier && <CreateOrderFab state={state} />}
    </div>
  );
}
