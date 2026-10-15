"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { COLLECT_ETA_CHOICES_MIN, ORDER_ACTION_LABELS } from "@/lib/gestion/constants";
import { formatPickup, formatTime } from "@/lib/gestion/format";
import { nextStatuses } from "@/lib/gestion/permissions";
import { lastServedAt, lineTotal, orderTotal } from "@/lib/gestion/selectors";
import { useGestionAccess } from "@/lib/gestion/store";
import type { Order, OrderStatus } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";
import { LineOptions, PaymentChip } from "./order-line";
import { StatusBadge } from "./status-badge";

/**
 * Une commande seule : le suivi d'une commande collect (accepter, prête,
 * retirée) et les cartes d'historique. Sur place, l'addition et le service
 * d'une table passent par EncaisserCard et ServirCard.
 */
export function OrderCard({
  order,
  place,
  pulse = false,
}: {
  order: Order;
  /** Sur place : la table ou le numéro du jour (placeLabel). */
  place: string;
  /** L'action principale respire (soft-pulse) : la prochaine chose à faire. */
  pulse?: boolean;
}) {
  const { role } = useGestionAccess();
  const toast = useToast();
  const [cancelling, setCancelling] = useState(false);
  const [choosingEta, setChoosingEta] = useState(false);

  const isCollect = order.type === "collect";
  const targets = nextStatuses(order.status, role, order.type);

  const transition = async (target: OrderStatus, estimatedReadyAt?: string) => {
    try {
      await api.updateOrderStatus(order.id, target, estimatedReadyAt);
      toast.success(`Commande ${target === "en_preparation" ? "en préparation" : target === "prete" ? "prête" : target === "servie" ? "servie" : target === "retiree" ? "retirée" : "annulée"}.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
  };

  const heading = isCollect ? order.customerName ?? "Client" : place;
  // Servie, une commande dit quand — l'heure de sa dernière ligne apportée,
  // à côté de celle où elle a été passée. « Remise » au comptoir fast food.
  const servedAt = order.status === "servie" ? lastServedAt(order) : undefined;
  const servedWord = order.orderNumber !== undefined ? "Remise" : "Servie";
  const cancelMessage = `${place} : la commande sera annulée définitivement.`;

  return (
    // En colonne, le total au pied : il s'aligne d'une carte à l'autre d'un rang.
    <article className="flex flex-col rounded-2xl border border-hairline bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          {isCollect && (
            <span className="rounded-full border border-ember-2/30 bg-ember-2/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-2">
              Emporter
            </span>
          )}
          <h3 className="font-display text-lg font-medium">{heading}</h3>
          <span className="text-[13px] tabular-nums text-muted">
            {formatTime(order.createdAt)}
          </span>
        </div>
        <StatusBadge
          status={order.status}
          label={
            servedAt
              ? `${servedWord} à ${formatTime(servedAt)}`
              : order.status === "servie"
                ? servedWord
                : undefined
          }
        />
      </div>

      {isCollect && order.pickupAt && (
        <p className="mt-1 text-xs text-muted">
          Retrait : {formatPickup(order.pickupAt)}
        </p>
      )}
      {isCollect && order.estimatedReadyAt && order.status === "en_preparation" && (
        <p className="mt-1 text-xs text-muted">
          Prête vers&nbsp;: {formatTime(order.estimatedReadyAt)}
        </p>
      )}

      <ul className="mb-4 mt-3 flex flex-col gap-1.5">
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
            {/* Le supplément reste : il explique le prix de la ligne. */}
            <LineOptions line={line} />
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3">
        <div className="flex items-center gap-2.5">
          <span className="font-display text-lg text-ember-1">
            {formatPrice(orderTotal(order))}
          </span>
          {/* Le mode n'est posé qu'au règlement : sans lui, rien n'est encore payé. */}
          {(order.paidOnline || order.paymentMode) && <PaymentChip orders={[order]} />}
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
                className="rounded-full border border-hairline px-3.5 py-2 text-sm font-semibold tabular-nums transition-colors hover:border-ember-2/40 hover:text-ember-1"
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
              className="rounded-full border border-hairline px-3.5 py-2 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40"
            >
              Sans estimation
            </button>
            <button
              type="button"
              onClick={() => setChoosingEta(false)}
              aria-label="Fermer le choix de délai"
              className="flex size-11 items-center justify-center rounded-full text-base text-faint transition-colors hover:text-foreground lg:pointer-fine:size-9"
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
                    if (
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
                  {ORDER_ACTION_LABELS[target as Exclude<OrderStatus, "en_attente">]}
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
        ) : null}
      </div>

      {cancelling && (
        <ConfirmDialog
          title="Annuler la commande ?"
          message={cancelMessage}
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
