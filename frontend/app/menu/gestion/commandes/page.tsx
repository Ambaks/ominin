"use client";

import { useCallback, useEffect, useState } from "react";
import { CounterCard } from "@/components/gestion/commandes/counter-card";
import { CreateOrderFab } from "@/components/gestion/commandes/create-order-fab";
import { EncaisserCard } from "@/components/gestion/commandes/encaisser-card";
import {
  FermeturesBar,
  FermeturesStatut,
} from "@/components/gestion/commandes/fermetures-bar";
import { OrderCard } from "@/components/gestion/commandes/order-card";
import { ServirCard } from "@/components/gestion/commandes/servir-card";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { PushPrompt } from "@/components/gestion/push-prompt";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useToast } from "@/components/ui/toast";
import { ORDER_TABS, WAIT_TICK_MS } from "@/lib/gestion/constants";
import {
  awaitsPayment,
  awaitsService,
  cardCount,
  earlierNumberingDay,
  isHistoryStatus,
  isPickupShop,
  isServiceToday,
  orderTabLabel,
  orderTabsShown,
  placeLabel,
} from "@/lib/gestion/selectors";
import {
  fetchOrderHistory,
  useGestion,
  useGestionAccess,
  useRealtimeLive,
} from "@/lib/gestion/store";
import type { Order, OrderTab } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";
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
    "Les commandes à encaisser apparaîtront ici, article par article : celles du menu QR comme celles prises par l'équipe.",
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
  const { can, hasFeature } = useGestionAccess();
  const live = useRealtimeLive();
  const now = useNow(WAIT_TICK_MS);
  const printerOffline = usePrinterOffline(state?.etablissement.id ?? "");
  const toast = useToast();
  // Onglet choisi ; avant tout choix, celui du rôle (la cuisine n'encaisse pas).
  const [chosenFilter, setChosenFilter] = useState<OrderTab | null>(null);
  // L'historique s'affiche par pages de ORDER_HISTORY_PAGE_SIZE, chargées à la
  // demande : en rendre d'un coup les semaines que l'état contient figeait
  // l'onglet. Curseur : undefined tant qu'aucune page n'est arrivée, null
  // une fois tout chargé.
  const [history, setHistory] = useState<Order[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [tableQuery, setTableQuery] = useState("");
  const [historyTable, setHistoryTable] = useState<{
    number: number;
    id: string | null;
  } | null>(null);

  const loadHistory = useCallback(
    async (before: string | null) => {
      setLoadingHistory(true);
      try {
        const page = await fetchOrderHistory(before);
        setHistory((current) =>
          before ? [...current, ...page.orders] : page.orders
        );
        setCursor(page.nextCursor);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Une erreur est survenue."
        );
      } finally {
        setHistoryLoaded(true);
        setLoadingHistory(false);
      }
    },
    [toast]
  );

  const isCuisinier = state?.role === "cuisinier";
  const fastFood = state?.etablissement.serviceMode === "fast_food";
  const shown = state ? orderTabsShown(state, printerOffline) : ORDER_TABS;
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
  // Boutique à emporter seule : ni salle ni tables, un comptoir et un laboratoire.
  const pickupShop = isPickupShop(state);
  const tabLabel = (tab: OrderTab) => orderTabLabel(state, tab);
  const tableNumbersById = new Map(
    state.tables.map((table) => [table.id, table.number])
  );
  const showTable = state.etablissement.showTableNumber;
  const closedOrders = state.orders.filter((order) =>
    isHistoryStatus(order.status)
  );
  // Onglet Historique. Une table se cherche dans le service du jour, que
  // l'état contient en entier. Sinon, les pages chargées, que l'état tient à
  // jour en direct (commandes closes depuis, statuts changés) dans la plage
  // qu'elles couvrent.
  const historyOrders = historyTable
    ? closedOrders.filter(
        (order) =>
          historyTable.id !== null &&
          order.tableId === historyTable.id &&
          isServiceToday(order.createdAt, state.dayEndHour)
      )
    : cursor === undefined
      ? history
      : dedupeById([
          ...history,
          ...closedOrders.filter(
            (order) => cursor === null || order.createdAt >= cursor
          ),
        ]);
  const visible =
    filter === "historique"
      ? [...historyOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : state.orders
          .filter((order) => matchesFilter(order, filter))
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  // Une carte par table pour l'addition et le service ; les commandes collect
  // et l'historique restent des cartes individuelles. Une commande fast food
  // a son addition à elle, et sa place dans la file du comptoir — même passée
  // depuis le QR d'une table.
  const byTable = new Map<string, Order[]>();
  const numbered: Order[] = [];
  const singles: Order[] = [];
  for (const order of visible) {
    if (filter !== "historique" && order.orderNumber !== undefined) {
      numbered.push(order);
    } else if (filter !== "historique" && order.type === "sur_place" && order.tableId) {
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
            <p className="mt-1 text-sm text-muted">
              {pickupShop ? "Le comptoir, en direct." : "La salle, en direct."}
            </p>
          )}
          {isCuisinier && (
            <p className="mt-1 text-sm text-muted">
              {pickupShop
                ? "Ce qui part en préparation, en direct."
                : "Ce qui est parti en cuisine, en direct."}
            </p>
          )}
        </div>
        {live !== null && (
          <span
            data-visite="commandes-direct"
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

      {state.closures.length > 0 &&
        (can("fermetures.basculer") ? (
          <FermeturesBar
            closures={state.closures}
            categories={state.categories}
            dayEndHour={state.dayEndHour}
          />
        ) : (
          <FermeturesStatut
            closures={state.closures}
            categories={state.categories}
            dayEndHour={state.dayEndHour}
          />
        ))}

      {printerOffline && (
        <p
          role="alert"
          className="rounded-2xl border border-ember-3/40 bg-ember-3/10 px-4 py-3 text-sm leading-relaxed"
        >
          <strong>Boîtier Omilink hors ligne</strong> — les tickets{" "}
          {pickupShop ? "de préparation" : "cuisine"} ne sortent pas. Suivez les
          commandes dans « {tabLabel("a_servir")} » en attendant.
        </p>
      )}

      <PushPrompt />

      {shown.length > 1 && (
        <PillTabs
          visite="commandes-etapes"
          tabs={shown.map((id) => ({
            id,
            label: tabLabel(id),
            // L'historique est borné/paginé : pas de total fiable à afficher.
            count:
              id === "historique"
                ? undefined
                : cardCount(
                    state.orders.filter((order) => matchesFilter(order, id))
                  ),
          }))}
          activeId={filter}
          onSelect={(id) => setChosenFilter(id as OrderTab)}
        />
      )}

      {filter === "historique" && !fastFood && !pickupShop && (
        <form
          className="flex max-w-md flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const raw = tableQuery.trim();
            if (!/^\d+$/.test(raw)) return;
            const number = Number(raw);
            const table = state.tables.find(
              (candidate) => candidate.number === number
            );
            setHistoryTable({ number, id: table?.id ?? null });
          }}
        >
          <label className="min-w-44 flex-1">
            <span className="sr-only">Rechercher un numéro de table</span>
            <input
              type="text"
              inputMode="numeric"
              value={tableQuery}
              onChange={(event) =>
                setTableQuery(event.target.value.replace(/\D/g, ""))
              }
              placeholder="Numéro de table"
              className="w-full rounded-xl border border-hairline bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-ember-2/60"
            />
          </label>
          <button
            type="submit"
            disabled={!tableQuery.trim()}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
          >
            Rechercher
          </button>
          {historyTable && (
            <button
              type="button"
              onClick={() => {
                setTableQuery("");
                setHistoryTable(null);
              }}
              className="rounded-full border border-hairline px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
            >
              Tout afficher
            </button>
          )}
        </form>
      )}

      {visible.length === 0 ? (
        filter === "historique" && !historyTable && !historyLoaded ? (
          <div aria-busy className="flex flex-col gap-3">
            <div className="shimmer h-24 rounded-2xl" />
            <div className="shimmer h-24 rounded-2xl" />
          </div>
        ) : (
          <EmptyState
            title="Aucune commande"
            body={
              filter === "historique" && historyTable
                ? `Aucune commande sur la table ${historyTable.number} depuis le début du service.`
                : fastFood && filter === "a_servir"
                  ? "Les commandes payées apparaîtront ici par numéro, de la préparation à la remise au comptoir."
                  : pickupShop && filter === "a_servir"
                    ? "Les commandes du jour payées en ligne apparaîtront ici, de la préparation au retrait."
                    : EMPTY_BODIES[filter]
            }
          />
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
                now={now}
                readOnly={isCuisinier}
              />
            )
          )}
          {filter === "a_encaisser"
            ? numbered.map((order) => (
                <EncaisserCard
                  key={order.id}
                  orders={[order]}
                  title={[
                    placeLabel(order, state.tables, showTable),
                    earlierNumberingDay(order, state.orderNumberResetHour),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              ))
            : numbered.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {numbered.map((order) => (
                    <CounterCard
                      key={order.id}
                      order={order}
                      now={now}
                      resetHour={state.orderNumberResetHour}
                      table={
                        showTable && order.tableId
                          ? tableNumbersById.get(order.tableId)
                          : undefined
                      }
                      readOnly={isCuisinier}
                    />
                  ))}
                </div>
              )}
          {singles.map((order) =>
            isServeur ? (
              <div key={order.id} className="order-pop">
                <OrderCard order={order} place={placeLabel(order, state.tables, showTable)} pickupShop={pickupShop} />
              </div>
            ) : (
              <OrderCard
                key={order.id}
                order={order}
                place={placeLabel(order, state.tables, showTable)}
                pickupShop={pickupShop}
              />
            )
          )}
        </div>
      )}

      {filter === "historique" &&
        !historyTable &&
        historyLoaded &&
        cursor !== null && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => void loadHistory(cursor ?? null)}
              disabled={loadingHistory}
              className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-60"
            >
              {loadingHistory ? "Chargement…" : "Voir plus"}
            </button>
          </div>
        )}

      {/* Prise de commande en salle : le client commande au serveur. */}
      {!isCuisinier && hasFeature("prise_commande") && (
        <CreateOrderFab state={state} />
      )}
    </div>
  );
}
