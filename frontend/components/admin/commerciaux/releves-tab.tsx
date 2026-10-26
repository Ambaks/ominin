"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  adjustStatement,
  draftStatement,
  fetchClientPlaces,
  fetchCommerciaux,
  fetchStatements,
  markDetailSent,
  markStatementPaid,
  openDocument,
  recordPayment,
  sendStatement,
  type ClientPlace,
  type CommercialRow,
  type StatementRow,
} from "@/lib/admin/commerciaux";
import { downloadCsv, toCsv } from "@/lib/admin/csv";
import { formatDate, formatEuros, fromDatetimeLocalValue } from "@/lib/admin/format";
import { GHOST_BUTTON } from "./commerciaux-tab";

const PRIMARY = "ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-50";
const euros = (cents: number) => formatEuros(cents / 100);
const monthLabel = (month: string) =>
  new Date(`${month}T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "Europe/Paris" });

const STATUS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé, facture attendue",
  invoiced: "Facture reçue",
  paid: "Payé",
  contested: "Contesté",
};

/*
 * Relevés (lot 3) : le brouillon du mois écoulé (créé par la tâche du 1er,
 * recalculable), les régularisations, l'envoi par e-mail avec son PDF, puis
 * facture reçue, détail demandé, contestation, paiement ; export CSV.
 */
export function RelevesTab() {
  const toast = useToast();
  const [rows, setRows] = useState<StatementRow[] | null>(null);
  const [commerciaux, setCommerciaux] = useState<CommercialRow[]>([]);
  const [adjusting, setAdjusting] = useState<StatementRow | null>(null);
  const [paying, setPaying] = useState(false);

  const load = useCallback(() => fetchStatements().then(setRows), []);
  useEffect(() => {
    void load();
    void fetchCommerciaux().then((loaded) => setCommerciaux(loaded.filter((row) => row.signed)));
  }, [load]);

  const run = async (task: () => Promise<void>, done: string) => {
    try {
      await task();
      toast.success(done);
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Une erreur est survenue.");
    }
  };

  if (!rows) return <div aria-busy className="shimmer h-40 rounded-2xl" />;
  const lastMonth = new Date();
  lastMonth.setDate(1);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const previousMonth = lastMonth.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" }).slice(0, 7) + "-01";

  const exportCsv = () =>
    downloadCsv(
      "releves-commerciaux.csv",
      toCsv(rows, [
        { header: "Commercial", value: (row) => row.commercial },
        { header: "Mois", value: (row) => row.month },
        { header: "Total (€)", value: (row) => (row.total_cents / 100).toFixed(2) },
        { header: "État", value: (row) => STATUS[row.status] },
        { header: "Envoyé", value: (row) => row.sent_at && formatDate(row.sent_at) },
        { header: "Facture reçue", value: (row) => row.invoice_received_at && formatDate(row.invoice_received_at) },
        { header: "Payé", value: (row) => row.paid_at && formatDate(row.paid_at) },
        { header: "Contesté", value: (row) => row.contest_note },
      ])
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {commerciaux.map((commercial) => (
          <button
            key={commercial.id}
            type="button"
            onClick={() => void run(() => draftStatement(commercial.id, previousMonth), `Brouillon de ${monthLabel(previousMonth)} recalculé.`)}
            className={GHOST_BUTTON}
          >
            Recalculer {monthLabel(previousMonth)} · {commercial.name ?? commercial.email}
          </button>
        ))}
        <button type="button" onClick={() => setPaying(true)} className={GHOST_BUTTON}>
          Encaissement hors Stripe
        </button>
        <button type="button" onClick={exportCsv} className={GHOST_BUTTON}>
          Export CSV
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Aucun relevé" body="Le 1er de chaque mois, la tâche quotidienne prépare le brouillon du mois écoulé pour chaque commercial qui a des clients." />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-col gap-2 rounded-2xl border border-hairline bg-surface p-4 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <span>
                  <span className="font-medium capitalize">{monthLabel(row.month)}</span>
                  <span className="text-muted"> · {row.commercial} · {STATUS[row.status]}</span>
                </span>
                <span className="font-display text-lg">{euros(row.total_cents)}</span>
              </div>
              {row.adjustments.map((adjustment) => (
                <p key={`${adjustment.label}-${adjustment.cents}`} className="text-xs text-muted">
                  {adjustment.label} : {euros(adjustment.cents)}
                </p>
              ))}
              {row.detail_requested_at && !row.detail_sent_at && (
                <p className="text-xs text-ember-3">Détail demandé le {formatDate(row.detail_requested_at)} : à envoyer.</p>
              )}
              {row.contested_at && <p className="text-xs text-ember-3">Contesté : {row.contest_note}</p>}
              <div className="flex flex-wrap gap-2">
                <a href={`/api/commercial/releves/${row.id}`} target="_blank" className={GHOST_BUTTON}>
                  PDF
                </a>
                {row.status === "draft" && (
                  <>
                    <button type="button" onClick={() => setAdjusting(row)} className={GHOST_BUTTON}>
                      Régularisation
                    </button>
                    <button type="button" onClick={() => void run(() => sendStatement(row.id), "Relevé envoyé par e-mail.")} className={PRIMARY}>
                      Envoyer
                    </button>
                  </>
                )}
                {row.invoice_path && (
                  <button type="button" onClick={() => void openDocument(row.invoice_path!)} className={GHOST_BUTTON}>
                    Facture
                  </button>
                )}
                {row.detail_requested_at && !row.detail_sent_at && (
                  <button type="button" onClick={() => void run(() => markDetailSent(row.id), "Détail envoyé.")} className={GHOST_BUTTON}>
                    Envoyer le détail
                  </button>
                )}
                {row.status !== "draft" && !row.paid_at && (
                  <button type="button" onClick={() => void run(() => markStatementPaid(row.id), "Payé.")} className={GHOST_BUTTON}>
                    Marquer payé
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {adjusting && <AdjustModal row={adjusting} onClose={() => setAdjusting(null)} onDone={() => { setAdjusting(null); void load(); }} />}
      {paying && <PaymentModal onClose={() => setPaying(false)} />}
    </div>
  );
}

function AdjustModal({ row, onClose, onDone }: { row: StatementRow; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const submit = async () => {
    try {
      await adjustStatement(row.id, label.trim(), Math.round(Number(amount.replace(",", ".")) * 100));
      onDone();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Une erreur est survenue.");
    }
  };
  return (
    <Modal
      title={`Régularisation · ${monthLabel(row.month)}`}
      onClose={onClose}
      footer={
        <button type="button" disabled={!label.trim() || !amount} onClick={() => void submit()} className={PRIMARY}>
          Ajouter
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Motif" required hint="Remboursement d’une commande Menu, impayé, contestation de paiement… (art. 4.6)">
          <input value={label} onChange={(event) => setLabel(event.target.value)} className={inputClass} />
        </Field>
        <Field label="Commission en euros" required hint="Négative pour une déduction.">
          <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" className={inputClass} />
        </Field>
      </div>
    </Modal>
  );
}

function PaymentModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [places, setPlaces] = useState<ClientPlace[]>([]);
  const [place, setPlace] = useState("");
  const [amount, setAmount] = useState("");
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => {
    void fetchClientPlaces().then(setPlaces);
  }, []);
  const submit = async () => {
    const [kind, id] = place.split(":");
    try {
      await recordPayment({ kind, id, cents: Math.round(Number(amount.replace(",", ".")) * 100), paidAt: fromDatetimeLocalValue(when), note });
      toast.success("Encaissement enregistré.");
      onClose();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Une erreur est survenue.");
    }
  };
  return (
    <Modal
      title="Encaissement hors Stripe"
      onClose={onClose}
      footer={
        <button type="button" disabled={!place || !amount || !when || !note.trim()} onClick={() => void submit()} className={PRIMARY}>
          Enregistrer
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">Commission facturée mensuellement et encaissée hors Stripe : elle entre dans l’assiette du commercial.</p>
        <Field label="Client" required>
          <select value={place} onChange={(event) => setPlace(event.target.value)} className={inputClass}>
            <option value="">—</option>
            {places.map((entry) => (
              <option key={`${entry.kind}:${entry.id}`} value={`${entry.kind}:${entry.id}`}>
                {entry.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Montant hors taxes en euros" required>
          <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" className={inputClass} />
        </Field>
        <Field label="Encaissé le" required>
          <input type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} className={inputClass} />
        </Field>
        <Field label="Description" required>
          <input value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} />
        </Field>
      </div>
    </Modal>
  );
}
