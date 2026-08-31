"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import {
  COLLECT_ETA_CHOICES_MIN,
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
  pulse = false,
}: {
  order: Order;
  tableNo: number;
  /** true quand la carte est imbriquée dans une carte de groupe. */
  embedded?: boolean;
  /** L'action principale respire (soft-pulse) : la prochaine chose à faire. */
  pulse?: boolean;
}) {
  const { role } = useGestionAccess();
  const toast = useToast();
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [choosingEta, setChoosingEta] = useState(false);

  const isCollect = order.type === "collect";
  const targets = nextStatuses(order.status, role, order.type);
  /** Refus (et non annulation) : commande collect pas encore acceptée. */
  const declining = isCollect && order.status === "en_attente";

  const transition = async (target: OrderStatus, estimatedReadyAt?: string) => {
    try {
      await api.updateOrderStatus(order.id, target, estimatedReadyAt);
      toast.success(`Commande ${target === "en_preparation" ? "en préparation" : target === "prete" ? "prête" : target === "servie" ? "servie" : target === "retiree" ? "retirée" : declining ? "refusée" : "annulée"}.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
  };

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

  const heading = isCollect
    ? order.customerName ?? "Client"
    : `Table ${tableNo}`;
  const cancelMessage = declining
    ? `La commande de ${order.customerName ?? "ce client"} sera refusée et le client en sera informé.`
    : isCollect
      ? `La commande de ${order.customerName ?? "ce client"} sera annulée définitivement.`
      : `La commande de la table ${tableNo} sera annulée définitivement.`;

  return (
    <article
      className={
        embedded ? "px-5 py-4" : "rounded-2xl border border-hairline bg-surface p-5"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          {isCollect && (
            <span className="rounded-full border border-ember-2/30 bg-ember-2/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-2">
              Emporter
            </span>
          )}
          <h3 className="font-display text-lg font-medium">{heading}</h3>
          <span className="text-xs tabular-nums text-faint">
            {formatTime(order.createdAt)}
          </span>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {isCollect && order.pickupAt && (
        <p className="mt-1 text-xs text-muted">
          Retrait : {formatTime(order.pickupAt)}
        </p>
      )}
      {isCollect && order.estimatedReadyAt && order.status === "en_preparation" && (
        <p className="mt-1 text-xs text-muted">
          Prête vers&nbsp;: {formatTime(order.estimatedReadyAt)}
        </p>
      )}

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
          {order.cashGiven != null && (
            <span className="text-xs tabular-nums text-faint">
              Reçu {formatPrice(order.cashGiven)}
              {order.cashChange ? ` · Rendu ${formatPrice(order.cashChange)}` : ""}
            </span>
          )}
        </div>
        {choosingEta && order.status === "en_attente" ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Prête dans&nbsp;:</span>
            {COLLECT_ETA_CHOICES_MIN.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => {
                  setChoosingEta(false);
                  void transition(
                    "en_preparation",
                    new Date(Date.now() + minutes * 60_000).toISOString()
                  );
                }}
                className="rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors hover:border-ember-2/40 hover:text-ember-1"
              >
                {minutes} min
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setChoosingEta(false);
                void transition("en_preparation");
              }}
              className="rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-ember-2/40"
            >
              Sans estimation
            </button>
            <button
              type="button"
              onClick={() => setChoosingEta(false)}
              aria-label="Fermer le choix de délai"
              className="px-1 text-sm text-faint transition-colors hover:text-foreground"
            >
              ✕
            </button>
          </div>
        ) : targets.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {targets
              .filter((target) => target !== "annulee")
              .map((target) => (
                <button
                  key={target}
                  type="button"
                  onClick={() => {
                    if (target === "payee") {
                      if (order.paidOnline) void settleOnline();
                      else setPaying(true);
                    } else if (
                      target === "en_preparation" &&
                      isCollect &&
                      !order.pickupAt
                    ) {
                      setChoosingEta(true);
                    } else {
                      void transition(target);
                    }
                  }}
                  className={`ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background ${
                    pulse ? "soft-pulse" : ""
                  }`}
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
                {declining ? "Refuser" : "Annuler"}
              </button>
            )}
          </div>
        ) : null}
      </div>

      {paying && (
        <PaymentDialog
          total={orderTotal(order)}
          onClose={() => setPaying(false)}
          onSelect={async (mode, cashDetails) => {
            setPaying(false);
            try {
              await api.markOrderPaid(order.id, mode, cashDetails);
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
          title={declining ? "Refuser la commande ?" : "Annuler la commande ?"}
          message={cancelMessage}
          confirmLabel={declining ? "Refuser la commande" : "Annuler la commande"}
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
