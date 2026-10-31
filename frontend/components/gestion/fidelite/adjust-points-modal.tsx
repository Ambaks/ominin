"use client";

import { useState } from "react";
import { GlassButton } from "@/components/gestion/ui";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { LoyaltyCustomer } from "@/lib/gestion/fidelite";
import { formatDateTime } from "@/lib/gestion/format";

/**
 * Un client : son solde, sa dernière commande, et le geste commercial — des
 * points en plus ou en moins. Sans client (« Offrir des points »), son
 * contact suffit à l'inscrire. L'effacement RGPD vit en bas, à l'écart.
 */
export function AdjustPointsModal({
  customer,
  onSubmit,
  onErase,
  onClose,
}: {
  /** Client existant ; null pour en saisir un. */
  customer: LoyaltyCustomer | null;
  /** Ne rejette jamais : l'appelant signale l'erreur et laisse le formulaire ouvert. */
  onSubmit: (contact: string, points: number) => Promise<void>;
  onErase?: () => void;
  onClose: () => void;
}) {
  const [contact, setContact] = useState(customer?.contact ?? "");
  const [points, setPoints] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (sign: 1 | -1) => {
    setBusy(true);
    try {
      await onSubmit(contact.trim(), sign * Number(points));
    } finally {
      setBusy(false);
    }
  };

  const amount = Number(points);
  const valid = contact.trim() !== "" && Number.isInteger(amount) && amount > 0;
  const help =
    contact.trim() === ""
      ? "Indiquez un téléphone ou un email."
      : !valid
        ? "Indiquez un nombre entier de points."
        : null;

  return (
    <Modal
      title={customer ? customer.contact : "Offrir des points"}
      onClose={onClose}
      footer={
        <>
          {customer && onErase && (
            <button
              type="button"
              onClick={onErase}
              className="mr-auto text-g-label font-semibold text-muted underline-offset-4 hover:text-foreground hover:underline"
            >
              Effacer ce client
            </button>
          )}
          <GlassButton disabled={busy || !valid} onClick={() => void submit(-1)}>
            Retirer
          </GlassButton>
          <GlassButton variant="primary" disabled={busy || !valid} onClick={() => void submit(1)}>
            Ajouter
          </GlassButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {customer ? (
          <dl className="grid grid-cols-2 gap-3 rounded-g-card border border-hairline bg-background p-4">
            <div>
              <dt className="text-g-meta text-muted">Solde</dt>
              <dd className="mt-1 text-g-kpi tabular-nums">
                {customer.points.toLocaleString("fr-FR")} <span className="text-g-label font-medium text-muted">pts</span>
              </dd>
            </div>
            <div>
              <dt className="text-g-meta text-muted">Dernière commande</dt>
              <dd className="mt-1 text-g-body tabular-nums">{formatDateTime(customer.lastActivity)}</dd>
              {customer.hubriseCustomerId && (
                <dd className="mt-1 truncate text-g-meta text-muted" title={customer.hubriseCustomerId}>
                  HubRise · {customer.hubriseCustomerId}
                </dd>
              )}
            </div>
          </dl>
        ) : (
          <Field label="Téléphone ou email" required>
            <input
              data-autofocus
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              placeholder="06 12 34 56 78"
              autoComplete="off"
              className={inputClass}
            />
          </Field>
        )}
        <Field label="Points" required hint={help ?? undefined}>
          <input
            data-autofocus={customer ? true : undefined}
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={points}
            onChange={(event) => setPoints(event.target.value)}
            placeholder="10"
            className={inputClass}
          />
        </Field>
      </div>
    </Modal>
  );
}
