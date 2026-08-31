"use client";

import { PushPrompt } from "@/components/gestion/push-prompt";
import { WAIT_TICK_MS } from "@/lib/gestion/constants";
import type { GestionState, Order } from "@/lib/gestion/types";
import { formatWait, minutesSince, useNow } from "@/lib/gestion/use-now";
import { OrderCard } from "./order-card";

/*
 * Le passe du cuisinier : la grammaire visuelle du volet restaurant de la
 * démo Collect (en direct, cartes qui surgissent, bouton qui respire),
 * appliquée au vrai flux — trois files, de la commande qui tombe à
 * l'assiette prête.
 */

const CARD_RISE_STEP_MS = 60;

function Lane({
  title,
  dotClass,
  orders,
  hint,
  emptyBody,
  tableNumbersById,
  pulseOrderId,
}: {
  title: string;
  dotClass: string;
  orders: Order[];
  hint?: string;
  emptyBody: string;
  tableNumbersById: Map<string, number>;
  pulseOrderId?: string;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-2 border-b border-hairline pb-2.5">
        <span
          className={`size-2 shrink-0 rounded-full ${dotClass} ${
            orders.length > 0 ? "animate-pulse" : "opacity-30"
          }`}
          aria-hidden
        />
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em]">
          {title}
        </h2>
        <span className="ml-auto rounded-full bg-surface-raised px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted">
          {orders.length}
        </span>
      </div>
      {hint && <p className="-mt-1 text-xs text-muted">{hint}</p>}
      {orders.length === 0 ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-dashed border-hairline p-5 text-center">
            <p className="text-xs text-faint">{emptyBody}</p>
          </div>
          <div className="shimmer h-16 rounded-2xl border border-hairline" aria-hidden />
        </div>
      ) : (
        orders.map((order, index) => (
          <div
            key={order.id}
            className="order-pop"
            style={{ animationDelay: `${index * CARD_RISE_STEP_MS}ms` }}
          >
            <OrderCard
              order={order}
              tableNo={
                order.tableId ? (tableNumbersById.get(order.tableId) ?? 0) : 0
              }
              pulse={order.id === pulseOrderId}
            />
          </div>
        ))
      )}
    </section>
  );
}

export function KitchenBoard({ state }: { state: GestionState }) {
  const now = useNow(WAIT_TICK_MS);
  const byAge = (a: Order, b: Order) => a.createdAt.localeCompare(b.createdAt);
  const enAttente = state.orders
    .filter((order) => order.status === "en_attente")
    .sort(byAge);
  const enPreparation = state.orders
    .filter((order) => order.status === "en_preparation")
    .sort(byAge);
  const pretes = state.orders
    .filter((order) => order.status === "prete")
    .sort(byAge);
  const tableNumbersById = new Map(
    state.tables.map((table) => [table.id, table.number])
  );
  const oldest = enAttente[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
            Commandes
          </h1>
          <p className="mt-1 text-sm text-muted">La cuisine, en direct.</p>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
          <span className="size-1.5 animate-pulse rounded-full bg-ember-2" aria-hidden />
          En direct
        </span>
      </div>

      <PushPrompt />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Lane
          title="À préparer"
          dotClass="bg-ember-1"
          orders={enAttente}
          hint={
            oldest
              ? `La plus ancienne attend depuis ${formatWait(minutesSince(oldest.createdAt, now))}.`
              : undefined
          }
          emptyBody="En attente de commandes… elles arrivent ici en temps réel."
          tableNumbersById={tableNumbersById}
          pulseOrderId={oldest?.id}
        />
        <Lane
          title="En préparation"
          dotClass="bg-ember-2"
          orders={enPreparation}
          emptyBody="Rien en préparation."
          tableNumbersById={tableNumbersById}
        />
        <Lane
          title="Prêtes"
          dotClass="ember-gradient"
          orders={pretes}
          emptyBody="Rien au passe."
          tableNumbersById={tableNumbersById}
        />
      </div>
    </div>
  );
}
