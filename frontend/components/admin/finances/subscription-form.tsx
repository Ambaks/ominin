"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  centsToInput,
  deleteSubscription,
  parseCents,
  saveSubscription,
  type Subscription,
} from "@/lib/admin/finances";

export function SubscriptionForm({
  subscription,
  defaultDate,
  onSaved,
  onClose,
}: {
  subscription: Subscription | null;
  defaultDate: string;
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(subscription?.name ?? "");
  const [category, setCategory] = useState(subscription?.category ?? "");
  const [amount, setAmount] = useState(subscription ? centsToInput(subscription.amount_cents) : "");
  const [vat, setVat] = useState(subscription ? centsToInput(subscription.vat_cents) : "");
  const [frequency, setFrequency] = useState(subscription?.frequency ?? "monthly");
  const [startsOn, setStartsOn] = useState(subscription?.starts_on ?? defaultDate);
  const [endsOn, setEndsOn] = useState(subscription?.ends_on ?? "");
  const [note, setNote] = useState(subscription?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const amountCents = parseCents(amount);
  const vatCents = vat.trim() ? parseCents(vat) : 0;
  const valid =
    name.trim() !== "" &&
    startsOn !== "" &&
    (endsOn === "" || endsOn >= startsOn) &&
    amountCents !== null &&
    amountCents > 0 &&
    vatCents !== null &&
    vatCents <= amountCents;

  const run = async (action: () => Promise<void>, done: string) => {
    setBusy(true);
    try {
      await action();
      await onSaved();
      toast.success(done);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      setBusy(false);
    }
  };

  return (
    <>
      <Modal
        title={subscription ? "Modifier l'abonnement" : "Nouvel abonnement"}
        onClose={onClose}
        footer={
          <>
            {subscription && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming(true)}
                className="mr-auto text-sm font-semibold text-ember-3"
              >
                Supprimer
              </button>
            )}
            <button
              type="button"
              disabled={busy || !valid}
              onClick={() =>
                void run(
                  () =>
                    saveSubscription(subscription?.id ?? null, {
                      name: name.trim(),
                      category: category.trim() || null,
                      amount_cents: amountCents ?? 0,
                      vat_cents: vatCents ?? 0,
                      frequency,
                      starts_on: startsOn,
                      ends_on: endsOn || null,
                      note: note.trim() || null,
                    }),
                  "Abonnement enregistré."
                )
              }
              className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
            >
              Enregistrer
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Nom" required>
            <input data-autofocus value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Montant TTC (€)" required hint={subscription ? "Prix changé ? Mettez une date de fin ici et créez un nouvel abonnement, sinon le passé change aussi." : undefined}>
              <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} />
            </Field>
            <Field label="Dont TVA (€)">
              <input inputMode="decimal" value={vat} onChange={(event) => setVat(event.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field label="Fréquence" required>
            <select value={frequency} onChange={(event) => setFrequency(event.target.value)} className={inputClass}>
              <option value="monthly">Chaque mois</option>
              <option value="yearly">Chaque année</option>
            </select>
          </Field>
          <Field label="Premier paiement" required hint="Cette date fixe aussi le jour de chaque paiement.">
            <input type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} className={inputClass} />
          </Field>
          <Field label="Fin" hint="Vide tant que l'abonnement court.">
            <input type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} className={inputClass} />
          </Field>
          <Field label="Catégorie">
            <input list="finance-categories" value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass} />
          </Field>
          <Field label="Note">
            <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} />
          </Field>
        </div>
      </Modal>
      {confirming && subscription && (
        <ConfirmDialog
          title="Supprimer cet abonnement ?"
          message={`Tous les paiements passés de ${subscription.name} disparaissent aussi de la comptabilité. Pour un abonnement résilié, mettez plutôt une date de fin.`}
          confirmLabel="Supprimer"
          destructive
          onClose={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            void run(() => deleteSubscription(subscription.id), "Abonnement supprimé.");
          }}
        />
      )}
    </>
  );
}
