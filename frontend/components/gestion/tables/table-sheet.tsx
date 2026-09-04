"use client";

import { useState } from "react";
import { EncaisserPanel } from "@/components/gestion/commandes/encaisser-card";
import { ServirPanel } from "@/components/gestion/commandes/servir-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { formatTime } from "@/lib/gestion/format";
import {
  awaitsPayment,
  awaitsService,
  orderTotal,
} from "@/lib/gestion/selectors";
import { useGestionAccess } from "@/lib/gestion/store";
import type { Order } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu-data";

/**
 * Une table en service, vue de la salle : son addition à encaisser, ses
 * plats à servir, ce qui est déjà servi. Le gérant peut y annuler une
 * commande non réglée (client parti).
 */
export function TableSheet({
  tableNo,
  orders,
  onClose,
}: {
  tableNo: number;
  orders: Order[];
  onClose: () => void;
}) {
  const { can } = useGestionAccess();
  const toast = useToast();
  const [cancelling, setCancelling] = useState<Order | null>(null);

  const toPay = orders.filter(awaitsPayment);
  const toServe = orders.filter(awaitsService);
  const canCancel = can("orders.setStatus:annulee");

  return (
    <Modal title={`Table ${tableNo}`} onClose={onClose}>
      <div className="flex flex-col gap-6">
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
