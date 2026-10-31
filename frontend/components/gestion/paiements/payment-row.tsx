"use client";

import { useState } from "react";
import { HubriseRef } from "@/components/gestion/commandes/hubrise-ref";
import { AlertIcon, BagIcon, EditIcon, TrashIcon } from "@/components/gestion/icons";
import { Chip, GlassButton, Sheet } from "@/components/gestion/ui";
import { PAYMENT_MODE_LABELS } from "@/lib/gestion/constants";
import { formatTime } from "@/lib/gestion/format";
import {
  isCancelledPaid,
  orderTotal,
  paidAt,
  placeLabel,
  totalsByMode,
} from "@/lib/gestion/selectors";
import type { GestionState, Order, PaymentMode } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";
import { MoreIcon, RefundIcon, TillIcon } from "./icons";

/** Mode affiché : un règlement en ligne (Stripe/SumUp) prime sur la colonne. */
export function displayMode(order: Order): PaymentMode | undefined {
  return order.paidOnline ? "en_ligne" : order.paymentMode;
}

/** Qui a payé : le client d'un retrait, sinon la table ou le numéro. */
export function paymentHeading(order: Order, state: GestionState): string {
  return order.type === "collect"
    ? order.customerName ?? "Client"
    : placeLabel(order, state.tables, state.etablissement.showTableNumber);
}

/**
 * Un encaissement : l'heure, qui a payé, ce qu'il reste à savoir (mixte,
 * monnaie rendue), le mode, le montant — et les gestes de correction quand
 * ils existent. Tout encaissement au comptoir se corrige et s'annule ; un
 * règlement en ligne, y compris ceux de l'ancien tunnel click & collect
 * (mode « en_ligne »), est une transaction réelle chez le prestataire : il
 * reste tel quel. Une vente de la caisse se corrige sur la caisse.
 */
export function PaymentRow({
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
  // Au doigt, les deux gestes vivent dans une feuille libellée (§ 3.14).
  const [menu, setMenu] = useState(false);
  const heading = paymentHeading(order, state);
  const mode = displayMode(order);
  const articleCount = order.items.reduce((sum, line) => sum + line.quantity, 0);
  const editable =
    order.paymentMode != null &&
    order.paymentMode !== "en_ligne" &&
    order.paymentMode !== "caisse" &&
    !order.paidOnline &&
    !order.fromTill;
  const cancelled = isCancelledPaid(order);
  // Une addition partagée n'a pas de montant unique à afficher : ses deux
  // jambes le disent, et c'est la jambe espèces qui porte la monnaie rendue.
  const split = mode === "mixte" ? totalsByMode(order) : null;
  const cashLeg = split ? order.payments.find((leg) => leg.mode === "especes") : undefined;
  const received = split ? cashLeg?.cashGiven : order.cashGiven;
  const returned = split ? cashLeg?.cashChange : order.cashChange;
  const details = [
    `${articleCount} article${articleCount > 1 ? "s" : ""}`,
    split && `espèces ${formatPrice(split.especes)} · carte ${formatPrice(split.carte)}`,
    received != null && `reçu ${formatPrice(received)}`,
    returned ? `rendu ${formatPrice(returned)}` : null,
    // Refusée par la caisse : la consigne se lit, elle ne se survole pas.
    cancelled && (order.refundedAt ? "remboursée par la caisse" : "remboursement à faire chez le prestataire"),
  ]
    .filter(Boolean)
    .join(" · ");
  const amount = formatPrice(orderTotal(order));

  return (
    <li className="grid grid-cols-[var(--g-control)_minmax(0,1fr)_auto_auto] items-center gap-x-3 border-t border-hairline px-4 py-3 first:border-t-0">
      <span className="self-start pt-0.5 text-g-meta text-muted tabular-nums sm:self-center sm:pt-0">
        {formatTime(paidAt(order))}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-medium [overflow-wrap:anywhere]">{heading}</p>
          {order.type === "collect" && <Chip icon={<BagIcon />}>Emporter</Chip>}
          {order.fromTill && (
            <span title="Saisie sur la caisse : elle se modifie sur la caisse.">
              <Chip icon={<TillIcon />}>Caisse</Chip>
            </span>
          )}
          {cancelled &&
            (order.refundedAt ? (
              <span title="Refusée par la caisse : le client a été remboursé.">
                <Chip icon={<RefundIcon />}>Remboursée</Chip>
              </span>
            ) : (
              <span title="Refusée par la caisse : le remboursement n'est pas passé, à faire chez le prestataire.">
                <Chip tone="problem" icon={<AlertIcon />}>
                  À rembourser
                </Chip>
              </span>
            ))}
        </div>
        <p className="text-g-meta text-muted">{details}</p>
        <HubriseRef orders={[order]} />
      </div>
      <div className="text-right">
        <p className={`font-semibold tabular-nums ${cancelled ? "text-muted line-through" : ""}`}>{amount}</p>
        {mode && !order.fromTill && <p className="text-g-meta text-muted">{PAYMENT_MODE_LABELS[mode]}</p>}
      </div>
      {/* La colonne des gestes garde sa largeur sur chaque ligne : les
          montants restent sur une même verticale. */}
      {editable ? (
        <>
          <GlassButton
            variant="icon"
            className="sm:hidden"
            onClick={() => setMenu(true)}
            aria-label={`Gestes sur l'encaissement de ${heading}`}
          >
            <MoreIcon />
          </GlassButton>
          <div className="hidden items-center gap-3 sm:flex">
            <GlassButton variant="icon" onClick={onEdit} title="Modifier l'encaissement" aria-label="Modifier l'encaissement">
              <EditIcon />
            </GlassButton>
            <GlassButton variant="icon" onClick={onVoid} title="Annuler l'encaissement" aria-label="Annuler l'encaissement">
              <TrashIcon />
            </GlassButton>
          </div>
        </>
      ) : (
        <span aria-hidden className="w-g-control sm:w-[calc(2*var(--g-control)+0.75rem)]" />
      )}
      {menu && (
        <Sheet title={`${heading} · ${amount}`} description={details} onClose={() => setMenu(false)}>
          <div className="grid gap-2">
            <GlassButton
              data-autofocus
              onClick={() => {
                setMenu(false);
                onEdit();
              }}
            >
              <EditIcon />
              Modifier l&rsquo;encaissement
            </GlassButton>
            <GlassButton
              variant="danger"
              onClick={() => {
                setMenu(false);
                onVoid();
              }}
            >
              <TrashIcon />
              Annuler l&rsquo;encaissement
            </GlassButton>
          </div>
        </Sheet>
      )}
    </li>
  );
}
