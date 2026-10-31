"use client";

import { useId, useState } from "react";
import { Field, GlassButton, Input, Sheet } from "@/components/gestion/ui";
import type { LoyaltyCustomer } from "@/lib/gestion/fidelite";
import { formatDateTime } from "@/lib/gestion/format";

const count = (n: number) => n.toLocaleString("fr-FR");
const pts = (n: number) => `${count(n)} ${n > 1 ? "points" : "point"}`;

/**
 * Un client : son solde, sa dernière activité, et le geste commercial — des
 * points en plus ou en moins. Sans client (« Offrir des points »), son
 * contact suffit à l'inscrire. L'effacement RGPD vit à gauche du pied, à
 * l'écart ; Entrée offre les points.
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
  const formId = useId();
  const [contact, setContact] = useState(customer?.contact ?? "");
  const [points, setPoints] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  const amount = Number(points);
  const amountValid = Number.isInteger(amount) && amount > 0;
  const contactValid = contact.trim() !== "";
  const overdraw = customer !== null && amountValid && amount > customer.points;
  const missing = !contactValid
    ? "Indiquez un téléphone ou un email."
    : !amountValid
      ? "Indiquez un nombre entier de points."
      : null;

  const submit = async (sign: 1 | -1) => {
    setTouched(true);
    if (missing) return;
    setBusy(true);
    try {
      await onSubmit(contact.trim(), sign * amount);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={customer ? "Ajuster les points" : "Offrir des points"}
      onClose={onClose}
      footer={
        <>
          {touched && missing ? (
            <p className="text-g-meta text-muted">{missing}</p>
          ) : overdraw ? (
            <p className="text-g-meta text-muted">Retirer au plus {pts(customer.points)}, son solde.</p>
          ) : null}
          {customer && onErase && (
            <GlassButton variant="danger" className="mr-auto" onClick={onErase}>
              Effacer ce client
            </GlassButton>
          )}
          {customer && (
            <GlassButton disabled={busy || overdraw || (touched && Boolean(missing))} onClick={() => void submit(-1)}>
              {amountValid ? `Retirer ${pts(amount)}` : "Retirer"}
            </GlassButton>
          )}
          <GlassButton variant="primary" type="submit" form={formId} disabled={busy || (touched && Boolean(missing))}>
            {amountValid ? `Offrir ${pts(amount)}` : "Offrir"}
          </GlassButton>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(1);
        }}
      >
        {customer ? (
          <dl className="grid gap-3 rounded-g-card border border-hairline bg-background p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-g-meta text-muted">Client</dt>
              <dd className="mt-0.5 break-all font-medium">{customer.contact}</dd>
            </div>
            <div>
              <dt className="text-g-meta text-muted">Solde</dt>
              <dd className="mt-1 text-g-kpi tabular-nums">
                {count(customer.points)}{" "}
                <span className="text-g-label font-medium text-muted">{customer.points > 1 ? "pts" : "pt"}</span>
              </dd>
            </div>
            <div>
              <dt className="text-g-meta text-muted">Dernière activité</dt>
              <dd className="mt-1 text-g-body tabular-nums">{formatDateTime(customer.lastActivity)}</dd>
              {customer.hubriseCustomerId && (
                <dd className="mt-1 break-all text-g-meta text-muted">HubRise · {customer.hubriseCustomerId}</dd>
              )}
            </div>
          </dl>
        ) : (
          <Field
            label="Téléphone ou email"
            required
            hint="Le contact que le client laisse en commandant."
            error={touched && !contactValid ? "Indiquez un téléphone ou un email." : undefined}
          >
            <Input
              data-autofocus
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              placeholder="06 12 34 56 78"
              autoComplete="off"
            />
          </Field>
        )}
        <Field
          label="Points"
          required
          hint="Un nombre entier."
          error={touched && !amountValid ? "Indiquez un nombre entier de points." : undefined}
        >
          <Input
            data-autofocus={customer ? true : undefined}
            numeric
            unit="pts"
            inputMode="numeric"
            value={points}
            onChange={(event) => setPoints(event.target.value)}
            placeholder="10"
            className="max-w-40"
          />
        </Field>
      </form>
    </Sheet>
  );
}
