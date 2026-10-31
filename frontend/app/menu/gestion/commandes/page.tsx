"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { CounterCard } from "@/components/gestion/commandes/counter-card";
import { CreateOrderFab } from "@/components/gestion/commandes/create-order-fab";
import { EncaisserCard } from "@/components/gestion/commandes/encaisser-card";
import { ExampleOrder } from "@/components/gestion/commandes/example-order";
import {
  FermeturesBar,
  FermeturesStatut,
} from "@/components/gestion/commandes/fermetures-bar";
import { OrderCard } from "@/components/gestion/commandes/order-card";
import { ServirCard } from "@/components/gestion/commandes/servir-card";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { PrinterIcon } from "@/components/gestion/icons";
import { PushPrompt } from "@/components/gestion/push-prompt";
import {
  Chip,
  EmptyState,
  ErrorNotice,
  Field,
  GlassButton,
  Input,
  Notice,
  SectionHeading,
  Segmented,
  Shimmer,
} from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { ENCAISSER_WAIT_ALERT_SLUGS, ORDER_TABS, ORDER_TAB_HINTS, WAIT_TICK_MS } from "@/lib/gestion/constants";
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
import type { GestionState, Order, OrderTab } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";
import { counterWords } from "@/lib/menu/format";
import { usePrinterOffline } from "@/lib/gestion/use-printer-health";
import { describeError } from "@/lib/gestion/errors";

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

/** Ce que chaque étape contient, sous les onglets, dans les mots du mode de service. */
const COMPTOIR_HINTS: Record<OrderTab, string> = {
  a_encaisser: "Les commandes à régler au comptoir, article par article.",
  a_servir: "Les commandes payées, par numéro, de la préparation à la remise au comptoir.",
  historique: "Les commandes remises, retirées ou annulées.",
};
const EMPORTER_HINTS: Record<OrderTab, string> = {
  ...ORDER_TAB_HINTS,
  a_servir: "Les commandes du jour payées en ligne, de la préparation au retrait.",
  historique: "Les commandes retirées ou annulées.",
};

const EMPTY_BODIES: Record<OrderTab, string> = {
  a_encaisser: "Une commande passée depuis la table arrive ici, comme celles que vous saisissez.",
  a_servir: "Les commandes encaissées, parties en cuisine, apparaîtront ici jusqu’à leur service.",
  historique: "Les commandes servies, retirées ou annulées apparaîtront ici.",
};

/**
 * L'état vide de l'addition dit la règle de ce restaurant (§ 3.8) : la
 * plupart encaissent avant d'envoyer en cuisine ; ceux qui servent d'abord
 * mettent « À servir » devant « À encaisser » ; au comptoir, elle part en
 * préparation.
 */
function emptyEncaisser(state: GestionState, fastFood: boolean): string {
  const tabs = state.orderTabs;
  const servesFirst =
    tabs.includes("a_servir") &&
    tabs.includes("a_encaisser") &&
    tabs.indexOf("a_servir") < tabs.indexOf("a_encaisser");
  if (fastFood) {
    return `Une commande saisie au comptoir arrive ici. Encaissez-la : elle part ${counterWords(state.etablissement.barPickup).preparation}.`;
  }
  return `${EMPTY_BODIES.a_encaisser} ${
    servesFirst ? "Elle part en cuisine aussitôt : encaissez-la après le repas." : "Encaissez-la : elle part en cuisine."
  }`;
}

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

