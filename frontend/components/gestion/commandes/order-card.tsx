"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import {
  ORDER_ACTION_LABELS,
  PAYMENT_MODE_LABELS,
} from "@/lib/gestion/constants";
import { formatTime } from "@/lib/gestion/format";
import { nextStatuses } from "@/lib/gestion/permissions";
import { lineTotal, orderTotal } from "@/lib/gestion/selectors";
import { useGestionAccess } from "@/lib/gestion/store";
import type { Order, OrderStatus } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu-data";
import { PaymentDialog } from "./payment-dialog";
import { StatusBadge } from "./status-badge";

export function OrderCard({
  order,
  tableNo,
  embedded = false,
}: {
  order: Order;
  tableNo: number;
  /** true quand la carte est imbriquée dans une carte de groupe. */
  embedded?: boolean;
}) {
  const { role } = useGestionAccess();
  const toast = useToast();
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const targets = nextStatuses(order.status, role);

  const transition = async (target: OrderStatus) => {
    try {
      await api.updateOrderStatus(order.id, target);
      toast.success(`Commande ${target === "en_preparation" ? "en préparation" : target === "prete" ? "prête" : target === "servie" ? "servie" : "annulée"}.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
  };

  // Déjà réglée par carte sur le menu QR : pas de choix de mode à refaire.
  const settleOnline = async () => {
    try {
      await api.markOrderPaid(order.id, "carte");
      toast.success("Commande clôturée (payée en ligne).");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
  };

  return (
    <article
      className={
        embedded ? "px-5 py-4" : "rounded-2xl border border-hairline bg-surface p-5"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h3 className="font-display text-lg font-medium">Table {tableNo}</h3>
          <span className="text-xs tabular-nums text-faint">
            {formatTime(order.createdAt)}
          </span>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <ul className="mt-3 flex flex-col gap-1.5">
        {order.items.map((line) => (
          <li key={line.id} className="flex flex-col gap-0.5">
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span>
                <span className="tabular-nums text-muted">{line.quantity}×</span>{" "}
                {line.name}
              </span>
              <span className="tabular-nums text-muted">
                {formatPrice(lineTotal(line))}
              </span>
            </div>
            {line.options?.map((option, index) => (
              <p key={index} className="pl-5 text-xs text-faint">
                {option.groupName} : {option.choiceName}
                {option.supplement > 0 && ` (+${formatPrice(option.supplement)})`}
              </p>
            ))}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3">
        <div className="flex items-center gap-2.5">
          <span className="font-display text-lg text-ember-1">
            {formatPrice(orderTotal(order))}
          </span>
          {order.paidOnline && order.status !== "payee" ? (
            <span className="rounded-full border border-ember-2/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-1">
              Payée en ligne
            </span>
          ) : (
            order.paymentMode && (
              <span className="rounded-full border border-hairline px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
                {PAYMENT_MODE_LABELS[order.paymentMode]}
              </span>
            )
          )}
        </div>
        {targets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {targets
              .filter((target) => target !== "annulee")
              .map((target) => (
                <button
                  key={target}
                  type="button"
                  onClick={() =>
                    target === "payee"
                      ? order.paidOnline
                        ? void settleOnline()
                        : setPaying(true)
                      : transition(target)
                  }
                  className="ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background"
                >
                  {target === "payee" && order.paidOnline
                    ? "Clôturer (payée en ligne)"
                    : ORDER_ACTION_LABELS[target as Exclude<OrderStatus, "en_attente">]}
                </button>
              ))}
            {targets.includes("annulee") && (
              <button
                type="button"
                onClick={() => setCancelling(true)}
                className="rounded-full border border-ember-3/40 px-4 py-2 text-xs font-semibold text-ember-3 transition-colors hover:bg-ember-3/10"
              >
                Annuler
              </button>
            )}
          </div>
        )}
      </div>

      {paying && (
        <PaymentDialog
          onClose={() => setPaying(false)}
          onSelect={async (mode) => {
            setPaying(false);
            try {
              await api.markOrderPaid(order.id, mode);
              toast.success("Commande encaissée.");
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Une erreur est survenue."
              );
            }
          }}
        />
      )}
      {cancelling && (
        <ConfirmDialog
          title="Annuler la commande ?"
          message={`La commande de la table ${tableNo} sera annulée définitivement.`}
          confirmLabel="Annuler la commande"
          destructive
          onClose={() => setCancelling(false)}
          onConfirm={async () => {
            setCancelling(false);
            await transition("annulee");
          }}
        />
      )}
    </article>
  );
}
