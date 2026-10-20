"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

/*
 * Connexion de la caisse du restaurant par HubRise (gérant). HubRise est le
 * hub qui relie Ominin à plus de quarante caisses (Popina, Zelty, Clyo…) :
 * le restaurant relie SA caisse à HubRise depuis l'arrière-boutique de
 * celle-ci, puis ce panneau relie HubRise à Ominin. Les commandes passent
 * alors dans sa caisse ; la caisse, elle, nous rend ses références, ses
 * stocks, ses horaires et l'état de chaque commande.
 *
 * Au retour de l'autorisation (?hubrise=retour|erreur) le panneau relit le
 * statut et le dit au gérant, comme le fait le panneau de paiement.
 */

export interface HubriseStatus {
  connected: boolean;
  blocked?: boolean;
  accountName?: string | null;
  locationName?: string | null;
  locationId?: string;
  catalogName?: string | null;
  catalogId?: string | null;
  customerListName?: string | null;
  customerListId?: string | null;
  callbackRegistered?: boolean;
  syncedAt?: { catalog: string | null; inventory: string | null; hours: string | null };
  hoursNote?: string | null;
  till?: {
    paymentRef: string | null;
    paymentName: string | null;
    serviceTypeRefEatIn: string | null;
    serviceTypeRefCollection: string | null;
    tipChargeRef: string | null;
  };
  outbox?: { pending: number; blocked: number; dead: number };
  mapping?: { mapped: number; total: number };
}

export async function fetchHubriseStatus(): Promise<HubriseStatus> {
  try {
    const response = await fetch("/api/hubrise/connect");
    const body = (await response.json()) as HubriseStatus & { error?: string };
    return body.error ? { connected: false } : body;
  } catch {
    return { connected: false };
  }
}

function errorMessage(code: string | null): string {
  if (code === "autorisation_refusee") return "l'autorisation a été refusée dans HubRise.";
  if (code === "session_invalide") return "la session a expiré, réessayez.";
  if (code === "session_gerant") return "la session du compte gérant n'est plus active.";
  if (code === "configuration") return "HubRise a refusé la configuration. Le détail est dans les journaux.";
  return "réessayez.";
}

const relative = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

function since(iso: string | null | undefined): string {
  if (!iso) return "jamais";
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  if (Math.abs(minutes) < 1) return "à l'instant";
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  if (Math.abs(minutes) < 60 * 24) return relative.format(Math.round(minutes / 60), "hour");
  return relative.format(Math.round(minutes / (60 * 24)), "day");
}

function Identity({ label, name, id }: { label: string; name?: string | null; id?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-faint">{label}</dt>
      <dd className="text-sm">
        {name ?? "—"}
        {id && <span className="ml-2 font-mono text-xs text-faint">{id}</span>}
      </dd>
    </div>
  );
}

function TillSettings({
  till,
  onSaved,
}: {
  till: NonNullable<HubriseStatus["till"]>;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [values, setValues] = useState(till);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof till) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value || null }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/hubrise/connect", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error);
      toast.success("Réglages de la caisse enregistrés.");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Une erreur est survenue.");
    }
    setSaving(false);
  };

  return (
    <details className="group rounded-xl border border-hairline">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium">
        Codes de votre caisse
        <span className="text-xs font-normal text-faint group-open:hidden">Facultatif</span>
      </summary>
      <form onSubmit={save} className="flex flex-col gap-4 border-t border-hairline p-4">
        <p className="text-xs leading-relaxed text-muted">
          Certaines caisses exigent un code pour le mode de paiement ou le type de commande ; vous
          le trouvez dans leur arrière-boutique. Laissé vide, la caisse applique ses valeurs par
          défaut.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mode de paiement : nom">
            <input value={values.paymentName ?? ""} onChange={set("paymentName")} placeholder="Carte (Ominin)" className={inputClass} />
          </Field>
          <Field label="Mode de paiement : code">
            <input value={values.paymentRef ?? ""} onChange={set("paymentRef")} className={inputClass} />
          </Field>
          <Field label="Sur place : code">
            <input value={values.serviceTypeRefEatIn ?? ""} onChange={set("serviceTypeRefEatIn")} className={inputClass} />
          </Field>
          <Field label="À emporter : code">
            <input value={values.serviceTypeRefCollection ?? ""} onChange={set("serviceTypeRefCollection")} className={inputClass} />
          </Field>
          <Field label="Pourboire : code">
            <input value={values.tipChargeRef ?? ""} onChange={set("tipChargeRef")} className={inputClass} />
          </Field>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </details>
  );
}

