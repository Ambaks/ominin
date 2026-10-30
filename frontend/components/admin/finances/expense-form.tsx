"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  centsToInput,
  deleteExpense,
  deleteReceipt,
  parseCents,
  saveExpense,
  uploadReceipt,
  type Expense,
} from "@/lib/admin/finances";

export function ExpenseForm({
  expense,
  defaultDate,
  onSaved,
  onClose,
}: {
  expense: Expense | null;
  defaultDate: string;
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const toast = useToast();
  const [spentOn, setSpentOn] = useState(expense?.spent_on ?? defaultDate);
  const [label, setLabel] = useState(expense?.label ?? "");
  const [category, setCategory] = useState(expense?.category ?? "");
  const [amount, setAmount] = useState(expense ? centsToInput(expense.amount_cents) : "");
  const [vat, setVat] = useState(expense ? centsToInput(expense.vat_cents) : "");
  const [note, setNote] = useState(expense?.note ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const amountCents = parseCents(amount);
  const vatCents = vat.trim() ? parseCents(vat) : 0;
  const valid =
    label.trim() !== "" &&
    spentOn !== "" &&
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

  const save = () =>
    void run(async () => {
      const receiptPath = file ? await uploadReceipt(file) : (expense?.receipt_path ?? null);
      await saveExpense(expense?.id ?? null, {
        spent_on: spentOn,
        label: label.trim(),
        category: category.trim() || null,
        amount_cents: amountCents ?? 0,
        vat_cents: vatCents ?? 0,
        note: note.trim() || null,
        receipt_path: receiptPath,
      });
      if (file && expense?.receipt_path) await deleteReceipt(expense.receipt_path);
    }, "Dépense enregistrée.");

  return (
    <>
      <Modal
        title={expense ? "Modifier la dépense" : "Nouvelle dépense"}
        onClose={onClose}
        footer={
          <>
            {expense && (
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
              onClick={save}
              className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
            >
              Enregistrer
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Libellé" required>
            <input data-autofocus value={label} onChange={(event) => setLabel(event.target.value)} className={inputClass} />
          </Field>
          <Field label="Date du paiement" required>
            <input type="date" value={spentOn} onChange={(event) => setSpentOn(event.target.value)} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Montant TTC (€)" required>
              <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} />
            </Field>
            <Field label="Dont TVA (€)">
              <input inputMode="decimal" value={vat} onChange={(event) => setVat(event.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field label="Catégorie">
            <input list="finance-categories" value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass} />
          </Field>
          <Field label="Note">
            <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} />
          </Field>
          <Field label="Justificatif" hint={expense?.receipt_path ? "Un justificatif est déjà joint ; en choisir un autre le remplace." : undefined}>
            <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="text-sm text-muted" />
          </Field>
        </div>
      </Modal>
      {confirming && expense && (
        <ConfirmDialog
          title="Supprimer cette dépense ?"
          message={`${expense.label} et son justificatif seront supprimés.`}
          confirmLabel="Supprimer"
          destructive
          onClose={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            void run(() => deleteExpense(expense), "Dépense supprimée.");
          }}
        />
      )}
    </>
  );
}
