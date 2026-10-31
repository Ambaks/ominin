"use client";

import { useEffect, useRef, useState } from "react";
import { EtaChooser } from "@/components/gestion/commandes/eta-chooser";
import { HubriseRef } from "@/components/gestion/commandes/hubrise-ref";
import { LineOptions } from "@/components/gestion/commandes/order-line";
import { describeError } from "@/components/gestion/paiements/describe-error";
import { PickupDueChip, PickupPaidChip, PickupStatusChip } from "@/components/gestion/retraits/pickup-chips";
import { GlassButton, Plate } from "@/components/gestion/ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { formatDayLong } from "@/lib/collect/hours";
import * as api from "@/lib/gestion/api";
import { PICKUP_ACTION_LABELS } from "@/lib/gestion/constants";
import { formatDateTime, formatTime } from "@/lib/gestion/format";
import { amountDue, isPickupOpen, pickupDay } from "@/lib/gestion/retraits";
import { isPaid, lineTotal, orderTotal, paidThroughSite } from "@/lib/gestion/selectors";
import { useGestionAccess } from "@/lib/gestion/store";
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
  // « C'est prêt » : le moment rare de la page. La carte respire une fois
  // quand la commande passe à prête — d'ici ou d'un autre écran — puis se tait.
  const [celebrating, setCelebrating] = useState(false);
  const previousStatus = useRef(order.status);
  useEffect(() => {
    const became = previousStatus.current !== "prete" && order.status === "prete";
    previousStatus.current = order.status;
    // Posé hors du rendu, au changement d'état : pas de rendu en cascade.
    const frame = requestAnimationFrame(() => setCelebrating(became));
    return () => cancelAnimationFrame(frame);
  }, [order.status]);

  const fromSite = paidThroughSite(order);
  const due = amountDue(order);
  const open = isPickupOpen(order);

  const transition = async (target: OrderStatus, success: string, estimatedReadyAt?: string) => {
    setBusy(true);
    try {
      await api.updateOrderStatus(order.id, target, estimatedReadyAt);
      toast.success(success);
    } catch (error) {
      toast.error(describeError(error).message);
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
  const isNew = order.status === "en_attente";

  return (
    <Plate
      data-retrait-new={isNew || undefined}
      className={`relative flex flex-col gap-3 p-4 sm:p-5 ${isNew ? "border-ember-2/50" : ""} ${
        open ? "" : "opacity-70"
      } ${celebrating ? "order-pop motion-reduce:animate-none" : ""}`}
    >
      {celebrating && (
        // Un anneau braise s'évase une fois depuis la carte, puis s'efface.
        <span
          aria-hidden
          onAnimationIteration={() => setCelebrating(false)}
          className="pulse-ring pointer-events-none absolute inset-0 rounded-g-card border-2 border-ember-1 motion-reduce:hidden"
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-3">
          {when ? (
            <span className="text-g-kpi tabular-nums">{when}</span>
          ) : (
            // Sans heure de retrait : l'heure annoncée au client, une fois
            // la commande prise en charge.
            <span className="flex shrink-0 flex-col gap-0.5">
              <span className="g-eyebrow g-orders">Dès que possible</span>
              {order.estimatedReadyAt && (
                <span className="text-g-label font-medium tabular-nums">
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
                className="-my-3 inline-block whitespace-nowrap py-3 text-g-meta text-muted tabular-nums underline-offset-2 hover:text-foreground hover:underline"
              >
                {order.customerPhone}
              </a>
            )}
            <HubriseRef orders={[order]} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <PickupStatusChip status={order.status} />
          <span className="text-g-meta text-muted">{fromSite ? "Site" : "Comptoir"}</span>
        </div>
      </div>

      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {order.items.map((line) => (
          <li key={line.id} className="flex flex-col gap-0.5">
            <div className="flex items-baseline justify-between gap-4">
              <span>
                <span className="font-semibold tabular-nums">{line.quantity}×</span> {line.name}
              </span>
              <span className="text-muted tabular-nums">{formatPrice(lineTotal(line))}</span>
            </div>
            <LineOptions line={line} />
          </li>
        ))}
      </ul>

      {order.customerNote && (
        <p className="g-orders whitespace-pre-line rounded-g-card border border-hairline bg-surface-raised px-3.5 py-2.5">
          <span className="g-eyebrow mr-2">{fromSite ? "Mot du client" : "Note"}</span>
          « {order.customerNote} »
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-semibold tabular-nums">{formatPrice(orderTotal(order))}</span>
          {isPaid(order) ? (
            <PickupPaidChip order={order} />
          ) : (
            open && <PickupDueChip amount={formatPrice(due)} />
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
        ) : (
          open && (
            <div className="flex flex-wrap gap-2">
              {order.status === "en_attente" && can("orders.setStatus:en_preparation") && (
                <GlassButton
                  variant="primary"
                  disabled={busy}
                  // Sans heure de retrait, le client attend une heure annoncée.
                  onClick={() =>
                    order.pickupAt
                      ? void transition("en_preparation", "Commande prise en charge.")
                      : setChoosingEta(true)
                  }
                >
                  {PICKUP_ACTION_LABELS.en_preparation}
                </GlassButton>
              )}
              {order.status === "en_preparation" && can("orders.setStatus:prete") && (
                <GlassButton
                  variant="primary"
                  disabled={busy}
                  onClick={() => void transition("prete", "Commande prête.")}
                >
                  {PICKUP_ACTION_LABELS.prete}
                </GlassButton>
              )}
              {(order.status === "en_preparation" || order.status === "prete") &&
                can("orders.setStatus:retiree") && (
                  <GlassButton
                    variant={order.status === "prete" ? "primary" : "secondary"}
                    disabled={busy}
                    onClick={() => (early ? setHandingEarly(true) : handOver())}
                  >
                    {due > 0 ? "Encaisser et remettre" : PICKUP_ACTION_LABELS.retiree}
                  </GlassButton>
                )}
              {!isPaid(order) && can("orders.setStatus:annulee") && (
                <GlassButton disabled={busy} onClick={() => setCancelling(true)}>
                  Annuler
                </GlassButton>
              )}
            </div>
          )
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
    </Plate>
  );
}
