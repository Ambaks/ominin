"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { formatTime } from "@/lib/gestion/format";
import type { Order } from "@/lib/gestion/types";
import { CheckMark, LineLabel, LineOptions } from "./order-line";

/*
 * Le service d'une table, article par article : chaque ligne payée attend
 * son « Servie », les lignes servies restent cochées. L'état vit en base
 * (order_items.served_at) ; une commande dont la dernière ligne arrive à
 * table se clôt d'elle-même.
 */

export function ServirPanel({
  orders,
  readOnly = false,
}: {
  /** Commandes payées d'une même table. */
  orders: Order[];
  /** Vue cuisine : ce qui reste à apporter, sans les gestes de la salle. */
  readOnly?: boolean;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const lines = [...orders]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .flatMap((order) => order.items);
  const pending = lines.filter((line) => !line.servedAt);
  const served = lines.filter((line) => line.servedAt);

  const serve = async (itemIds: string[]) => {
    setBusy(new Set(itemIds));
    try {
      await api.serveOrderItems(itemIds);
      toast.success(itemIds.length === pending.length ? "Table servie." : "Servi.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setBusy(new Set());
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {pending.length > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
              À servir
            </p>
            {pending.length > 1 && !readOnly && (
              <button
                type="button"
                disabled={busy.size > 0}
                onClick={() => void serve(pending.map((line) => line.id))}
                className="text-xs font-semibold text-ember-2 transition-opacity hover:opacity-80 disabled:opacity-60"
              >
                Tout servir
              </button>
            )}
          </div>
          <ul className="mt-1.5 flex flex-col">
            {pending.map((line) => (
              <li
                key={line.id}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <div className="flex flex-1 flex-col gap-0.5">
                  <LineLabel line={line} />
                  <LineOptions line={line} />
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    disabled={busy.has(line.id)}
                    onClick={() => void serve([line.id])}
                    className="ember-gradient shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-background disabled:opacity-60"
                  >
                    Servie
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {served.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
            Servi
          </p>
          <ul className="mt-1.5 flex flex-col">
            {served.map((line) => (
              <li
                key={line.id}
                className="flex items-start gap-3 px-3 py-2.5 opacity-60"
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border border-hairline bg-surface text-muted">
                  <CheckMark />
                </span>
                <div className="flex flex-1 flex-col gap-0.5">
                  <LineLabel line={line} settled />
                  <LineOptions line={line} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Une table dans l'onglet À servir : son heure, ce qui reste à apporter. */
export function ServirCard({
  orders,
  title,
  readOnly = false,
}: {
  orders: Order[];
  title: string;
  readOnly?: boolean;
}) {
  const oldest = orders.reduce(
    (min, order) => (order.createdAt < min ? order.createdAt : min),
    orders[0].createdAt
  );
  const pending = orders
    .flatMap((order) => order.items)
    .filter((line) => !line.servedAt).length;
  return (
    <section className="rounded-2xl border border-ember-2/30 bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h3 className="font-display text-lg font-medium">{title}</h3>
          <span className="text-xs tabular-nums text-faint">
            {formatTime(oldest)}
          </span>
        </div>
        <span className="rounded-full border border-ember-2/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-2">
          {pending} à servir
        </span>
      </div>
      <div className="mt-3">
        <ServirPanel orders={orders} readOnly={readOnly} />
      </div>
    </section>
  );
}
