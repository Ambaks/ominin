"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  RECURRENCE_LABELS,
  daysUntil,
  formatDueDate,
  nextDue,
  type Recurrence,
} from "@/lib/admin/echeances";
import {
  deleteDeadline,
  fetchDeadlines,
  fetchDocuments,
  fetchVendors,
  saveDeadline,
  type CompanyDocument,
  type Deadline,
  type Vendor,
} from "@/lib/admin/entreprise";
import { todayIso } from "@/lib/admin/finances";

interface Row {
  key: string;
  date: string;
  label: string;
  detail: string | null;
  deadline?: Deadline;
}

function delayLabel(days: number): string {
  if (days < 0) return `En retard de ${-days} j`;
  if (days === 0) return "Aujourd'hui";
  return `Dans ${days} j`;
}

function DeadlineForm({
  deadline,
  defaultDate,
  onSaved,
  onClose,
}: {
  deadline: Deadline | null;
  defaultDate: string;
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(deadline?.title ?? "");
  const [category, setCategory] = useState(deadline?.category ?? "");
  const [dueOn, setDueOn] = useState(deadline?.due_on ?? defaultDate);
  const [recurrence, setRecurrence] = useState(deadline?.recurrence ?? "none");
  const [note, setNote] = useState(deadline?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

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
        title={deadline ? "Modifier l'échéance" : "Nouvelle échéance"}
        onClose={onClose}
        footer={
          <>
            {deadline && (
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
              disabled={busy || !title.trim() || !dueOn}
              onClick={() =>
                void run(
                  () =>
                    saveDeadline(deadline?.id ?? null, {
                      title: title.trim(),
                      category: category.trim() || null,
                      due_on: dueOn,
                      recurrence,
                      note: note.trim() || null,
                    }),
                  "Échéance enregistrée."
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
          <Field label="Intitulé" required>
            <input data-autofocus value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} />
          </Field>
          <Field label="Date" required>
            <input type="date" value={dueOn} onChange={(event) => setDueOn(event.target.value)} className={inputClass} />
          </Field>
          <Field label="Répétition">
            <select value={recurrence} onChange={(event) => setRecurrence(event.target.value)} className={inputClass}>
              {(Object.keys(RECURRENCE_LABELS) as Recurrence[]).map((value) => (
                <option key={value} value={value}>
                  {RECURRENCE_LABELS[value]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Catégorie">
            <input value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass} />
          </Field>
          <Field label="Note">
            <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} />
          </Field>
        </div>
      </Modal>
      {confirming && deadline && (
        <ConfirmDialog
          title="Supprimer cette échéance ?"
          message={`${deadline.title} et ses prochains rappels seront supprimés.`}
          confirmLabel="Supprimer"
          destructive
          onClose={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            void run(() => deleteDeadline(deadline.id), "Échéance supprimée.");
          }}
        />
      )}
    </>
  );
}

function toRows(
  deadlines: Deadline[],
  documents: CompanyDocument[],
  vendors: Vendor[]
): Row[] {
  return [
    ...deadlines.map((deadline) => ({
      key: deadline.id,
      date: deadline.due_on,
      label: deadline.title,
      detail: [
        deadline.category,
        deadline.recurrence !== "none"
          ? RECURRENCE_LABELS[deadline.recurrence as Recurrence]
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
      deadline,
    })),
    ...documents.flatMap((document) =>
      document.expires_on
        ? [{ key: document.id, date: document.expires_on, label: `${document.title} expire`, detail: "Depuis Documents" }]
        : []
    ),
    ...vendors.flatMap((vendor) =>
      vendor.renewal_on
        ? [{ key: vendor.id, date: vendor.renewal_on, label: `Renouvellement ${vendor.name}`, detail: "Depuis Prestataires" }]
        : []
    ),
  ].sort((a, b) => a.date.localeCompare(b.date));
}

export default function EcheancesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ row: Deadline | null } | null>(null);
  const today = todayIso();

  const load = useCallback(async () => {
    const [deadlines, documents, vendors] = await Promise.all([
      fetchDeadlines(),
      fetchDocuments(),
      fetchVendors(),
    ]);
    setRows(toRows(deadlines, documents, vendors));
  }, []);

  useEffect(() => {
    // Faux positif : le setState de load() suit la réponse réseau.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((error) => {
      const message = error instanceof Error ? error.message : "Une erreur est survenue.";
      setLoadError(message);
      toast.error(message);
    });
    // toast est stable (contexte) ; l'écran ne se charge qu'une fois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const markDone = async (deadline: Deadline) => {
    try {
      const { recurrence } = deadline;
      await saveDeadline(
        deadline.id,
        recurrence === "none"
          ? { title: deadline.title, due_on: deadline.due_on, done_at: new Date().toISOString() }
          : {
              title: deadline.title,
              due_on: nextDue(deadline.due_on, recurrence as Exclude<Recurrence, "none">),
            }
      );
      await load();
      toast.success(
        recurrence === "none" ? "Échéance terminée." : "C'est fait : la suivante est programmée."
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  };

  if (loadError) return <EmptyState title="Chargement impossible" body={loadError} />;
  if (!rows) return <div aria-busy className="shimmer h-64 rounded-2xl" />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium">Échéances</h1>
          <p className="mt-1 text-sm text-muted">
            TVA, URSSAF, assurances, domaines : tout ce qui tombe à une date.
            Un rappel arrive 7 jours avant et le jour même.
          </p>
        </div>
        <button
          type="button"
          className="ember-gradient rounded-full px-5 py-2 text-sm font-semibold text-background"
          onClick={() => setEditing({ row: null })}
        >
          Nouvelle échéance
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Aucune échéance" body="Ajoutez la première, par exemple votre prochaine déclaration de TVA." />
      ) : (
        <ul className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface px-4">
          {rows.map((row) => {
            const days = daysUntil(row.date, today);
            return (
              <li key={row.key} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-40 flex-1">
                  <p className="text-sm font-medium">{row.label}</p>
                  {row.detail && <p className="text-xs text-muted">{row.detail}</p>}
                </div>
                <p className="text-right text-xs tabular-nums">
                  <span className="block">{formatDueDate(row.date)}</span>
                  <span className={days < 0 ? "font-semibold text-ember-3" : "text-faint"}>
                    {delayLabel(days)}
                  </span>
                </p>
                {row.deadline && (
                  <span className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground"
                      onClick={() => setEditing({ row: row.deadline ?? null })}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-ember-2/40 px-3 py-1.5 text-xs font-semibold text-ember-1"
                      onClick={() => row.deadline && void markDone(row.deadline)}
                    >
                      Fait
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <DeadlineForm
          deadline={editing.row}
          defaultDate={today}
          onSaved={load}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