export function HubriseSettings() {
  const toast = useToast();
  const [status, setStatus] = useState<HubriseStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const load = useCallback(async () => setStatus(await fetchHubriseStatus()), []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const outcome = url.searchParams.get("hubrise");
    const error = url.searchParams.get("hubrise_error");
    if (outcome || error) {
      url.searchParams.delete("hubrise");
      url.searchParams.delete("hubrise_error");
      window.history.replaceState(null, "", url);
      if (outcome === "retour") toast.success("HubRise est relié.");
      else toast.error(`Connexion à HubRise impossible : ${errorMessage(error)}`);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const connect = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/hubrise/connect", { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!body.url) throw new Error(body.error);
      window.location.assign(body.url);
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Une erreur est survenue.");
      setBusy(false);
    }
  };

  const refresh = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/hubrise/catalog", { method: "POST" });
      if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error);
      toast.success("Catalogue, stocks et horaires relus.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Une erreur est survenue.");
    }
    setBusy(false);
  };

  const disconnect = async () => {
    setConfirmDisconnect(false);
    setBusy(true);
    try {
      const response = await fetch("/api/hubrise/connect", { method: "DELETE" });
      if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error);
      toast.success("HubRise est délié.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Une erreur est survenue.");
    }
    setBusy(false);
  };

  const connected = status?.connected;
  const problems = status?.outbox ? status.outbox.blocked + status.outbox.dead : 0;

  return (
    <section className="flex max-w-xl flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5 lg:p-6">
      <div>
        <h2 className="font-display text-lg font-medium">Caisse (HubRise)</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Les commandes de votre menu arrivent directement dans votre caisse (Popina, Zelty, Clyo…),
          sans ressaisie. Votre caisse nous rend aussi ses stocks, ses horaires et l&rsquo;état de
          chaque commande.
        </p>
      </div>

      {status === null ? (
        <div aria-busy className="shimmer h-10 rounded-xl" />
      ) : !connected ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Votre caisse doit d&rsquo;abord être reliée à HubRise depuis son arrière-boutique.
          </p>
          <button
            type="button"
            onClick={() => void connect()}
            disabled={busy}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
          >
            {busy ? "Redirection…" : "Connecter HubRise"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <span
                aria-hidden
                className={`size-2.5 rounded-full ${status.blocked ? "bg-status-lost" : "bg-status-signed"}`}
              />
              {status.blocked ? "Connexion à renouveler" : "Connectée"}
            </p>
            {status.blocked && (
              <button
                type="button"
                onClick={() => void connect()}
                disabled={busy}
                className="ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background disabled:opacity-60"
              >
                Reconnecter
              </button>
            )}
          </div>

          {status.blocked && (
            <p className="rounded-xl border border-hairline bg-background px-4 py-3 text-sm leading-relaxed text-muted">
              HubRise a refusé notre accès (abonnement impayé, accès révoqué ou bloqué). Vos clients
              commandent normalement ; les commandes attendent dans Ominin et partent dès la
              reconnexion.
            </p>
          )}

          <dl className="grid gap-4 sm:grid-cols-2">
            <Identity label="Compte" name={status.accountName} />
            <Identity label="Point de vente" name={status.locationName} id={status.locationId} />
            <Identity label="Catalogue" name={status.catalogName} id={status.catalogId} />
            <Identity label="Liste de clients" name={status.customerListName} id={status.customerListId} />
          </dl>

          <div className="flex flex-col gap-2 rounded-xl border border-hairline p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Synchronisation</p>
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={busy || status.blocked}
                className="text-xs font-medium text-ember-2 hover:underline disabled:opacity-60"
              >
                {busy ? "Lecture…" : "Tout relire"}
              </button>
            </div>
            <dl className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["Catalogue", status.syncedAt?.catalog],
                  ["Stocks", status.syncedAt?.inventory],
                  ["Horaires", status.syncedAt?.hours],
                ] as const
              ).map(([label, at]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                    {label}
                  </dt>
                  <dd className="text-sm text-muted">{since(at)}</dd>
                </div>
              ))}
            </dl>
            {status.hoursNote && <p className="text-xs text-muted">{status.hoursNote}</p>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline p-4">
            <div>
              <p className="text-sm font-medium">Carte associée à la caisse</p>
              <p className="mt-0.5 text-xs text-muted">
                {status.mapping?.mapped ?? 0} sur {status.mapping?.total ?? 0} articles ont leur code.
                Sans code, la caisse reçoit la ligne mais ne la reconnaît pas.
              </p>
            </div>
            <Link
              href="/gestion/caisse"
              className="rounded-full border border-hairline px-4 py-2 text-xs font-semibold hover:border-ember-2"
            >
              Associer la carte
            </Link>
          </div>

          <p className={`text-sm ${problems ? "text-status-lost" : "text-muted"}`}>
            {problems
              ? `${problems} commande${problems > 1 ? "s" : ""} non transmise${problems > 1 ? "s" : ""} à la caisse.`
              : status.outbox?.pending
                ? `${status.outbox.pending} commande${status.outbox.pending > 1 ? "s" : ""} en cours d'envoi.`
                : "Toutes les commandes sont transmises à la caisse."}
          </p>

          {status.till && <TillSettings till={status.till} onSaved={() => void load()} />}

          <button
            type="button"
            onClick={() => setConfirmDisconnect(true)}
            disabled={busy}
            className="self-start text-xs font-medium text-muted hover:underline disabled:opacity-60"
          >
            Déconnecter HubRise
          </button>
        </div>
      )}

      {confirmDisconnect && (
        <ConfirmDialog
          title="Déconnecter HubRise ?"
          message="Les commandes ne partiront plus vers votre caisse et ses horaires ne seront plus repris. Les correspondances de votre carte sont conservées."
          confirmLabel="Déconnecter"
          destructive
          onConfirm={() => void disconnect()}
          onClose={() => setConfirmDisconnect(false)}
        />
      )}
    </section>
  );
}
