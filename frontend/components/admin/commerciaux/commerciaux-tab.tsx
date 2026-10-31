"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  CONTRACT_END_LABELS,
  endContract,
  fetchCommerciaux,
  fetchSettings,
  inviteCommercial,
  monthCommission,
  type CommercialRow,
  type CommercialSettings,
  type EndReason,
} from "@/lib/admin/commerciaux";
import { formatEuros, fromDatetimeLocalValue } from "@/lib/admin/format";
import { commercialSiteUrl } from "@/lib/site";
import { CommercialSheet, contractLine } from "./commercial-sheet";
import { CommonSettings } from "./reglages-communs";

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
 * Commerciaux invités, ouverts chacun sur sa fiche, et les réglages communs.
 * L'invitation envoie le lien d'accès à l'espace, où le commercial lit et
 * signe son contrat.
 */
export function CommerciauxTab() {
  const toast = useToast();
  const [rows, setRows] = useState<CommercialRow[] | null>(null);
  const [settings, setSettings] = useState<CommercialSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [ending, setEnding] = useState<CommercialRow | null>(null);

  const load = () =>
    Promise.all([fetchCommerciaux(), fetchSettings()]).then(
      ([loaded, loadedSettings]) => {
        setRows(loaded);
        setSettings(loadedSettings);
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

  const open = rows?.find((row) => row.id === openId);

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
      ) : !rows || !settings ? (
        <div aria-busy className="flex flex-col gap-3">
          <div className="shimmer h-20 rounded-2xl" />
          <div className="shimmer h-20 rounded-2xl" />
        </div>
      ) : (
        <>
          {rows.length === 0 ? (
            <EmptyState title="Aucun commercial" body="Les commerciaux invités apparaissent ici, avec l'état de leur contrat." />
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(row.id)}
                    className="w-full rounded-2xl border border-hairline bg-surface p-4 text-left transition-colors hover:border-ember-2/40"
                  >
                    <p className="truncate font-medium">{row.name ?? row.email}</p>
                    {row.name && <p className="truncate text-sm text-muted">{row.email}</p>}
                    <p className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${row.signed ? "text-ember-1" : "text-faint"}`}>
                      {contractLine(row)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {(row.commissionPercent ?? settings.commission_percent).toLocaleString("fr-FR")} %
                      {row.signed && (
                        <>
                          {" · "}
                          {row.signedRestaurants} restaurant{row.signedRestaurants > 1 ? "s" : ""} inscrit
                          {row.signedRestaurants > 1 ? "s" : ""}
                          {row.signedRestaurants > 0 && <MonthCommission commercialId={row.id} />}
                        </>
                      )}
                      {!row.discordUserId && " · Discord pas relié"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <CommonSettings settings={settings} onSaved={load} />
        </>
      )}
      {open && settings && rows && (
        <CommercialSheet
          row={open}
          rows={rows}
          settings={settings}
          busy={busy === open.id}
          run={run}
          onClose={() => setOpenId(null)}
          onEnd={() => setEnding(open)}
        />
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
