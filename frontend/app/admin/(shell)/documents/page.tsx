"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { RECEIPT_URL_TTL_S } from "@/lib/admin/constants";
import { formatDueDate } from "@/lib/admin/echeances";
import {
  deleteDocumentRow,
  fetchDocuments,
  saveDocument,
  type CompanyDocument,
} from "@/lib/admin/entreprise";
import { deleteReceipt, receiptUrl, uploadReceipt } from "@/lib/admin/finances";

const DOCUMENTS_FOLDER = "documents/";

function DocumentForm({
  document: existing,
  categories,
  onSaved,
  onClose,
}: {
  document: CompanyDocument | null;
  categories: string[];
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [issuedOn, setIssuedOn] = useState(existing?.issued_on ?? "");
  const [expiresOn, setExpiresOn] = useState(existing?.expires_on ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [file, setFile] = useState<File | null>(null);
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

  const save = () =>
    void run(async () => {
      const path = file ? await uploadReceipt(file, DOCUMENTS_FOLDER) : existing?.path;
      const fileName = file?.name ?? existing?.file_name;
      if (!path || !fileName) throw new Error("Choisissez un fichier.");
      await saveDocument(existing?.id ?? null, {
        title: title.trim(),
        category: category.trim() || null,
        issued_on: issuedOn || null,
        expires_on: expiresOn || null,
        note: note.trim() || null,
        path,
        file_name: fileName,
      });
      if (file && existing) await deleteReceipt(existing.path);
    }, "Document enregistré.");

  return (
    <>
      <Modal
        title={existing ? "Modifier le document" : "Nouveau document"}
        onClose={onClose}
        footer={
          <>
            {existing && (
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
              disabled={busy || !title.trim() || (!existing && !file)}
              onClick={save}
              className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
            >
              Enregistrer
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Titre" required>
            <input data-autofocus value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} />
          </Field>
          <Field label="Fichier" required={!existing} hint={existing ? `Actuel : ${existing.file_name}. En choisir un autre le remplace.` : undefined}>
            <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="text-sm text-muted" />
          </Field>
          <Field label="Catégorie">
            <input list="document-categories" value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass} />
            <datalist id="document-categories">
              {categories.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Émis le">
              <input type="date" value={issuedOn} onChange={(event) => setIssuedOn(event.target.value)} className={inputClass} />
            </Field>
            <Field label="Expire le" hint="Rejoint les échéances.">
              <input type="date" value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field label="Note">
            <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} />
          </Field>
        </div>
      </Modal>
      {confirming && existing && (
        <ConfirmDialog
          title="Supprimer ce document ?"
          message={`${existing.title} et son fichier seront supprimés définitivement.`}
          confirmLabel="Supprimer"
          destructive
          onClose={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            void run(async () => {
              await deleteDocumentRow(existing.id);
              await deleteReceipt(existing.path);
            }, "Document supprimé.");
          }}
        />
      )}
    </>
  );
}

export default function DocumentsPage() {
  const toast = useToast();
  const [documents, setDocuments] = useState<CompanyDocument[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ row: CompanyDocument | null } | null>(null);

  const load = useCallback(async () => {
    setDocuments(await fetchDocuments());
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

  if (loadError) return <EmptyState title="Chargement impossible" body={loadError} />;
  if (!documents) return <div aria-busy className="shimmer h-64 rounded-2xl" />;

  const open = async (path: string) => {
    // Ouvert avant l'attente : passé l'appel réseau, le navigateur bloquerait.
    const tab = window.open("", "_blank");
    try {
      const url = await receiptUrl(path, RECEIPT_URL_TTL_S);
      if (tab) tab.location.href = url;
    } catch (error) {
      tab?.close();
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  };

  const categories = [
    ...new Set(documents.flatMap((row) => (row.category ? [row.category] : []))),
  ].sort();
  const needle = search.trim().toLowerCase();
  const visible = documents.filter((row) =>
    [row.title, row.category, row.file_name, row.note].some((value) =>
      value?.toLowerCase().includes(needle)
    )
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium">Documents</h1>
          <p className="mt-1 text-sm text-muted">
            Statuts, Kbis, RIB, attestations, contrats : tout au même endroit.
          </p>
        </div>
        <button
          type="button"
          className="ember-gradient rounded-full px-5 py-2 text-sm font-semibold text-background"
          onClick={() => setEditing({ row: null })}
        >
          Nouveau document
        </button>
      </div>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Chercher un document…"
        className={inputClass}
      />

      {visible.length === 0 ? (
        <EmptyState
          title="Aucun document"
          body={documents.length ? "Rien ne correspond à cette recherche." : "Déposez le premier : Kbis, statuts, RIB…"}
        />
      ) : (
        <ul className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface px-4">
          {visible.map((row) => (
            <li key={row.id} className="flex items-center gap-3 py-3">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditing({ row })}>
                <span className="block truncate text-sm font-medium">{row.title}</span>
                <span className="block truncate text-xs text-muted">
                  {[row.category, row.expires_on && `expire le ${formatDueDate(row.expires_on)}`]
                    .filter(Boolean)
                    .join(" · ") || row.file_name}
                </span>
              </button>
              <button
                type="button"
                className="shrink-0 rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground"
                onClick={() => void open(row.path)}
              >
                Ouvrir
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <DocumentForm
          document={editing.row}
          categories={categories}
          onSaved={load}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
