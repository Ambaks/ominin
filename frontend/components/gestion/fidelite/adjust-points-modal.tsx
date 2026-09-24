"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";

/**
 * Geste commercial : des points en plus ou en moins pour un client — connu,
 * ou nouveau (son contact suffit à l'inscrire).
 */
export function AdjustPointsModal({
  contact: knownContact,
  onSubmit,
  onClose,
}: {
  /** Client existant ; null pour en saisir un. */
  contact: string | null;
  /** Ne rejette jamais : l'appelant signale l'erreur et laisse le formulaire ouvert. */
  onSubmit: (contact: string, points: number) => Promise<void>;
  onClose: () => void;
}) {
  const [contact, setContact] = useState(knownContact ?? "");
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

  const valid = contact.trim() !== "" && Number(points) > 0;

  return (
    <Modal
      title="Ajuster les points"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={() => void submit(-1)}
            disabled={busy || !valid}
            className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-60"
          >
            Retirer
          </button>
          <button
            type="button"
            onClick={() => void submit(1)}
            disabled={busy || !valid}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
          >
            Ajouter
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Téléphone ou email" required>
          <input
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            readOnly={knownContact != null}
            required
            placeholder="06 12 34 56 78"
            className={inputClass}
          />
        </Field>
        <Field label="Points" required>
          <input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={points}
            onChange={(event) => setPoints(event.target.value)}
            required
            className={inputClass}
          />
        </Field>
      </div>
    </Modal>
  );
}
