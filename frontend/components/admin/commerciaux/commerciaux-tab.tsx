"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  CONTRACT_END_LABELS,
  endContract,
  exerciseOption,
  fetchCommerciaux,
  inviteCommercial,
  monthCommission,
  removeCommercial,
  type CommercialRow,
  type EndReason,
} from "@/lib/admin/commerciaux";
import { formatDate, formatEuros, formatTime, fromDatetimeLocalValue } from "@/lib/admin/format";
import { commercialSiteUrl } from "@/lib/site";

export const GHOST_BUTTON =
  "rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-60";

function contractLine(row: CommercialRow): string {
  if (!row.signed) return `Invité le ${formatDate(row.invitedAt)} · pas encore signé`;
  const signed = `Signé le ${formatDate(row.signed.at)} à ${formatTime(row.signed.at)} · version ${row.signed.version}`;
  if (row.endedAt) {
    const past = row.endedAt <= new Date().toISOString();
    return `${signed} · ${past ? "terminé" : "prend fin"} le ${formatDate(row.endedAt)}${row.endReason ? ` (${CONTRACT_END_LABELS[row.endReason]})` : ""}`;
  }
  return `${signed}${row.optionExercisedAt ? " · option levée" : ""}`;
}

/** Commission estimée du mois en cours (même calcul que le relevé). */
function MonthCommission({ commercialId }: { commercialId: string }) {
  const [cents, setCents] = useState<number | null>(null);
  useEffect(() => {
    void monthCommission(commercialId).then(setCents);
  }, [commercialId]);
  return cents === null ? null : <> · {formatEuros(cents / 100)} ce mois-ci</>;
}

function EndContractModal({
  row,
  onClose,
  onDone,
}: {
  row: CommercialRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [when, setWhen] = useState("");
  const [reason, setReason] = useState<EndReason>("mutual");
  const submit = async () => {
    try {
      await endContract(row.id, fromDatetimeLocalValue(when), reason);
      toast.success("Fin de contrat enregistrée.");
      onDone();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Une erreur est survenue.");
    }
  };
  return (
    <Modal
      title={`Fin de contrat · ${row.name ?? row.email}`}
      onClose={onClose}
      footer={
        <button
          type="button"
          disabled={!when}
          onClick={() => void submit()}
          className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
        >
          Enregistrer
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Date de fin" required>
          <input type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} className={inputClass} />
        </Field>
        <Field label="Motif">
          <select value={reason} onChange={(event) => setReason(event.target.value as EndReason)} className={inputClass}>
            {(Object.keys(CONTRACT_END_LABELS) as EndReason[]).map((key) => (
              <option key={key} value={key}>
                {CONTRACT_END_LABELS[key]}
              </option>
            ))}
          </select>
        </Field>
        <p className="text-sm text-muted">
          À cette date, ses réservations sont libérées et son espace se réduit à l’argent, aux relevés et au contrat.
        </p>
      </div>
    </Modal>
  );
}

/*
 * Commerciaux invités : contrat, résultats (déclarations actives,
 * inscriptions), fin de contrat et option. L'invitation envoie le lien
 * d'accès à l'espace, où le commercial lit et signe son contrat.
 */
export function CommerciauxTab() {
  const toast = useToast();
  const [rows, setRows] = useState<CommercialRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [ending, setEnding] = useState<CommercialRow | null>(null);

  const load = () =>
    fetchCommerciaux().then(
      (loaded) => {
        setRows(loaded);
        setError(null);
      },
      (reason: unknown) => setError(reason instanceof Error ? reason.message : "Une erreur est survenue.")
    );
  useEffect(() => void load(), []);

  const run = async (key: string, action: () => Promise<void>, done: string) => {
    setBusy(key);
    try {
      await action();
      toast.success(done);
      return true;
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Une erreur est survenue.");
      return false;
    } finally {
      // Même en échec : une invitation dont l'e-mail n'est pas parti a sa fiche.
      await load();
      setBusy(null);
    }
  };

  const onInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (await run("invite", () => inviteCommercial(address), `Invitation envoyée à ${address}.`)) {
      setEmail("");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">
        Invitez un commercial : il reçoit un lien vers <span className="text-foreground">{commercialSiteUrl}</span>, où il
        renseigne son identité et signe son contrat.
      </p>
      <form
        onSubmit={onInvite}
        className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <Field label="E-mail du commercial" required>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="off"
              disabled={busy === "invite"}
              className={inputClass}
            />
          </Field>
        </div>
        <button
          type="submit"
          disabled={busy === "invite"}
          className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
        >
          {busy === "invite" ? "Envoi…" : "Inviter"}
        </button>
      </form>

      {error ? (
        <EmptyState title="Chargement impossible" body={error} />
      ) : !rows ? (
        <div aria-busy className="flex flex-col gap-3">
          <div className="shimmer h-20 rounded-2xl" />
          <div className="shimmer h-20 rounded-2xl" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="Aucun commercial" body="Les commerciaux invités apparaissent ici, avec l'état de leur contrat." />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{row.name ?? row.email}</p>
                {row.name && <p className="truncate text-sm text-muted">{row.email}</p>}
                <p
                  className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${
                    row.signed ? "text-ember-1" : "text-faint"
                  }`}
                >
                  {contractLine(row)}
                </p>
                {row.signed && (
                  <p className="mt-1 text-xs text-muted">
                    {row.active} déclaration{row.active > 1 ? "s" : ""} en cours · {row.signedRestaurants} inscrit
                    {row.signedRestaurants > 1 ? "s" : ""}
                    {row.signedRestaurants > 0 && <MonthCommission commercialId={row.id} />}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {row.signed && (
                  <a href={`/api/admin/commerciaux/contrat?id=${row.id}`} className={GHOST_BUTTON}>
                    Contrat (PDF)
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => void run(row.id, () => inviteCommercial(row.email), `Lien renvoyé à ${row.email}.`)}
                  disabled={busy === row.id}
                  className={GHOST_BUTTON}
                >
                  {row.signed ? "Envoyer un lien de connexion" : "Renvoyer l’invitation"}
                </button>
                {row.signed && !row.endedAt && !row.optionExercisedAt && (
                  <button
                    type="button"
                    disabled={busy === row.id}
                    onClick={() => {
                      if (!window.confirm(`Lever l’option de prolongation pour ${row.name ?? row.email} (article 3.3) ? Prévenez-le par écrit.`)) return;
                      void run(row.id, () => exerciseOption(row.id), "Option levée.");
                    }}
                    className={GHOST_BUTTON}
                  >
                    Lever l’option
                  </button>
                )}
                {row.signed && !row.endedAt && (
                  <button type="button" onClick={() => setEnding(row)} className={GHOST_BUTTON}>
                    Fin de contrat
                  </button>
                )}
                {!row.signed && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`Retirer l’invitation de ${row.email} ? Son lien ne mènera plus à rien.`)) return;
                      void run(row.id, () => removeCommercial(row.id), `Invitation de ${row.email} retirée.`);
                    }}
                    disabled={busy === row.id}
                    className={GHOST_BUTTON}
                  >
                    Retirer
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {ending && (
        <EndContractModal
          row={ending}
          onClose={() => setEnding(null)}
          onDone={() => {
            setEnding(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
