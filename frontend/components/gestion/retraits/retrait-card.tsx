"use client";

import { useState } from "react";
import { EtaChooser } from "@/components/gestion/commandes/eta-chooser";
import { LineOptions, PaymentChip } from "@/components/gestion/commandes/order-line";
import { StatusBadge } from "@/components/gestion/commandes/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { formatDayLong } from "@/lib/collect/hours";
import * as api from "@/lib/gestion/api";
import { PICKUP_ACTION_LABELS, PICKUP_STATUS_LABELS } from "@/lib/gestion/constants";
import { formatDateTime, formatTime } from "@/lib/gestion/format";
import { amountDue, isPickupOpen, pickupDay } from "@/lib/gestion/retraits";
import { isPaid, lineTotal, orderTotal, paidThroughSite } from "@/lib/gestion/selectors";
import { useGestionAccess } from "@/lib/gestion/store";
import { HubriseRef } from "@/components/gestion/commandes/hubrise-ref";
import type { Order, OrderStatus } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";

/**
 * Un retrait : l'heure, le client, ce qu'il emporte, son mot, ce qu'il reste
 * à régler — et le geste suivant. Une commande du site arrive payée et se
 * prend en charge ; une commande de l'équipe arrive en préparation et se
 * règle au comptoir quand on la remet.
 */
