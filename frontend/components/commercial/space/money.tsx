"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useRunMutation } from "@/components/ui/toast";
import * as api from "@/lib/commercial/api";
import { euros, monthLabel } from "@/lib/commercial/labels";
import { frenchDate } from "@/lib/legal/format";
import { spaceHref, useAccount } from "./shell";
import { ErrorNote, PageTitle, SectionTitle, Skeleton, cardClass, errorMessage, ghostButton, primaryButton } from "./ui";

const STATUS: Record<api.Statement["status"], string> = {
  sent: "À facturer",
  invoiced: "Facture reçue",
  paid: "Payé",
};

function StatementCard({ statement, canAskDetail, onChange }: {
  statement: api.Statement;
  canAskDetail: boolean;
  onChange: () => void;
}) {
  const account = useAccount();
  const run = useRunMutation();
  const [open, setOpen] = useState(false);
  const [contesting, setContesting] = useState(false);
  const [note, setNote] = useState("");
  const now = new Date().toISOString();

  return (
    <li className={`${cardClass} flex flex-col gap-3`}>
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center justify-between gap-3 text-left">
        <span>
          <span className="block font-medium capitalize">{monthLabel(statement.month)}</span>
          <span className="text-xs text-muted">
            {STATUS[statement.status]}
            {statement.contested_at && !statement.contest_resolved_at ? " · contesté" : ""}
          </span>
        </span>
        <span className="font-display text-xl">{euros(statement.total_cents)}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-1.5 border-t border-hairline pt-3 text-sm">
          {statement.lines.map((line) => (
            <p key={line.client_id} className="flex justify-between gap-3">
              <span className="text-muted">{line.name} · assiette {euros(line.base_cents)}</span>
              <span>{euros(line.commission_cents)}</span>
            </p>
          ))}
          {statement.adjustments.map((adjustment) => (
            <p key={`${adjustment.label}-${adjustment.cents}`} className="flex justify-between gap-3">
              <span className="text-muted">
                {adjustment.label}
                {adjustment.month ? ` (${monthLabel(adjustment.month)})` : ""}
              </span>
              <span>{euros(adjustment.cents)}</span>
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1 text-xs text-muted">
        {statement.payment_due && !statement.paid_at && <p>Paiement attendu avant le {frenchDate(statement.payment_due)}.</p>}
        {statement.paid_at && <p>Payé le {frenchDate(statement.paid_at)}.</p>}
        {statement.detail_requested_at && (
          <p>
            Détail demandé le {frenchDate(statement.detail_requested_at)}
            {statement.detail_sent_at ? ", envoyé." : `, réponse avant le ${frenchDate(statement.detail_due!)}.`}
          </p>
        )}
        {statement.contested_at && (
          <p>
            Contesté le {frenchDate(statement.contested_at)} : {statement.contest_note}
          </p>
        )}
        {statement.contest_resolved_at ? (
          <p className="text-foreground">
            Réponse d’Ominin le {frenchDate(statement.contest_resolved_at)} : {statement.contest_resolution}
          </p>
        ) : (
          statement.contested_at && <p>Ominin examine votre contestation.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={`/api/commercial/releves/${statement.id}`} target="_blank" className={ghostButton}>
          PDF
        </a>
        {!statement.invoice_path && !statement.paid_at && (
          <label className={`${primaryButton} cursor-pointer`}>
            Déposer ma facture
            <input
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void run(async () => { await api.sendInvoice(account.id, statement.id, file); onChange(); }, "Facture déposée");
              }}
            />
          </label>
        )}
        {canAskDetail && !statement.detail_requested_at && (
          <button
            type="button"
            onClick={() => void run(async () => { await api.requestDetail(statement.id); onChange(); }, "Détail demandé")}
            className={ghostButton}
          >
            Demander le détail
          </button>
        )}
        {!statement.contested_at && statement.contest_until > now && (
          <button type="button" onClick={() => setContesting(true)} className={ghostButton}>
            Contester
          </button>
        )}
      </div>

      {contesting && (
        <Modal
          title={`Contester le relevé de ${monthLabel(statement.month)}`}
          onClose={() => setContesting(false)}
          footer={
            <button
              type="button"
              disabled={!note.trim()}
              onClick={() =>
                void run(async () => {
                  await api.contest(statement.id, note);
                  setContesting(false);
                  onChange();
                }, "Contestation envoyée")
              }
              className={`${primaryButton} w-full`}
            >
              Contester
            </button>
          }
        >
          <Field label="Ce que vous contestez" required hint={`Possible jusqu’au ${frenchDate(statement.contest_until)} (article 5.4).`}>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} className={`${inputClass} resize-none`} />
          </Field>
        </Modal>
      )}
    </li>
  );
}

/*
 * Argent : ce que le mois en cours rapporte déjà (estimation, même calcul que
 * le relevé), puis les relevés — facture à déposer, paiement, détail,
 * contestation. Reste ouvert après la fin du contrat (article 8).
 */
export function MoneyScreen() {
  const [data, setData] = useState(api.money.last);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => api.money().then(setData, (cause: unknown) => setError(errorMessage(cause))), []);
  // Ce que rapportent les restaurants change en continu : relu à chaque retour sur l'écran.
  useEffect(() => {
    void load();
    const refresh = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [load]);

  if (error) return <ErrorNote message={error} onRetry={() => void load()} />;
  if (!data) return <Skeleton />;
  const estimate = data.estimate.lines.reduce((sum, line) => sum + line.commission_cents, 0);
  const canAskDetail = !data.next_detail_at || data.next_detail_at <= new Date().toISOString();

  return (
    <div className="flex flex-col gap-7">
      <PageTitle>Argent</PageTitle>

      <section className={`${cardClass} flex flex-col gap-2`}>
        <SectionTitle>Ce mois-ci, estimé</SectionTitle>
        <p className="font-display text-3xl">{euros(estimate)}</p>
        {data.estimate.lines.map((line) => (
          <Link key={line.client_id} href={spaceHref(`/restaurant/${line.restaurant_id}`)} className="flex justify-between gap-3 text-sm">
            <span className="text-muted underline">{line.name}</span>
            <span>{euros(line.commission_cents)}</span>
          </Link>
        ))}
        <p className="text-xs text-faint">
          {data.estimate.percent} % de ce qu’Ominin encaisse sur vos clients. Le relevé du mois fait foi.
        </p>
      </section>

      {data.urssaf_due && (
        <p className="rounded-2xl border border-ember-2/30 bg-ember-2/10 px-4 py-3 text-sm">
          Vos commissions ont atteint le seuil de l’article 2.5 : déposez votre attestation de vigilance URSSAF dans Mon compte.
        </p>
      )}

      <section className="flex flex-col gap-2.5">
        <SectionTitle>Relevés</SectionTitle>
        {data.statements.length === 0 ? (
          <p className={`${cardClass} text-sm text-muted`}>Votre premier relevé arrive avant le 10 du mois qui suit votre première commission.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.statements.map((statement) => (
              <StatementCard key={statement.id} statement={statement} canAskDetail={canAskDetail} onChange={() => void load()} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Pièces du commercial (art. 2.5) : avis SIRENE à la signature, attestations URSSAF. */
export function Documents() {
  const account = useAccount();
  const run = useRunMutation();
  const [data, setData] = useState(api.money.last);
  const load = useCallback(() => api.money().then(setData), []);
  useEffect(() => void load(), [load]);
  if (!data) return null;
  const last = (kind: "sirene" | "urssaf") => data.documents.find((document) => document.kind === kind);

  return (
    <section className="flex flex-col gap-2.5">
      <SectionTitle>Pièces</SectionTitle>
      <div className={`${cardClass} flex flex-col gap-3 text-sm`}>
        {(["sirene", "urssaf"] as const).map((kind) => (
          <div key={kind} className="flex items-center justify-between gap-3">
            <span>
              <span className="block font-medium">{kind === "sirene" ? "Avis de situation SIRENE" : "Attestation de vigilance URSSAF"}</span>
              <span className="text-xs text-muted">
                {last(kind)
                  ? `Déposé le ${frenchDate(last(kind)!.uploaded_at)}`
                  : kind === "urssaf" && !data.urssaf_due
                    ? "Pas encore demandée"
                    : "À déposer"}
              </span>
            </span>
            <label className={`${ghostButton} cursor-pointer`}>
              Déposer
              <input
                type="file"
                accept="application/pdf,image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void run(async () => { await api.addDocument(account.id, kind, file); await load(); }, "Pièce déposée");
                }}
              />
            </label>
          </div>
        ))}
        {data.urssaf_due && <p className="text-ember-3">Attestation URSSAF due (article 2.5).</p>}
      </div>
    </section>
  );
}
