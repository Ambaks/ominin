"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  fetchCommerciaux,
  inviteCommercial,
  removeCommercial,
  type CommercialRow,
} from "@/lib/admin/commerciaux";
import { formatDate, formatTime } from "@/lib/admin/format";
import { commercialSiteUrl } from "@/lib/site";

/*
 * Commerciaux indépendants : qui est invité, qui a signé. L'invitation envoie
 * le lien d'accès à l'espace, où le commercial lit et signe son contrat.
 */

const GHOST_BUTTON =
  "rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-60";

function CommercialCard({
  row,
  busy,
  onResend,
  onRemove,
}: {
  row: CommercialRow;
  busy: boolean;
  onResend: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface p-4">
      <div className="min-w-0">
        <p className="truncate font-medium">{row.name ?? row.email}</p>
        {row.name && <p className="truncate text-sm text-muted">{row.email}</p>}
        <p
          className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${
            row.signed ? "text-ember-1" : "text-faint"
          }`}
        >
          {row.signed
            ? `Signé le ${formatDate(row.signed.at)} à ${formatTime(row.signed.at)} · version ${row.signed.version}`
            : `Invité le ${formatDate(row.invitedAt)} · pas encore signé`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {row.signed && (
          <a
            href={`/api/admin/commerciaux/contrat?id=${row.id}`}
            className={GHOST_BUTTON}
          >
            Contrat (PDF)
          </a>
        )}
        <button type="button" onClick={onResend} disabled={busy} className={GHOST_BUTTON}>
          {row.signed ? "Envoyer un lien de connexion" : "Renvoyer l’invitation"}
        </button>
        {!row.signed && (
          <button type="button" onClick={onRemove} disabled={busy} className={GHOST_BUTTON}>
            Retirer
          </button>
        )}
      </div>
    </li>
  );
}

export default function CommerciauxPage() {
  const toast = useToast();
  const [rows, setRows] = useState<CommercialRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    fetchCommerciaux().then(
      (loaded) => {
        setRows(loaded);
        setError(null);
      },
      (reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Une erreur est survenue."),
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
      <div>
        <h1 className="font-display text-2xl font-medium">Commerciaux</h1>
        <p className="mt-1 text-sm text-muted">
          Invitez un commercial : il reçoit un lien vers{" "}
          <span className="text-foreground">{commercialSiteUrl}</span>, où il
          renseigne son identité et signe son contrat.
        </p>
      </div>

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
        <EmptyState
          title="Aucun commercial"
          body="Les commerciaux invités apparaissent ici, avec l'état de leur contrat."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <CommercialCard
              key={row.id}
              row={row}
              busy={busy === row.id}
              onResend={() =>
                void run(row.id, () => inviteCommercial(row.email), `Lien renvoyé à ${row.email}.`)
              }
              onRemove={() => {
                if (!window.confirm(`Retirer l’invitation de ${row.email} ? Son lien ne mènera plus à rien.`)) return;
                void run(row.id, () => removeCommercial(row.id), `Invitation de ${row.email} retirée.`);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