export function RetraitCard({
  order,
  today,
  showDay = false,
  onHandOver,
}: {
  order: Order;
  /** Jour de Paris (AAAA-MM-JJ) : une remise avant le jour du retrait se confirme. */
  today: string;
  /** Retrait d'un jour passé : la date précède l'heure. */
  showDay?: boolean;
  /** Remise d'une commande qui reste à régler : la page ouvre l'encaissement. */
  onHandOver: (order: Order) => void;
}) {
  const { can } = useGestionAccess();
  const toast = useToast();
  const [cancelling, setCancelling] = useState(false);
  const [handingEarly, setHandingEarly] = useState(false);
  const [choosingEta, setChoosingEta] = useState(false);
  const [busy, setBusy] = useState(false);

  const fromSite = paidThroughSite(order);
  const due = amountDue(order);
  const open = isPickupOpen(order);

  const transition = async (target: OrderStatus, success: string, estimatedReadyAt?: string) => {
    setBusy(true);
    try {
      await api.updateOrderStatus(order.id, target, estimatedReadyAt);
      toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  };

  const handOver = () => {
    if (due > 0) onHandOver(order);
    else void transition("retiree", `Commande de ${order.customerName ?? "client"} remise.`);
  };
  // Remise avant son jour : le client passe en avance, ou c'est la mauvaise
  // carte — l'encaissement compterait aujourd'hui une commande de samedi.
  const early = pickupDay(order) > today;

  const when =
    order.pickupAt && (showDay ? formatDateTime(order.pickupAt) : formatTime(order.pickupAt));
  const phoneHref = order.customerPhone
    ? `tel:${order.customerPhone.replace(/[^\d+]/g, "")}`
    : undefined;

  const primary =
    "ember-gradient rounded-full px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-40 lg:pointer-fine:py-2 lg:pointer-fine:text-xs";
  const secondary =
    "rounded-full border border-hairline px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground disabled:opacity-40 lg:pointer-fine:py-2 lg:pointer-fine:text-xs";

  return (
    <article
      data-retrait-new={order.status === "en_attente" || undefined}
      className={`flex flex-col gap-3 rounded-2xl border bg-surface p-5 ${
        order.status === "en_attente" ? "border-ember-2/50" : "border-hairline"
      } ${open ? "" : "opacity-70"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-3">
          {when ? (
            <span className="font-display text-2xl tabular-nums tracking-tight">{when}</span>
          ) : (
            // Sans heure de retrait : l'heure annoncée au client, une fois
            // la commande prise en charge.
            <span className="flex shrink-0 flex-col text-[10px] font-semibold uppercase leading-snug tracking-wider text-ember-2">
              Dès que possible
              {order.estimatedReadyAt && (
                <span className="text-sm font-medium normal-case tracking-normal text-foreground tabular-nums">
                  Prête vers {formatTime(order.estimatedReadyAt)}
                </span>
              )}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate font-medium">{order.customerName ?? "Client"}</h3>
            {order.customerPhone && (
              <a
                href={phoneHref}
                className="-my-3.5 inline-block whitespace-nowrap py-3.5 text-xs tabular-nums text-muted underline-offset-2 hover:text-foreground hover:underline"
              >
                {order.customerPhone}
              </a>
            )}
            <HubriseRef orders={[order]} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={order.status} label={PICKUP_STATUS_LABELS[order.status]} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">
            {fromSite ? "Site" : "Comptoir"}
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-1.5">
        {order.items.map((line) => (
          <li key={line.id} className="flex flex-col gap-0.5">
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span>
                <span className="font-semibold tabular-nums">{line.quantity}×</span>{" "}
                {line.name}
              </span>
              <span className="tabular-nums text-muted">{formatPrice(lineTotal(line))}</span>
            </div>
            <LineOptions line={line} />
          </li>
        ))}
      </ul>

      {order.customerNote && (
        <p className="whitespace-pre-line rounded-xl bg-ember-2/10 px-3.5 py-2.5 text-sm leading-relaxed">
          <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-wider text-ember-2">
            {fromSite ? "Mot du client" : "Note"}
          </span>
          « {order.customerNote} »
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3">
        <div className="flex items-center gap-2.5">
          <span className="font-display text-lg text-ember-1">{formatPrice(orderTotal(order))}</span>
          {isPaid(order) ? (
            <PaymentChip orders={[order]} />
          ) : (
            open && (
              <span className="rounded-full bg-ember-3/12 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-ember-3">
                À régler au retrait
              </span>
            )
          )}
        </div>
        {choosingEta && order.status === "en_attente" ? (
          <EtaChooser
            onChoose={(estimatedReadyAt) => {
              setChoosingEta(false);
              void transition("en_preparation", "Commande prise en charge.", estimatedReadyAt);
            }}
            onClose={() => setChoosingEta(false)}
          />
        ) : open && (
          <div className="flex flex-wrap gap-2">
            {order.status === "en_attente" && can("orders.setStatus:en_preparation") && (
              <button
                type="button"
                disabled={busy}
                // Sans heure de retrait, le client attend une heure annoncée.
                onClick={() =>
                  order.pickupAt
                    ? void transition("en_preparation", "Commande prise en charge.")
                    : setChoosingEta(true)
                }
                className={primary}
              >
                {PICKUP_ACTION_LABELS.en_preparation}
              </button>
            )}
            {order.status === "en_preparation" && can("orders.setStatus:prete") && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void transition("prete", "Commande prête.")}
                className={primary}
              >
                {PICKUP_ACTION_LABELS.prete}
              </button>
            )}
            {(order.status === "en_preparation" || order.status === "prete") &&
              can("orders.setStatus:retiree") && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => (early ? setHandingEarly(true) : handOver())}
                  className={order.status === "prete" ? primary : secondary}
                >
                  {due > 0 ? "Encaisser et remettre" : PICKUP_ACTION_LABELS.retiree}
                </button>
              )}
            {!isPaid(order) && can("orders.setStatus:annulee") && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setCancelling(true)}
                className="rounded-full px-3 py-2.5 text-sm font-semibold text-ember-3 transition-colors hover:bg-ember-3/10 disabled:opacity-40 lg:pointer-fine:py-2 lg:pointer-fine:text-xs"
              >
                Annuler
              </button>
            )}
          </div>
        )}
      </div>

      {cancelling && (
        <ConfirmDialog
          title="Annuler la commande ?"
          message={`La commande de ${order.customerName ?? "ce client"} sera annulée. Rien n'a été réglé : il n'y a rien à rembourser.`}
          confirmLabel="Annuler la commande"
          cancelLabel="Garder la commande"
          destructive
          onClose={() => setCancelling(false)}
          onConfirm={async () => {
            setCancelling(false);
            await transition("annulee", "Commande annulée.");
          }}
        />
      )}
      {handingEarly && (
        <ConfirmDialog
          title="Remettre en avance ?"
          message={`Le retrait est prévu ${formatDayLong(pickupDay(order))}.${
            due > 0 ? " L'encaissement comptera dans la caisse d'aujourd'hui." : ""
          }`}
          confirmLabel="Remettre maintenant"
          cancelLabel="Pas encore"
          onClose={() => setHandingEarly(false)}
          onConfirm={() => {
            setHandingEarly(false);
            handOver();
          }}
        />
      )}
    </article>
  );
}
