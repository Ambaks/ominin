"use client";

import { useState } from "react";
import { EncaisserPanel } from "@/components/gestion/commandes/encaisser-card";
import { ServirPanel } from "@/components/gestion/commandes/servir-card";
import {
  Chip,
  ConfirmSheet,
  Field,
  GlassButton,
  Plate,
  Select,
  Sheet,
} from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { describeError } from "@/lib/gestion/errors";
import { formatTime } from "@/lib/gestion/format";
import {
  awaitsPayment,
  awaitsService,
  orderTotal,
  visibleStaff,
  type TableService,
} from "@/lib/gestion/selectors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import type { Order } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";

/** Titre de l'addition : une table, ou les tables réunies sous elle. */
function serviceTitle(service: TableService): string {
  const numbers = service.tables.map((table) => table.number).join(" + ");
  return service.tables.length > 1 ? `Tables ${numbers}` : `Table ${numbers}`;
}

/** Une section de la fiche : son titre, puis sa plaque ou son panneau. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="font-display text-g-h2">{title}</h3>
      {children}
    </section>
  );
}

/** Une décision de salle : une phrase, un geste à droite. */
function Row({ text, action }: { text: string; action: React.ReactNode }) {
  return (
    <Plate className="flex items-center justify-between gap-3 px-4 py-2.5">
      <p className="text-g-body text-muted">{text}</p>
      <span className="shrink-0">{action}</span>
    </Plate>
  );
}

/**
 * Une table en service, vue de la salle : son addition à encaisser et ses
 * plats à servir d'abord, ce qui se fait cent fois par service ; puis les
 * décisions de salle — qui tient la table, les tables réunies — et, en
 * dernier, le ticket à renvoyer, geste rare. Le gérant peut y annuler une
 * commande non réglée (client parti).
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
  const [busy, setBusy] = useState<"assign" | "ungroup" | "reprint" | "cancel" | null>(null);

  const toPay = service.orders.filter(awaitsPayment);
  const toServe = service.orders.filter(awaitsService);
  const canCancel = can("orders.setStatus:annulee");
  const serveurs = visibleStaff(state?.staff ?? []).filter((member) => member.role === "serveur");

  const run = async (what: NonNullable<typeof busy>, action: () => Promise<void>) => {
    setBusy(what);
    try {
      await action();
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setBusy(null);
    }
  };

  const assign = (staffId: string | null) =>
    run("assign", () => api.assignTable(service.table.id, staffId));

  /**
   * Le ticket n'est pas sorti : rouleau fini, bourrage, ticket égaré entre le
   * passe et le piano. On refait partir ce que la table a en cours, sans
   * défaire un encaissement pour le refaire.
   */
  const reprint = () =>
    run("reprint", async () => {
      const jobs = await api.reprintTickets(service.orders.map((order) => order.id));
      if (jobs === 0) {
        toast.error("Aucune imprimante déclarée.");
      } else {
        toast.success(
          service.orders.length > 1 ? "Tickets renvoyés en cuisine." : "Ticket renvoyé en cuisine."
        );
      }
    });

  const ungroup = () => {
    const groupId = service.table.groupId;
    if (!groupId) return;
    void run("ungroup", async () => {
      await api.ungroupTables(groupId);
      toast.success("Tables séparées.");
    });
  };

  const cancelOrder = (order: Order) => {
    setCancelling(null);
    void run("cancel", async () => {
      await api.updateOrderStatus(order.id, "annulee");
      toast.success("Commande annulée.");
    });
  };

  const showSalle =
    hasFeature("assignation") ||
    (hasFeature("groupes_tables") && service.tables.length > 1) ||
    hasFeature("terminaux");

  return (
    <Sheet title={serviceTitle(service)} onClose={onClose}>
      <div className="grid gap-6">
        {toPay.length > 0 && (
          <Section title="Addition">
            <EncaisserPanel orders={toPay} />
            {canCancel && (
              <ul className="grid gap-1.5">
                {toPay.map((order) => (
                  <li key={order.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                    <span className="text-g-meta text-muted">
                      Commande de {formatTime(order.createdAt)} ·{" "}
                      <span className="tabular-nums">{formatPrice(orderTotal(order))}</span>
                    </span>
                    <GlassButton
                      variant="danger"
                      disabled={busy !== null}
                      onClick={() => setCancelling(order)}
                    >
                      Annuler la commande
                    </GlassButton>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {toServe.length > 0 && (
          <Section title="Service">
            <ServirPanel orders={toServe} title={serviceTitle(service)} />
          </Section>
        )}

        {showSalle && (
          <Section title="Salle">
            {hasFeature("assignation") && (
              <Field label="Serveur">
                <Select
                  value={service.table.staffId ?? ""}
                  disabled={busy !== null}
                  onChange={(event) => void assign(event.target.value || null)}
                >
                  <option value="">Personne</option>
                  {serveurs.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </Select>
                {busy === "assign" && (
                  <span role="status" className="mt-1.5 flex">
                    <Chip>Mise à jour…</Chip>
                  </span>
                )}
              </Field>
            )}

            {hasFeature("groupes_tables") && service.tables.length > 1 && (
              <Row
                text={`${service.tables.length} tables sous une même addition.`}
                action={
                  <GlassButton disabled={busy !== null} onClick={ungroup}>
                    {busy === "ungroup" ? "Séparation…" : "Séparer"}
                  </GlassButton>
                }
              />
            )}

            {hasFeature("terminaux") && (
              <Row
                text="Le ticket n’est pas sorti en cuisine ?"
                action={
                  <GlassButton disabled={busy !== null} onClick={() => void reprint()}>
                    {busy === "reprint"
                      ? "Envoi…"
                      : service.orders.length > 1
                        ? "Renvoyer les tickets"
                        : "Renvoyer le ticket"}
                  </GlassButton>
                }
              />
            )}
          </Section>
        )}
      </div>

      {cancelling && (
        <ConfirmSheet
          title={`Annuler la commande de ${formatTime(cancelling.createdAt)} ?`}
          text={`La commande de ${formatTime(cancelling.createdAt)} (${formatPrice(orderTotal(cancelling))}) est annulée définitivement ; la table garde ses autres commandes.`}
          confirmLabel="Annuler la commande"
          cancelLabel="Garder"
          destructive
          onConfirm={() => cancelOrder(cancelling)}
          onClose={() => setCancelling(null)}
        />
      )}
    </Sheet>
  );
}
