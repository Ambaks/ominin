"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import {
  ORDER_ACTION_LABELS,
  PICKUP_ACTION_LABELS,
  PICKUP_STATUS_LABELS,
} from "@/lib/gestion/constants";
import { formatPickup, formatTime } from "@/lib/gestion/format";
import { nextStatuses } from "@/lib/gestion/permissions";
import { lastServedAt, lineTotal, orderTotal } from "@/lib/gestion/selectors";
import { useGestionAccess } from "@/lib/gestion/store";
import type { Order, OrderStatus } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";
import { EtaChooser } from "./eta-chooser";
import { LineOptions, PaymentChip } from "./order-line";
import { StatusBadge } from "./status-badge";
import { TillChip } from "./till-chip";

/**
 * Une commande seule : le suivi d'une commande collect (accepter, prête,
 * retirée) et les cartes d'historique. Sur place, l'addition et le service
 * d'une table passent par EncaisserCard et ServirCard.
 */
export function OrderCard({
  order,
  place,
  pickupShop = false,
}: {
  order: Order;
  /** Sur place : la table ou le numéro du jour (placeLabel). */
  place: string;
  /** Boutique à emporter seule : boutons et statuts parlent comme Retraits. */
  pickupShop?: boolean;
}) {
  const { role } = useGestionAccess();
  const toast = useToast();
  const [cancelling, setCancelling] = useState(false);
  const [choosingEta, setChoosingEta] = useState(false);

  const isCollect = order.type === "collect";
  const targets = order.fromTill ? [] : nextStatuses(order.status, role, order.type);

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
  // L'estimation ne sert qu'en préparation : prête ou remise, elle est dépassée.
  const readyAt = order.status === "en_preparation" ? order.estimatedReadyAt : undefined;
  // Servie, une commande dit quand — l'heure de sa dernière ligne apportée,
  // à côté de celle où elle a été passée. « Remise » au comptoir fast food.
  const servedAt = order.status === "servie" ? lastServedAt(order) : undefined;
  const servedWord = order.orderNumber !== undefined ? "Remise" : "Servie";
  const statusLabel = servedAt
    ? `${servedWord} à ${formatTime(servedAt)}`
    : order.status === "servie"
      ? servedWord
      : pickupShop && isCollect
        ? PICKUP_STATUS_LABELS[order.status]
        : undefined;
  const cancelMessage = `${place} : la commande sera annulée définitivement.`;

  return (
    // En colonne, le total au pied : il s'aligne d'une carte à l'autre d'un rang.
    <article className="flex flex-col rounded-2xl border border-hairline bg-surface p-5">
      {/* Trop étroit pour le nom entier, le statut passe dessous. */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 items-baseline gap-2.5">
          {isCollect && (
            <span className="shrink-0 rounded-full border border-ember-2/30 bg-ember-2/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-2">
              Emporter
            </span>
          )}
          {order.fromTill && <TillChip />}
          <h3 className="min-w-0 break-words font-display text-lg font-medium">{heading}</h3>
          <span className="shrink-0 text-[13px] tabular-nums text-muted">
            {formatTime(order.createdAt)}
          </span>
        </div>
        <StatusBadge status={order.status} label={statusLabel} />
      </div>

      {isCollect && (
        <p className="mt-1 text-xs text-muted">
          Retrait&nbsp;: {order.pickupAt ? formatPickup(order.pickupAt) : "dès que possible"}
          {readyAt && ` · prête vers ${formatTime(readyAt)}`}
        </p>
      )}
      {isCollect && order.customerNote && (
        <p className="whitespace-pre-line mt-2 rounded-xl bg-ember-2/10 px-3 py-2 text-sm leading-relaxed">
          <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-wider text-ember-2">
            Mot du client
          </span>
          « {order.customerNote} »
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
          <EtaChooser
            onChoose={(estimatedReadyAt) => {
              setChoosingEta(false);
              void transition("en_preparation", estimatedReadyAt);
            }}
            onClose={() => setChoosingEta(false)}
          />
        ) : targets.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {targets
              .filter((target) => target !== "annulee")
              .map((target, index) => (
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
                  // Une seule action principale : la suivante. La remise,
                  // raccourci d'une commande à emporter, reste en retrait.
                  className={
                    index === 0
                      ? "ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background"
                      : "rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
                  }
                >
                  {(pickupShop && isCollect && PICKUP_ACTION_LABELS[target]) ||
                    ORDER_ACTION_LABELS[target as Exclude<OrderStatus, "en_attente">]}
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
