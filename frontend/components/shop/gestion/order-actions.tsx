"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useRunMutation } from "@/components/ui/toast";
import { centsToEurosInput, eurosToCents, formatPrice } from "@/lib/shop/format";
import * as api from "@/lib/shop/gestion-api";
import type { ShopMemberRole, ShopOrder, ShopOrderStatus } from "@/lib/shop/types";
import { PrinterIcon } from "../icons";
import { dangerButton, primaryButton, secondaryButton } from "./page-header";

export function OrderActions({ order, role }: { order: ShopOrder; role: ShopMemberRole }) {
  const router = useRouter();
  const run = useRunMutation();
  const [busy, setBusy] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [tracking, setTracking] = useState({ trackingNumber: order.tracking_number ?? "", trackingUrl: order.tracking_url ?? "", carrier: order.carrier ?? "" });
  const [notify, setNotify] = useState(true);
  const [fullRefund, setFullRefund] = useState(true);
  const [refundAmount, setRefundAmount] = useState(centsToEurosInput(order.total_cents));
  const [notes, setNotes] = useState(order.admin_notes ?? "");

  const act = async (label: string, action: () => Promise<unknown>) => {
    setBusy(true);
    await run(async () => {
      const result = (await action()) as { warning?: string } | undefined;
      router.refresh();
      if (result?.warning) throw new Error(result.warning);
    }, label);
    setBusy(false);
  };
  const setStatus = (status: ShopOrderStatus, label: string) => act(label, () => api.updateOrderStatus(order.id, status));
  const canRefund = role === "proprietaire" && (order.payment_status === "paid" || order.payment_status === "partially_refunded") && Boolean(order.stripe_payment_intent_id);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Avancement</span>
        <div className="flex flex-wrap gap-2">
          {order.status === "paid" && (
            <button type="button" disabled={busy} onClick={() => setStatus("preparing", "Commande en préparation")} className={primaryButton}>
              Commencer la préparation
            </button>
          )}
          {(order.status === "paid" || order.status === "preparing") && (
            <button type="button" disabled={busy} onClick={() => setShipOpen(true)} className={order.status === "preparing" ? primaryButton : secondaryButton}>
              Marquer comme expédiée
            </button>
          )}
          {order.status === "shipped" && (
            <button type="button" disabled={busy} onClick={() => setStatus("delivered", "Commande livrée")} className={primaryButton}>
              Marquer comme livrée
            </button>
          )}
          {(order.status === "shipped" || order.status === "delivered") && (
            <button type="button" disabled={busy} onClick={() => setStatus(order.status === "shipped" ? "preparing" : "shipped", "Statut modifié")} className={secondaryButton}>
              Revenir en arrière
            </button>
          )}
          {(order.status === "paid" || order.status === "preparing") && (
            <button type="button" disabled={busy} onClick={() => setStatus("cancelled", "Commande annulée")} className={dangerButton}>
              Annuler
            </button>
          )}
          {order.status === "cancelled" && order.payment_status === "paid" && (
            <button type="button" disabled={busy} onClick={() => setStatus("paid", "Commande réactivée")} className={secondaryButton}>
              Réactiver
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Outils</span>
        <div className="flex flex-wrap gap-2">
          <Link href={`/impression/${order.id}`} target="_blank" className={secondaryButton}>
            <PrinterIcon className="size-4" /> Bon de préparation
          </Link>
          {(order.payment_status === "paid" || order.payment_status === "partially_refunded") && (
            <button type="button" disabled={busy} onClick={() => act("E-mail de confirmation renvoyé", () => api.resendConfirmation(order.id))} className={secondaryButton}>
              Renvoyer la confirmation
            </button>
          )}
          {canRefund && (
            <button type="button" disabled={busy} onClick={() => setRefundOpen(true)} className={dangerButton}>
              Rembourser
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Suivi du colis</span>
        <div className="grid gap-2 sm:grid-cols-3">
          <input className={inputClass} placeholder="Numéro de suivi" value={tracking.trackingNumber} onChange={(e) => setTracking({ ...tracking, trackingNumber: e.target.value })} />
          <input className={inputClass} placeholder="Transporteur" value={tracking.carrier} onChange={(e) => setTracking({ ...tracking, carrier: e.target.value })} />
          <input className={inputClass} placeholder="Lien de suivi" value={tracking.trackingUrl} onChange={(e) => setTracking({ ...tracking, trackingUrl: e.target.value })} />
        </div>
        <button type="button" disabled={busy} onClick={() => act("Suivi enregistré", () => api.saveTracking(order.id, tracking))} className={`${secondaryButton} w-fit`}>
          Enregistrer le suivi
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Notes internes</span>
        <textarea className={`${inputClass} min-h-20`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Visibles uniquement par vous." />
        <button type="button" disabled={busy} onClick={() => act("Notes enregistrées", () => api.saveOrderNotes(order.id, notes))} className={`${secondaryButton} w-fit`}>
          Enregistrer les notes
        </button>
      </div>

      {shipOpen && (
        <Modal
          title="Marquer comme expédiée"
          onClose={() => setShipOpen(false)}
          footer={
            <>
              <button type="button" onClick={() => setShipOpen(false)} className={secondaryButton}>
                Annuler
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  await act("Commande expédiée", () => api.updateOrderStatus(order.id, "shipped", { ...tracking, notify }));
                  setShipOpen(false);
                }}
                className={primaryButton}
              >
                Confirmer l&apos;expédition
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="Numéro de suivi">
              <input className={inputClass} value={tracking.trackingNumber} onChange={(e) => setTracking({ ...tracking, trackingNumber: e.target.value })} />
            </Field>
            <Field label="Transporteur">
              <input className={inputClass} value={tracking.carrier} onChange={(e) => setTracking({ ...tracking, carrier: e.target.value })} placeholder="Colissimo, Mondial Relay…" />
            </Field>
            <Field label="Lien de suivi">
              <input className={inputClass} value={tracking.trackingUrl} onChange={(e) => setTracking({ ...tracking, trackingUrl: e.target.value })} placeholder="https://…" />
            </Field>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="size-4 accent-[var(--ember-2)]" />
              Envoyer l&apos;e-mail d&apos;expédition à la cliente
            </label>
          </div>
        </Modal>
      )}

      {refundOpen && (
        <Modal
          title="Rembourser la cliente"
          onClose={() => setRefundOpen(false)}
          footer={
            <>
              <button type="button" onClick={() => setRefundOpen(false)} className={secondaryButton}>
                Annuler
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  await act("Remboursement effectué", () => api.refundOrder(order.id, fullRefund ? null : eurosToCents(refundAmount)));
                  setRefundOpen(false);
                }}
                className={dangerButton}
              >
                Confirmer le remboursement
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">Effectué via Stripe sur le moyen de paiement d&apos;origine. Total payé : {formatPrice(order.total_cents)}.</p>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={fullRefund} onChange={(e) => setFullRefund(e.target.checked)} className="size-4 accent-[var(--ember-2)]" />
              Rembourser la totalité
            </label>
            {!fullRefund && (
              <Field label="Montant à rembourser (€)">
                <input className={inputClass} inputMode="decimal" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
              </Field>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
