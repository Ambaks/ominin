"use client";

import { useState } from "react";
import { EncaisserPanel } from "@/components/gestion/commandes/encaisser-card";
import { ServirPanel } from "@/components/gestion/commandes/servir-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { formatTime } from "@/lib/gestion/format";
import {
  awaitsPayment,
  awaitsService,
  orderTotal,
  type TableService,
} from "@/lib/gestion/selectors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import type { Order } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu-data";

/** Titre de l'addition : une table, ou les tables réunies sous elle. */
function serviceTitle(service: TableService): string {
  const numbers = service.tables.map((table) => table.number).join(" + ");
  return service.tables.length > 1 ? `Tables ${numbers}` : `Table ${numbers}`;
}

/**
 * Une table en service, vue de la salle : son addition à encaisser, ses
 * plats à servir, ce qui est déjà servi. Le gérant peut y annuler une
 * commande non réglée (client parti). Quand Ominin les a ouvertes, la fiche
 * porte aussi les deux décisions de salle : qui tient la table, et avec
 * quelles autres elle ne fait qu'une.
 */
export function TableSheet({
  service,
  onClose,
}: {
  service: TableService;
  onClose: () => void;
}) {
  const state = useGestion();
  const { can, hasFeature } = useGestionAccess();
  const toast = useToast();
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);

  const toPay = service.orders.filter(awaitsPayment);
  const toServe = service.orders.filter(awaitsService);
  const canCancel = can("orders.setStatus:annulee");
  const serveurs = (state?.staff ?? []).filter(
    (member) => member.role === "serveur"
  );

  const assign = async (staffId: string | null) => {
    setBusy(true);
    try {
      await api.assignTable(service.table.id, staffId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setBusy(false);
    }
  };

  /**
   * Le ticket n'est pas sorti : rouleau fini, bourrage, ticket égaré entre le
   * passe et le piano. On refait partir ce que la table a en cours, sans
   * défaire un encaissement pour le refaire.
   */
  const reprint = async () => {
    setBusy(true);
    try {
      const jobs = await api.reprintTickets(
        service.orders.map((order) => order.id)
      );
      if (jobs === 0) {
        toast.error("Aucune imprimante déclarée.");
      } else {
        toast.success(
          service.orders.length > 1
            ? "Tickets renvoyés en cuisine."
            : "Ticket renvoyé en cuisine."
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setBusy(false);
    }
  };

  const ungroup = async () => {
    const groupId = service.table.groupId;
    if (!groupId) return;
    setBusy(true);
    try {
      await api.ungroupTables(groupId);
      toast.success("Tables séparées.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={serviceTitle(service)} onClose={onClose}>
      <div className="flex flex-col gap-6">
        {hasFeature("assignation") && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-faint">
              Serveur
            </span>
            <select
              value={service.table.staffId ?? ""}
              disabled={busy}
              onChange={(event) => void assign(event.target.value || null)}
              className={inputClass}
            >
              <option value="">Personne</option>
              {serveurs.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {hasFeature("groupes_tables") && service.tables.length > 1 && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface px-4 py-3">
            <p className="text-sm text-muted">
              {service.tables.length} tables sous une même addition.
            </p>
            <button
              type="button"
              onClick={() => void ungroup()}
              disabled={busy}
              className="shrink-0 text-sm font-semibold text-muted transition-colors hover:text-ember-3 disabled:opacity-50"
            >
              Séparer
            </button>
          </div>
        )}

        {hasFeature("terminaux") && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface px-4 py-3">
            <p className="text-sm text-muted">
              Le ticket n&rsquo;est pas sorti en cuisine ?
            </p>
            <button
              type="button"
              onClick={() => void reprint()}
              disabled={busy}
              className="shrink-0 text-sm font-semibold text-ember-1 transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {service.orders.length > 1
                ? "Renvoyer les tickets"
                : "Renvoyer le ticket"}
            </button>
          </div>
        )}

        {toPay.length > 0 && (
          <section>
            <h3 className="mb-2 font-display text-base font-medium">Addition</h3>
            <EncaisserPanel orders={toPay} />
            {canCancel && (
              <ul className="mt-3 flex flex-col gap-1">
                {toPay.map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center justify-between gap-3 text-xs text-faint"
                  >
                    <span>
                      Commande de {formatTime(order.createdAt)} ·{" "}
                      {formatPrice(orderTotal(order))}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCancelling(order)}
                      className="font-semibold text-ember-3 transition-opacity hover:opacity-80"
                    >
                      Annuler
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {toServe.length > 0 && (
          <section>
            <h3 className="mb-2 font-display text-base font-medium">Service</h3>
            <ServirPanel orders={toServe} />
          </section>
        )}
      </div>

      {cancelling && (
        <ConfirmDialog
          title="Annuler la commande ?"
          message={`La commande de ${formatTime(cancelling.createdAt)} (${formatPrice(orderTotal(cancelling))}) sera annulée définitivement.`}
          confirmLabel="Annuler la commande"
          destructive
          onClose={() => setCancelling(null)}
          onConfirm={async () => {
            const order = cancelling;
            setCancelling(null);
            try {
              await api.updateOrderStatus(order.id, "annulee");
              toast.success("Commande annulée.");
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Une erreur est survenue."
              );
            }
          }}
        />
      )}
    </Modal>
  );
}