/** Un bloc de la page, qui monte à son rang à l'arrivée ; monté plus tard (un avis qui tombe), il apparaît sans mouvement. */
function Block({ i, className = "", children }: { i?: number; className?: string; children: React.ReactNode }) {
  const [rise] = useState(i);
  return (
    <div className={`${rise === undefined ? "" : "g-rise"} ${className}`} style={rise === undefined ? undefined : ({ "--g-i": rise } as CSSProperties)}>
      {children}
    </div>
  );
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
  const [historyError, setHistoryError] = useState<unknown>(null);
  // L'onglet déjà posé : une seule orchestration d'entrée à l'arrivée, puis
  // une carte qui arrive seule monte sans délai, et un changement d'onglet
  // n'anime rien (surface à haute fréquence).
  const [settled, setSettled] = useState<OrderTab | null>(null);
  // Les commandes arrivées en direct dans l'onglet ouvert : leur carte joue
  // l'onde une fois. Ni au chargement, ni pour une saisie de cet appareil.
  const [arrived, setArrived] = useState<ReadonlySet<string>>(new Set());
  const knownOrders = useRef<Set<string> | null>(null);
  const ownEntry = useRef(false);
  const [tableQuery, setTableQuery] = useState("");
  const [historyTable, setHistoryTable] = useState<{
    number: number;
    id: string | null;
  } | null>(null);
  // Comptoir : l'historique se filtre par numéro du jour, sur les pages chargées.
  const [historyNumber, setHistoryNumber] = useState<number | null>(null);
  const [example, setExample] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadHistory = useCallback(
    async (before: string | null) => {
      setLoadingHistory(true);
      setHistoryError(null);
      try {
        const page = await fetchOrderHistory(before);
        setHistory((current) =>
          before ? [...current, ...page.orders] : page.orders
        );
        setCursor(page.nextCursor);
      } catch (error) {
        setHistoryError(error);
        // Un geste (« Voir plus ») prévient par un toast ; le premier chargement s'affiche en bandeau.
        if (before) toast.error(describeError(error).message);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettled(filter);
  }, [filter]);

  const orders = state?.orders;
  useEffect(() => {
    if (!orders) return;
    const previous = knownOrders.current;
    knownOrders.current = new Set(orders.map((order) => order.id));
    if (!previous || ownEntry.current) return;
    const fresh = orders.filter((order) => !previous.has(order.id) && matchesFilter(order, filter));
    if (fresh.length === 0) return;
    setArrived((current) => new Set([...current, ...fresh.map((order) => order.id)]));
  }, [orders, filter]);

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
  const hints = fastFood ? COMPTOIR_HINTS : pickupShop ? EMPORTER_HINTS : ORDER_TAB_HINTS;
  const tableNumbersById = new Map(
    state.tables.map((table) => [table.id, table.number])
  );
  const showTable = state.etablissement.showTableNumber;
  const encaisserNow = ENCAISSER_WAIT_ALERT_SLUGS.includes(state.etablissement.slug) ? now : undefined;
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
      ? historyOrders
          .filter((order) => historyNumber === null || order.orderNumber === historyNumber)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
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
  // Rang des cartes : étagées à l'arrivée, seules et sans délai ensuite, aucun mouvement au changement d'onglet.
  const rank = settled === null ? 3 : settled === filter ? 0 : undefined;
  // Les blocs de tête : à l'arrivée seulement ; un avis qui tombe en plein service apparaît sans mouvement.
  const entering = settled === null;
  const isNew = (list: Order[]) => list.some((order) => arrived.has(order.id));

  const searchTable = () => {
    const raw = tableQuery.trim();
    if (!/^\d+$/.test(raw)) return;
    const number = Number(raw);
    if (fastFood) {
      setHistoryNumber(number);
      return;
    }
    const table = state.tables.find((candidate) => candidate.number === number);
    setHistoryTable({ number, id: table?.id ?? null });
  };
  const clearSearch = () => {
    setTableQuery("");
    setHistoryTable(null);
    setHistoryNumber(null);
  };

  const canCreate = !isCuisinier && hasFeature("prise_commande");
  // La commande d'exemple : un restaurant à table, sur l'addition, sans rien à encaisser.
  const canExample = canCreate && !fastFood && !pickupShop && filter === "a_encaisser";
  const emptyBody =
    filter === "historique" && historyTable
      ? `Aucune commande sur la table ${historyTable.number} depuis le début du service.`
      : filter === "historique" && historyNumber !== null
        ? `Aucune commande n° ${historyNumber} parmi celles chargées : « Voir plus » remonte plus loin.`
      : fastFood && filter === "a_servir"
        ? "Les commandes payées apparaîtront ici par numéro, de la préparation à la remise au comptoir."
        : pickupShop && filter === "a_servir"
          ? "Les commandes du jour payées en ligne apparaîtront ici, de la préparation au retrait."
          : filter === "a_encaisser" && !fastFood && !pickupShop
            ? emptyEncaisser(state, false)
            : filter === "a_encaisser" && fastFood
              ? emptyEncaisser(state, true)
              : EMPTY_BODIES[filter];
  // L'état vide écrit « Nouvelle commande », et l'exemple ne doit pas se cacher derrière : le flottant reste rond.
  const emptyHasButton = visible.length === 0 && canCreate && filter !== "historique";

  return (
    <div className={`flex flex-col gap-5 ${canCreate ? "pb-[calc(var(--g-fab)+var(--g-gap))]" : ""}`}>
      <Block i={0}>
        <SectionHeading
          level={1}
          title="Commandes"
          sub={
            isServeur
              ? pickupShop
                ? "Le comptoir, en direct."
                : "La salle, en direct."
              : isCuisinier
                ? pickupShop
                  ? "Ce qui part en préparation, en direct. Vos tickets sortent sur l’imprimante."
                  : "Ce qui est parti en cuisine, en direct. Vos tickets sortent sur l’imprimante."
                : undefined
          }
          right={
            live !== null ? (
              <span data-visite="commandes-direct" className="g-orders flex rounded-full">
                <Chip
                  tone={live ? "neutral" : "problem"}
                  icon={
                    <svg viewBox="0 0 24 24" aria-hidden>
                      <circle cx="12" cy="12" r="5" fill="currentColor" />
                    </svg>
                  }
                >
                  {live ? "En direct" : "Reconnexion…"}
                </Chip>
              </span>
            ) : undefined
          }
        />
      </Block>

      {(state.closures.length > 0 || printerOffline) && (
        <div className="flex flex-col gap-3">
          {state.closures.length > 0 &&
            (can("fermetures.basculer") ? (
              <FermeturesBar
                closures={state.closures}
                categories={state.categories}
                dayEndHour={state.dayEndHour}
                i={entering ? 1 : undefined}
              />
            ) : (
              <FermeturesStatut
                closures={state.closures}
                categories={state.categories}
                dayEndHour={state.dayEndHour}
                i={entering ? 1 : undefined}
              />
            ))}
          {printerOffline && (
            <Notice
              i={entering ? 1 : undefined}
              icon={<PrinterIcon />}
              title="Boîtier Omilink hors ligne"
              text={`Les tickets ${pickupShop ? "de préparation" : "cuisine"} ne sortent pas. Suivez les commandes dans « ${tabLabel("a_servir")} » en attendant.`}
            />
          )}
        </div>
      )}

      <PushPrompt />

      <div className="flex flex-col gap-2">
        {shown.length > 1 && (
          <div data-visite="commandes-etapes" className="no-scrollbar -mx-1 flex w-fit max-w-[calc(100%+0.5rem)] overflow-x-auto rounded-full p-1">
            <Segmented
              label="Étape du service"
              options={shown.map((id) => {
                // L'historique est borné/paginé : pas de total fiable à afficher.
                const count =
                  id === "historique"
                    ? 0
                    : cardCount(state.orders.filter((order) => matchesFilter(order, id)));
                return { value: id, label: count > 0 ? `${tabLabel(id)}\u00a0${count}` : tabLabel(id) };
              })}
              value={filter}
              onChange={setChosenFilter}
              i={entering ? 2 : undefined}
            />
          </div>
        )}
        <Block i={2}>
          <p className="text-g-meta text-muted">{hints[filter]}</p>
        </Block>
      </div>

      {filter === "historique" && !pickupShop && (
        <form
          className="flex max-w-md flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            searchTable();
          }}
        >
          <Field label={fastFood ? "Numéro de commande" : "Numéro de table"} className="min-w-44 flex-1">
            <Input
              inputMode="numeric"
              value={tableQuery}
              onChange={(event) => setTableQuery(event.target.value.replace(/\D/g, ""))}
              placeholder="12"
            />
          </Field>
          <GlassButton variant="primary" type="submit" disabled={!tableQuery.trim()}>
            Rechercher
          </GlassButton>
          {(historyTable || historyNumber !== null) && <GlassButton onClick={clearSearch}>Tout afficher</GlassButton>}
        </form>
      )}

      {visible.length === 0 ? (
        filter === "historique" && !historyTable && !historyLoaded ? (
          <div aria-busy className="flex flex-col gap-3">
            <Shimmer className="h-28" />
            <Shimmer className="h-28" />
          </div>
        ) : filter === "historique" && historyError !== null && history.length === 0 ? (
          <ErrorNotice error={historyError} onRetry={() => void loadHistory(null)} />
        ) : example && canExample ? (
          <Block i={rank}>
            <ExampleOrder now={now} onClose={() => setExample(false)} />
          </Block>
        ) : (
          <Block i={rank}>
            <EmptyState
              text={emptyBody}
              action={
                canCreate && filter !== "historique" ? (
                  <span className="flex flex-wrap justify-center gap-2 sm:justify-end">
                    {canExample && (
                      <GlassButton onClick={() => setExample(true)}>Voir une commande d’exemple</GlassButton>
                    )}
                    <GlassButton variant="primary" onClick={() => setCreating(true)}>
                      Nouvelle commande
                    </GlassButton>
                  </span>
                ) : undefined
              }
            />
          </Block>
        )
      ) : (
        <div
          className="flex flex-col gap-4"
          onAnimationEnd={(event) => {
            if (event.animationName === "g-ready") setArrived(new Set());
          }}
        >
          {[...byTable.entries()].map(([tableId, orders]) =>
            filter === "a_encaisser" ? (
              <EncaisserCard
                key={tableId}
                orders={orders}
                title={`Table ${tableNumbersById.get(tableId) ?? 0}`}
                i={rank}
                ready={isNew(orders)}
                now={encaisserNow}
              />
            ) : (
              <ServirCard
                key={tableId}
                orders={orders}
                title={`Table ${tableNumbersById.get(tableId) ?? 0}`}
                now={now}
                readOnly={isCuisinier}
                i={rank}
                ready={isNew(orders)}
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
                  i={rank}
                  ready={arrived.has(order.id)}
                  now={encaisserNow}
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
                      i={rank}
                      ready={arrived.has(order.id)}
                    />
                  ))}
                </div>
              )}
          {singles.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              place={placeLabel(order, state.tables, showTable)}
              pickupShop={pickupShop}
              i={rank}
              ready={arrived.has(order.id)}
            />
          ))}
        </div>
      )}

      {filter === "historique" &&
        !historyTable &&
        historyLoaded &&
        cursor !== null && (
          <div className="flex justify-center">
            <GlassButton onClick={() => void loadHistory(cursor ?? null)} disabled={loadingHistory}>
              {loadingHistory ? "Chargement…" : "Voir plus"}
            </GlassButton>
          </div>
        )}

      {/* Prise de commande en salle : le client commande au serveur. */}
      {canCreate && (
        <CreateOrderFab
          state={state}
          quiet={emptyHasButton}
          open={creating}
          onOpen={() => setCreating(true)}
          onClose={() => setCreating(false)}
          onEntry={(sending) => {
            ownEntry.current = sending;
          }}
        />
      )}
    </div>
  );
}
