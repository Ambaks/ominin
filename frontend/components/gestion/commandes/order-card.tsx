"use client";

import { useState } from "react";
import { ConfirmSheet, GlassButton } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import {
  ORDER_ACTION_LABELS,
  ORDER_STATUS_LABELS,
  PICKUP_ACTION_LABELS,
  PICKUP_STATUS_LABELS,
} from "@/lib/gestion/constants";
import { formatPickup, formatTime } from "@/lib/gestion/format";
import { nextStatuses } from "@/lib/gestion/permissions";
import { lastServedAt, lineTotal, orderTotal } from "@/lib/gestion/selectors";
import { useGestionAccess } from "@/lib/gestion/store";
import type { Order, OrderStatus } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";
import { BagIcon, CommandesIcon } from "../icons";
import { EtaChooser } from "./eta-chooser";
import { HubriseRef } from "./hubrise-ref";
import { LineOptions, PaymentChip } from "./order-line";
import { ServiceCard } from "./service-card";
import { StatusBadge } from "./status-badge";
import { TillChip } from "./till-chip";
import { describeError } from "@/lib/gestion/errors";

/**
 * Une commande seule : le suivi d'une commande collect (accepter, prête,
 * retirée) et les cartes d'historique. Sur place, l'addition et le service
 * d'une table passent par EncaisserCard et ServirCard.
 */
export function OrderCard({
  order,
  place,
  pickupShop = false,
  i,
  ready,
}: {
  /** Arrivée en temps réel : l'onde de braise, une fois. */
  ready?: boolean;
  order: Order;
  /** Sur place : la table ou le numéro du jour (placeLabel). */
  place: string;
  /** Boutique à emporter seule : boutons et statuts parlent comme Retraits. */
  pickupShop?: boolean;
  /** Rang d'entrée dans la page. */
  i?: number;
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
      toast.success(`Commande ${ORDER_STATUS_LABELS[target].toLowerCase()}.`);
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  const heading = isCollect ? order.customerName || "Client" : place;
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
  const cancelMessage = "Elle sera annulée définitivement, sans remboursement depuis cet écran.";
  const closed = order.status === "servie" || order.status === "retiree" || order.status === "annulee";

  return (
    <ServiceCard
      entity={order.status === "annulee" ? "problem" : closed ? "none" : "orders"}
      icon={isCollect ? <BagIcon /> : <CommandesIcon />}
      eyebrow={`${isCollect ? "À emporter" : "Commande"} · ${formatTime(order.createdAt)}`}
      title={
        <span className="flex flex-wrap items-center gap-2">
          {heading}
          {order.fromTill && <TillChip />}
        </span>
      }
      right={<StatusBadge status={order.status} label={statusLabel} />}
      i={i}
      ready={ready}
      sub={
        <>
          {isCollect && (
            <p>
              Retrait&nbsp;: {order.pickupAt ? formatPickup(order.pickupAt) : "dès que possible"}
              {readyAt && ` · prête vers ${formatTime(readyAt)}`}
            </p>
          )}
          <HubriseRef orders={[order]} sendState />
        </>
      }
    >
      {isCollect && order.customerNote && (
        <p className="mt-3 whitespace-pre-line rounded-g-card border border-hairline px-3.5 py-2.5 text-g-body [overflow-wrap:anywhere]">
          <span className="mr-1.5 text-g-meta font-semibold text-g-entity">Mot du client</span>
          « {order.customerNote} »
        </p>
      )}

      <ul className="mt-3 mb-4 flex flex-col gap-1.5">
        {order.items.map((line) => (
          <li key={line.id} className="flex flex-col gap-0.5">
            <div className="flex items-baseline justify-between gap-4 text-g-body">
              <span>
                <span className="tabular-nums text-muted">{line.quantity}×</span>{" "}
                {line.name}
              </span>
              <span className="tabular-nums text-muted">{formatPrice(lineTotal(line))}</span>
            </div>
            {/* Le supplément reste : il explique le prix de la ligne. */}
            <LineOptions line={line} />
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-g-name tabular-nums">{formatPrice(orderTotal(order))}</span>
          {/* Le mode n'est posé qu'au règlement : sans lui, rien n'est encore payé. */}
          {(order.paidOnline || order.paymentMode) && <PaymentChip orders={[order]} />}
          {order.cashGiven != null && (
            <span className="text-g-meta tabular-nums text-muted">
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
                // Une seule action principale : la suivante. La remise,
                // raccourci d'une commande à emporter, reste en retrait.
                <GlassButton
                  key={target}
                  variant={index === 0 ? "primary" : "secondary"}
                  onClick={() => {
                    if (target === "en_preparation" && isCollect && !order.pickupAt) {
                      setChoosingEta(true);
                    } else {
                      void transition(target);
                    }
                  }}
                >
                  {(pickupShop && isCollect && PICKUP_ACTION_LABELS[target]) ||
                    ORDER_ACTION_LABELS[target as Exclude<OrderStatus, "en_attente">]}
                </GlassButton>
              ))}
            {targets.includes("annulee") && (
              <GlassButton variant="danger" onClick={() => setCancelling(true)}>
                Annuler
              </GlassButton>
            )}
          </div>
        ) : null}
      </div>

      {cancelling && (
        <ConfirmSheet
          title={`Annuler la commande de ${place} ?`}
          text={cancelMessage}
          confirmLabel="Annuler la commande"
          cancelLabel="Garder la commande"
          destructive
          onClose={() => setCancelling(false)}
          onConfirm={async () => {
            setCancelling(false);
            await transition("annulee");
          }}
        />
      )}
    </ServiceCard>
  );
}
