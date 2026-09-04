"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { PAYMENT_MODE_LABELS } from "@/lib/gestion/constants";
import { formatTime } from "@/lib/gestion/format";
import { lineTotal } from "@/lib/gestion/selectors";
import type {
  EncaissementMode,
  Order,
  OrderItem,
  PaymentMode,
} from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu-data";
import { CheckMark, LineLabel, LineOptions } from "./order-line";
import { PaymentDialog, type CashDetails } from "./payment-dialog";

/*
 * L'addition d'une table, article par article : ce qui reste à encaisser se
 * coche et se règle en carte ou en espèces, ce qui l'est déjà reste affiché
 * avec son mode. L'état vit en base (order_items.paid_mode) : il survit à
 * l'écran et se voit de tout appareil. Une commande dont la dernière ligne
 * est réglée passe « payée » — et part en cuisine.
 */

function sumLines(lines: OrderItem[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

export function EncaisserPanel({
  orders,
}: {
  /** Commandes en attente d'encaissement d'une même table. */
  orders: Order[];
}) {
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState<{
    itemIds: string[];
    total: number;
  } | null>(null);

  const lines = [...orders]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .flatMap((order) => order.items);
  const unpaid = lines.filter((line) => !line.paidMode);
  const paid = lines.filter((line) => line.paidMode);
  // Un autre appareil peut encaisser entre-temps : la sélection ne retient
  // que les lignes encore ouvertes.
  const selection = unpaid.filter((line) => selected.has(line.id));
  const partial = selection.length > 0 && selection.length < unpaid.length;
  const remaining = sumLines(unpaid);
  const paidByMode = new Map<PaymentMode, number>();
  for (const line of paid) {
    paidByMode.set(
      line.paidMode!,
      (paidByMode.get(line.paidMode!) ?? 0) + lineTotal(line)
    );
  }

  const toggle = (id: string) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const payAll = () =>
    setPaying({ itemIds: unpaid.map((line) => line.id), total: remaining });
  const paySelection = () =>
    setPaying({
      itemIds: selection.map((line) => line.id),
      total: sumLines(selection),
    });

  const settle = async (
    mode: EncaissementMode,
    cashDetails?: CashDetails,
    tip?: number
  ) => {
    if (!paying) return;
    const { itemIds } = paying;
    setPaying(null);
    try {
      await api.payOrderItems(itemIds, mode, cashDetails, tip);
      setSelected(new Set());
      toast.success(
        itemIds.length === unpaid.length
          ? "Addition réglée, la commande part en cuisine."
          : "Sélection encaissée."
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
  };

  const restLabel = paid.length > 0 ? "Encaisser le reste" : "Tout encaisser";

  return (
    <div className="flex flex-col gap-3">
      {unpaid.length > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
              À encaisser
            </p>
            {unpaid.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setSelected(
                    selection.length === unpaid.length
                      ? new Set()
                      : new Set(unpaid.map((line) => line.id))
                  )
                }
                className="text-xs font-semibold text-ember-2 transition-opacity hover:opacity-80"
              >
                {selection.length === unpaid.length
                  ? "Désélectionner"
                  : "Tout sélectionner"}
              </button>
            )}
          </div>
          <ul className="mt-1.5 flex flex-col">
            {unpaid.map((line) => {
              const isSelected = selected.has(line.id);
              return (
                <li key={line.id}>
                  <button
                    type="button"
                    onClick={() => toggle(line.id)}
                    aria-pressed={isSelected}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      isSelected ? "bg-ember-2/10" : "hover:bg-surface-raised"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        isSelected
                          ? "border-ember-2 bg-ember-2 text-background"
                          : "border-hairline"
                      }`}
                    >
                      {isSelected && <CheckMark />}
                    </span>
                    <div className="flex flex-1 flex-col gap-0.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <LineLabel line={line} />
                        <span className="shrink-0 text-sm tabular-nums text-muted">
                          {formatPrice(lineTotal(line))}
                        </span>
                      </div>
                      <LineOptions line={line} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {paid.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
            Déjà encaissé
          </p>
          <ul className="mt-1.5 flex flex-col">
            {paid.map((line) => (
              <li
                key={line.id}
                className="flex items-start gap-3 px-3 py-2.5 opacity-60"
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border border-hairline bg-surface text-muted">
                  <CheckMark />
                </span>
                <div className="flex flex-1 flex-col gap-0.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <LineLabel line={line} settled />
                    <span className="flex shrink-0 items-baseline gap-2">
                      <span className="rounded-full border border-hairline px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-faint">
                        {PAYMENT_MODE_LABELS[line.paidMode!]}
                      </span>
                      <span className="text-sm tabular-nums text-muted">
                        {formatPrice(lineTotal(line))}
                      </span>
                    </span>
                  </div>
                  <LineOptions line={line} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-hairline pt-3">
        {paid.length > 0 && (
          <p className="text-xs text-muted">
            Encaissé {formatPrice(sumLines(paid))}
            {[...paidByMode].map(
              ([mode, total]) =>
                ` · ${PAYMENT_MODE_LABELS[mode]} ${formatPrice(total)}`
            )}
          </p>
        )}
        {unpaid.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-muted">
                {partial ? "Sélection" : "Reste à encaisser"}
              </span>
              <span className="font-display text-lg text-ember-1">
                {formatPrice(partial ? sumLines(selection) : remaining)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {partial && (
                <button
                  type="button"
                  onClick={payAll}
                  className="rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-muted transition-colors hover:text-foreground"
                >
                  {restLabel} · {formatPrice(remaining)}
                </button>
              )}
              <button
                type="button"
                onClick={partial ? paySelection : payAll}
                className="ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background"
              >
                {partial ? "Encaisser la sélection" : restLabel}
              </button>
            </div>
          </div>
        )}
      </div>

      {paying && (
        <PaymentDialog
          total={paying.total}
          onClose={() => setPaying(null)}
          onSelect={(mode, cashDetails, tip) =>
            void settle(mode, cashDetails, tip)
          }
        />
      )}
    </div>
  );
}

/** Une addition dans l'onglet À encaisser : la table, son heure, son reste dû. */
export function EncaisserCard({
  orders,
  title,
}: {
  orders: Order[];
  title: string;
}) {
  const oldest = orders.reduce(
    (min, order) => (order.createdAt < min ? order.createdAt : min),
    orders[0].createdAt
  );
  const remaining = sumLines(
    orders.flatMap((order) => order.items.filter((line) => !line.paidMode))
  );
  return (
    <section className="rounded-2xl border border-ember-1/30 bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2.5">
            <h3 className="font-display text-lg font-medium">{title}</h3>
            <span className="text-xs tabular-nums text-faint">
              {formatTime(oldest)}
            </span>
          </div>
          <p className="text-xs text-muted">Part en cuisine une fois encaissée.</p>
        </div>
        <span className="font-display text-lg text-ember-1">
          {formatPrice(remaining)}
        </span>
      </div>
      <div className="mt-3">
        <EncaisserPanel orders={orders} />
      </div>
    </section>
  );
}
