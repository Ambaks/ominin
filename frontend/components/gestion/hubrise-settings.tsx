"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SettingsCard } from "@/app/menu/gestion/etablissement/settings-card";
import { AlertIcon } from "@/components/gestion/icons";
import { Chip, ConfirmSheet, Field, GlassButton, Input, Shimmer } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { describeError } from "@/lib/gestion/errors";
import { sinceLabel } from "@/lib/gestion/format";

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
    paymentRefCash: string | null;
    paymentRefCard: string | null;
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

/** Commandes que la caisse n'a pas reçues : ce qui mérite un bandeau en tête de page. */
export function hubriseProblems(status: HubriseStatus | null): number {
  return status?.outbox ? status.outbox.blocked + status.outbox.dead : 0;
}

function errorMessage(code: string | null): string {
  if (code === "autorisation_refusee") return "l'autorisation a été refusée dans HubRise.";
  if (code === "session_invalide") return "la session a expiré, réessayez.";
  if (code === "session_gerant") return "la session du compte gérant n'est plus active.";
  if (code === "configuration") return "HubRise a refusé la configuration. Le détail est dans les journaux.";
  return "réessayez.";
}

function Identity({ label, name, id }: { label: string; name?: string | null; id?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-g-meta text-muted">{label}</dt>
      <dd className="text-g-label">
        {name ?? "—"}
        {id && <span className="block break-all font-mono text-g-meta text-muted">{id}</span>}
      </dd>
    </div>
  );
}

/** Point d'état d'une pastille (connectée, refusée). */
export function StatusDot() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="5" />
    </svg>
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
      toast.error(describeError(error).message);
    }
    setSaving(false);
  };

  return (
    <details className="group rounded-g-card border border-hairline [interpolate-size:allow-keywords] [&::details-content]:h-0 [&::details-content]:overflow-hidden [&::details-content]:transition-[height,content-visibility] [&::details-content]:duration-(--g-morph-dur) [&::details-content]:ease-(--g-ease-move) [&::details-content]:[transition-behavior:allow-discrete] open:[&::details-content]:h-auto motion-reduce:[&::details-content]:transition-none">
      <summary className="flex min-h-g-control cursor-pointer list-none items-center justify-between gap-3 px-4 text-g-label font-semibold touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1">
        Codes de votre caisse
        <span className="text-g-meta font-normal text-muted group-open:hidden">Facultatif</span>
      </summary>
      <form onSubmit={save} className="flex flex-col gap-4 border-t border-hairline p-4">
        <p className="text-g-meta text-muted">
          Certaines caisses exigent un code pour le mode de paiement ou le type de commande ; vous
          le trouvez dans leur arrière-boutique. Laissé vide, la caisse applique ses valeurs par
          défaut.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mode de paiement : nom">
            <Input value={values.paymentName ?? ""} onChange={set("paymentName")} placeholder="Carte (Ominin)" />
          </Field>
          <Field label="Mode de paiement : code">
            <Input value={values.paymentRef ?? ""} onChange={set("paymentRef")} />
          </Field>
          {/* Encaissé au comptoir dans Ominin : la caisse le range dans ses
              propres modes, et reconnaît les espèces qu'elle encaisse. */}
          <Field
            label="Espèces au comptoir : code"
            hint="Sans lui, les espèces prises à la caisse comptent comme carte dans Ominin."
          >
            <Input value={values.paymentRefCash ?? ""} onChange={set("paymentRefCash")} />
          </Field>
          <Field label="Carte au comptoir : code">
            <Input value={values.paymentRefCard ?? ""} onChange={set("paymentRefCard")} />
          </Field>
          <Field label="Sur place : code">
            <Input value={values.serviceTypeRefEatIn ?? ""} onChange={set("serviceTypeRefEatIn")} />
          </Field>
          <Field label="À emporter : code">
            <Input value={values.serviceTypeRefCollection ?? ""} onChange={set("serviceTypeRefCollection")} />
          </Field>
          <Field label="Pourboire : code">
            <Input value={values.tipChargeRef ?? ""} onChange={set("tipChargeRef")} />
          </Field>
        </div>
        <div className="flex justify-end">
          <GlassButton variant="primary" type="submit" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer les codes"}
          </GlassButton>
        </div>
      </form>
    </details>
  );
}

