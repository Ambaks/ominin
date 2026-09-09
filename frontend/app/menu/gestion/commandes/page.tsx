"use client";

import { useCallback, useEffect, useState } from "react";
import { CreateOrderFab } from "@/components/gestion/commandes/create-order-fab";
import { EncaisserCard } from "@/components/gestion/commandes/encaisser-card";
import { OrderCard } from "@/components/gestion/commandes/order-card";
import { ServirCard } from "@/components/gestion/commandes/servir-card";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { PushPrompt } from "@/components/gestion/push-prompt";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useToast } from "@/components/ui/toast";
import { ORDER_TAB_LABELS, ORDER_TABS } from "@/lib/gestion/constants";
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
import type { Order, OrderTab } from "@/lib/gestion/types";
import { usePrinterOffline } from "@/lib/gestion/use-printer-health";

/*
 * Les moments du service, tels que ce restaurant les vit. Lesquels
 * s'affichent et dans quel ordre vient d'Ominin (`orderTabs`) : le BOHO
 * encaisse puis imprime, il n'a que l'addition et l'historique ; une brasserie
 * qui sert avant d'encaisser met « À servir » en tête. Les commandes collect,
 * payées en ligne, se suivent depuis À servir avec leurs propres étapes.
 *
 * Un filet reste en place quoi qu'on règle : si une commande attend d'être
 * servie faute de ticket sorti, l'onglet « À servir » se rajoute au bout — la
 * salle ne doit jamais perdre de vue une assiette parce qu'un boîtier est
 * tombé.
 */
const EMPTY_BODIES: Record<OrderTab, string> = {
  a_encaisser:
    "Les commandes passées depuis le menu QR ou prises en salle apparaîtront ici, article par article.",
  a_servir:
    "Les commandes encaissées, parties en cuisine, apparaîtront ici jusqu'à leur service.",
  historique: "Les commandes servies, retirées ou annulées apparaîtront ici.",
};

function matchesFilter(order: Order, filter: OrderTab): boolean {
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
  const [chosenFilter, setChosenFilter] = useState<OrderTab | null>(null);
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

  const isCuisinier = state?.role === "cuisinier";
  // Le filet : une assiette qui attend sans que son ticket soit sorti, ou un
  // boîtier tombé, rajoutent « À servir » même si le réglage l'exclut.
  const serviceNet =
    !(state?.orderTabs ?? ORDER_TABS).includes("a_servir") &&
    (printerOffline ||
      (state?.orders.some((order) => awaitsService(order)) ?? false));
  const wanted = state?.orderTabs ?? ORDER_TABS;
  const tabs = (serviceNet ? [...wanted, "a_servir" as OrderTab] : wanted)
    // La cuisine n'encaisse pas : son onglet d'addition n'a pas de sens.
    .filter((tab) => tab !== "a_encaisser" || !isCuisinier);
  // Un restaurant peut n'avoir gardé que l'addition ; la cuisine se retrouve
  // alors sans onglet, et l'historique tient lieu de repli.
  const shown: OrderTab[] = tabs.length > 0 ? tabs : ["historique"];
  // L'onglet retenu peut disparaître sous les pieds (le filet qui se retire) :
  // on retombe alors sur le premier de ce restaurant.
  const filter = chosenFilter && shown.includes(chosenFilter)
    ? chosenFilter
    : shown[0];

  useEffect(() => {
    if (filter !== "historique" || historyLoaded || loadingHistory) return;
    // Faux positif : le drapeau de chargement accompagne un appel réseau,
    // ce n'est pas un état dérivé du rendu.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHistory(null);
  }, [filter, historyLoaded, loadingHistory, loadHistory]);

  if (!state) return null;
  if (!hasFeature("commandes")) return <FeatureLocked feature="commandes" />;

  const isServeur = state.role === "serveur";
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

      {shown.length > 1 && (
        <PillTabs
          tabs={shown.map((id) => ({
            id,
            label: ORDER_TAB_LABELS[id],
            // L'historique est borné/paginé : pas de total fiable à afficher.
            count:
              id === "historique"
                ? undefined
                : state.orders.filter((order) => matchesFilter(order, id))
                    .length,
          }))}
          activeId={filter}
          onSelect={(id) => setChosenFilter(id as OrderTab)}
        />
      )}

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
      {!isCuisinier && hasFeature("prise_commande") && (
        <CreateOrderFab state={state} />
      )}
    </div>
  );
}
