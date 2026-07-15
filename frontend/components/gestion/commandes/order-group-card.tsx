"use client";

import { useState } from "react";
import { useRunMutation } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { orderTotal } from "@/lib/gestion/selectors";
import { useGestionAccess } from "@/lib/gestion/store";
import type { Order } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu-data";
import { OrderCard } from "./order-card";
import { PaymentDialog } from "./payment-dialog";

export function OrderGroupCard({
  orders,
  title,
  tableNumbersById,
}: {
  orders: Order[];
  title: string;
  tableNumbersById: Map<string, number>;
}) {
  const { can } = useGestionAccess();
  const run = useRunMutation();
  const [paying, setPaying] = useState(false);

  const groupeId = orders[0].groupeId!;
  const total = orders.reduce((sum, order) => sum + orderTotal(order), 0);
  const canServe =
    can("orders.setStatus:servie") &&
    orders.some((order) => order.status === "prete");
  const canPay =
    can("orders.setStatus:payee") &&
    orders.some((order) => order.status === "servie");

  return (
    <section className="overflow-hidden rounded-2xl border border-ember-2/25 bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-surface-raised px-5 py-3.5">
        <div className="flex items-baseline gap-2.5">
          <span className="ember-text text-[10px] font-bold uppercase tracking-wider">
            Groupe
          </span>
          <h3 className="font-display text-base font-medium">{title}</h3>
        </div>
        <span className="font-display text-lg text-ember-1">
          {formatPrice(total)}
        </span>
      </div>

      <div className="divide-y divide-hairline">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            tableNo={order.tableId ? (tableNumbersById.get(order.tableId) ?? 0) : 0}
            embedded
          />
        ))}
      </div>

      {(canServe || canPay) && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-hairline px-5 py-3.5">
          {canServe && (
            <button
              type="button"
              onClick={() =>
                void run(() => api.markGroupServed(groupeId), "Groupe servi.")
              }
              className="rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-ember-2/40"
            >
              Tout marquer servi
            </button>
          )}
          {canPay && (
            <button
              type="button"
              onClick={() => setPaying(true)}
              className="ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background"
            >
              Tout marquer payé
            </button>
          )}
        </div>
      )}

      {paying && (
        <PaymentDialog
          onClose={() => setPaying(false)}
          onSelect={(mode) => {
            setPaying(false);
            void run(() => api.markGroupPaid(groupeId, mode), "Groupe encaissé.");
          }}
        />
      )}
    </section>
  );
}