export function HubriseSettings({
  onStatus,
  onReturn,
}: {
  /** La page lit le statut aussi : horaires tenus par la caisse, bandeau d'alerte. */
  onStatus?: (status: HubriseStatus) => void;
  /** Retour de l'autorisation HubRise : la page montre la carte, repliée sinon. */
  onReturn?: () => void;
}) {
  const toast = useToast();
  const [status, setStatus] = useState<HubriseStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  // Les rappels de la page changent à chaque rendu : la relecture ne les suit pas.
  const callbacks = useRef({ onStatus, onReturn });
  useEffect(() => {
    callbacks.current = { onStatus, onReturn };
  });

  const load = useCallback(async () => {
    const next = await fetchHubriseStatus();
    setStatus(next);
    callbacks.current.onStatus?.(next);
  }, []);

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
      callbacks.current.onReturn?.();
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
      toast.error(describeError(error).message);
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
      toast.error(describeError(error).message);
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
      toast.error(describeError(error).message);
    }
    setBusy(false);
  };

  const connected = status?.connected;
  const problems = hubriseProblems(status);
  const mapped = status?.mapping?.mapped ?? 0;
  const total = status?.mapping?.total ?? 0;

  return (
    <SettingsCard
      id="caisse"
      className="scroll-mt-28"
      title="Caisse connectée (HubRise)"
      text="Les commandes de votre menu arrivent directement dans votre caisse (Popina, Zelty, Clyo…), sans ressaisie. Votre caisse nous rend aussi ses stocks, ses horaires et l'état de chaque commande."
      right={
        connected ? (
          status.blocked ? (
            <Chip tone="problem" icon={<StatusDot />}>Connexion à renouveler</Chip>
          ) : (
            <span className="[--g-entity:var(--status-signed)]">
              <Chip icon={<StatusDot />}>Connectée</Chip>
            </span>
          )
        ) : undefined
      }
    >
      {status === null ? (
        <Shimmer className="h-g-control" />
      ) : !connected ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-g-label text-muted">
            Votre caisse doit d&rsquo;abord être reliée à HubRise depuis son arrière-boutique.
          </p>
          <GlassButton variant="primary" onClick={() => void connect()} disabled={busy}>
            {busy ? "Redirection…" : "Connecter HubRise"}
          </GlassButton>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {status.blocked && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 flex-1 text-g-label text-muted">
                HubRise a refusé notre accès (abonnement impayé, accès révoqué ou bloqué). Vos clients
                commandent normalement ; les commandes attendent dans Ominin et partent dès la
                reconnexion.
              </p>
              <GlassButton variant="primary" onClick={() => void connect()} disabled={busy}>
                Reconnecter
              </GlassButton>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-3">
            <Identity label="Compte" name={status.accountName} />
            <Identity label="Point de vente" name={status.locationName} id={status.locationId} />
            <Identity label="Catalogue" name={status.catalogName} id={status.catalogId} />
            <Identity label="Liste de clients" name={status.customerListName} id={status.customerListId} />
          </dl>

          <div className="flex flex-col gap-3 border-t border-hairline pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-g-label font-semibold">Synchronisation</p>
              <GlassButton onClick={() => void refresh()} disabled={busy || status.blocked}>
                {busy ? "Lecture…" : "Tout relire"}
              </GlassButton>
            </div>
            <dl className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["Catalogue", status.syncedAt?.catalog],
                  ["Stocks", status.syncedAt?.inventory],
                  ["Horaires", status.syncedAt?.hours],
                ] as const
              ).map(([label, at]) => (
                <div key={label}>
                  <dt className="text-g-meta text-muted">{label}</dt>
                  <dd className="text-g-label">{sinceLabel(at)}</dd>
                </div>
              ))}
            </dl>
            {status.hoursNote && <p className="text-g-meta text-muted">{status.hoursNote}</p>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-g-label font-semibold">
                Carte ↔ caisse
                {mapped < total && (
                  <Chip tone="problem" icon={<StatusDot />}>
                    {total - mapped} sans code
                  </Chip>
                )}
              </p>
              <p className="mt-0.5 text-g-meta text-muted">
                {mapped} sur {total} articles ont leur code. Sans code, la caisse reçoit la ligne sans
                la reconnaître, et certaines la refusent.
              </p>
            </div>
            <GlassButton href="/gestion/caisse">Associer la carte</GlassButton>
          </div>

          {problems > 0 ? (
            <p className="flex items-start gap-1.5 text-g-label font-medium">
              <AlertIcon className="mt-px size-4 shrink-0 text-ember-3" />
              {`${problems} commande${problems > 1 ? "s" : ""} non transmise${problems > 1 ? "s" : ""} à la caisse.`}
            </p>
          ) : (
            <p className="text-g-label text-muted">
              {status.outbox?.pending
                ? `${status.outbox.pending} commande${status.outbox.pending > 1 ? "s" : ""} en cours d'envoi.`
                : "Toutes les commandes sont transmises à la caisse."}
            </p>
          )}

          {status.till && <TillSettings till={status.till} onSaved={() => void load()} />}

          <GlassButton onClick={() => setConfirmDisconnect(true)} disabled={busy} className="self-start">
            Déconnecter HubRise
          </GlassButton>
        </div>
      )}

      {confirmDisconnect && (
        <ConfirmSheet
          title="Déconnecter HubRise ?"
          text="Les commandes ne partiront plus vers votre caisse et ses horaires ne seront plus repris. Les correspondances de votre carte sont conservées."
          confirmLabel="Déconnecter"
          destructive
          onConfirm={() => void disconnect()}
          onClose={() => setConfirmDisconnect(false)}
        />
      )}
    </SettingsCard>
  );
}
