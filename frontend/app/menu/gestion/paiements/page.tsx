"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { EditCashDialog } from "@/components/gestion/paiements/edit-cash-dialog";
import { EditIcon, TrashIcon } from "@/components/gestion/icons";
import { StatCard } from "@/components/gestion/apercu/stat-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { PAYMENT_MODE_LABELS } from "@/lib/gestion/constants";
import { formatTime } from "@/lib/gestion/format";
import { cashTotal, isPaidStatus, orderTotal } from "@/lib/gestion/selectors";
import { fetchPaidOrders, useGestion, useGestionAccess } from "@/lib/gestion/store";
import type { GestionState, Order, PaymentMode } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu-data";

const MODE_FILTERS = [
  { id: "tous", label: "Tous" },
  { id: "especes", label: "Espèces" },
  { id: "carte", label: "Carte" },
  { id: "en_ligne", label: "En ligne" },
] as const;

type ModeFilter = (typeof MODE_FILTERS)[number]["id"];

/** Mode affiché : un règlement en ligne (Stripe/SumUp) prime sur la colonne. */
function displayMode(order: Order): PaymentMode | undefined {
  return order.paidOnline ? "en_ligne" : order.paymentMode;
}

/** Une addition mixte se retrouve sous Espèces comme sous Carte. */
function matchesMode(order: Order, filter: ModeFilter): boolean {
  const mode = displayMode(order);
  return (
    mode === filter ||
    (mode === "mixte" && (filter === "especes" || filter === "carte"))
  );
}

function dedupeById(orders: Order[]): Order[] {
  const byId = new Map<string, Order>();
  for (const order of orders) byId.set(order.id, order);
  return [...byId.values()];
}

interface DayGroup {
  key: string;
  label: string;
  orders: Order[];
  total: number;
}

function groupByDay(orders: Order[]): DayGroup[] {
  const days: DayGroup[] = [];
  const index = new Map<string, DayGroup>();
  for (const order of orders) {
    const date = new Date(order.createdAt);
    const key = date.toDateString();
    let day = index.get(key);
    if (!day) {
      day = {
        key,
        label: date.toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
        orders: [],
        total: 0,
      };
      index.set(key, day);
      days.push(day);
    }
    day.orders.push(order);
    day.total += orderTotal(order);
  }
  return days;
}

function PaymentRow({
  order,
  state,
  onEdit,
  onVoid,
}: {
  order: Order;
  state: GestionState;
  onEdit: () => void;
  onVoid: () => void;
}) {
  const isCollect = order.type === "collect";
  const heading = isCollect
    ? order.customerName ?? "Client"
    : `Table ${state.tables.find((t) => t.id === order.tableId)?.number ?? "—"}`;
  const mode = displayMode(order);
  const articleCount = order.items.reduce((sum, line) => sum + line.quantity, 0);
  const editable = order.paymentMode === "especes" && !order.paidOnline;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
      <span className="w-11 shrink-0 text-xs tabular-nums text-faint">
        {formatTime(order.createdAt)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{heading}</p>
          {isCollect && (
            <span className="shrink-0 rounded-full border border-ember-2/30 bg-ember-2/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-2">
              Emporter
            </span>
          )}
        </div>
        <p className="text-xs text-faint">
          {articleCount} article{articleCount > 1 ? "s" : ""}
          {order.cashGiven != null && (
            <>
              {" · "}Reçu {formatPrice(order.cashGiven)}
              {order.cashChange ? ` · Rendu ${formatPrice(order.cashChange)}` : ""}
            </>
          )}
        </p>
      </div>
      {mode && (
        <span className="shrink-0 rounded-full border border-hairline px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
          {PAYMENT_MODE_LABELS[mode]}
        </span>
      )}
      <span className="shrink-0 font-display text-base text-ember-1">
        {formatPrice(orderTotal(order))}
      </span>
      {editable && (
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            title="Modifier le paiement"
            aria-label="Modifier le paiement"
            className="rounded-full border border-hairline p-2 text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
          >
            <EditIcon className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onVoid}
            title="Annuler l'encaissement"
            aria-label="Annuler l'encaissement"
            className="rounded-full border border-hairline p-2 text-muted transition-colors hover:border-ember-3/50 hover:text-ember-3"
          >
            <TrashIcon className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function PaiementsPage() {
  const state = useGestion();
  const { hasFeature } = useGestionAccess();
  const toast = useToast();
  const [filter, setFilter] = useState<ModeFilter>("tous");
  // L'historique complet n'est pas dans le fetch initial borné : pages à la
  // demande, fusionnées avec les commandes du snapshot (fraîches, realtime).
  const [history, setHistory] = useState<Order[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [voiding, setVoiding] = useState<Order | null>(null);
  const loadRequested = useRef(false);

  const loadHistory = useCallback(
    async (before: string | null) => {
      setLoadingHistory(true);
      try {
        const page = await fetchPaidOrders(before);
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

  const ready =
    state != null && state.role === "gerant" && hasFeature("commandes");

  useEffect(() => {
    if (ready && !loadRequested.current) {
      loadRequested.current = true;
      void loadHistory(null);
    }
  }, [ready, loadHistory]);

  if (!state) return null;
  if (!ready) return <FeatureLocked />;

  const paid = dedupeById([
    // Le snapshot en dernier : sa version (realtime) prime sur la page chargée.
    ...history,
    ...state.orders.filter((order) => isPaidStatus(order.status)),
  ]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const visible =
    filter === "tous"
      ? paid
      : paid.filter((order) => matchesMode(order, filter));
  const days = groupByDay(visible);

  const today = new Date().toDateString();
  const todayPaid = paid.filter(
    (order) => new Date(order.createdAt).toDateString() === today
  );
  const todayTotal = todayPaid.reduce((sum, o) => sum + orderTotal(o), 0);
  const todayEspeces = todayPaid.reduce((sum, o) => sum + cashTotal(o), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
          Paiements
        </h1>
        <p className="mt-1 text-sm text-muted">
          Tous les encaissements — espèces, carte et en ligne.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Encaissé aujourd'hui"
          value={formatPrice(todayTotal)}
          hint={`${todayPaid.length} paiement${todayPaid.length > 1 ? "s" : ""}`}
        />
        <StatCard
          label="Espèces"
          value={formatPrice(todayEspeces)}
          hint="Aujourd'hui"
        />
        <StatCard
          label="Carte & en ligne"
          value={formatPrice(todayTotal - todayEspeces)}
          hint="Aujourd'hui"
        />
      </div>

      <PillTabs
        tabs={MODE_FILTERS.map(({ id, label }) => ({ id, label }))}
        activeId={filter}
        onSelect={(id) => setFilter(id as ModeFilter)}
      />

      {visible.length === 0 ? (
        !historyLoaded ? (
          <div aria-busy className="flex flex-col gap-3">
            <div className="shimmer h-24 rounded-2xl" />
            <div className="shimmer h-24 rounded-2xl" />
          </div>
        ) : (
          <EmptyState
            title="Aucun paiement"
            body="Les commandes encaissées apparaîtront ici, quel que soit le mode de règlement."
          />
        )
      ) : (
        <div className="flex flex-col gap-6">
          {days.map((day) => (
            <section key={day.key} className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-display text-lg font-medium capitalize">
                  {day.label}
                </h2>
                <span className="shrink-0 text-sm tabular-nums text-muted">
                  {day.orders.length} paiement{day.orders.length > 1 ? "s" : ""} ·{" "}
                  {formatPrice(day.total)}
                </span>
              </div>
              <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
                {day.orders.map((order) => (
                  <PaymentRow
                    key={order.id}
                    order={order}
                    state={state}
                    onEdit={() => setEditing(order)}
                    onVoid={() => setVoiding(order)}
                  />
                ))}
              </div>
            </section>
          ))}
          {cursor && (
            <div className="flex justify-center">
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

      {editing && (
        <EditCashDialog
          order={editing}
          onClose={() => setEditing(null)}
          onSave={async (cashGiven, cashChange) => {
            const order = editing;
            setEditing(null);
            try {
              const updated = await api.updateCashDetails(
                order.id,
                cashGiven,
                cashChange
              );
              setHistory((current) =>
                current.map((o) => (o.id === updated.id ? updated : o))
              );
              toast.success("Paiement modifié.");
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Une erreur est survenue."
              );
            }
          }}
        />
      )}
      {voiding && (
        <ConfirmDialog
          title="Annuler l'encaissement ?"
          message="Le paiement en espèces sera effacé et la commande passera en annulée. Cette action est définitive."
          confirmLabel="Annuler l'encaissement"
          destructive
          onClose={() => setVoiding(null)}
          onConfirm={async () => {
            const order = voiding;
            setVoiding(null);
            try {
              await api.voidCashPayment(order.id);
              setHistory((current) => current.filter((o) => o.id !== order.id));
              toast.success("Encaissement annulé.");
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Une erreur est survenue."
              );
            }
          }}
        />
      )}
    </div>
  );
}
