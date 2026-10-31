"use client";

import { useCallback, useEffect, useState } from "react";
import { SettingsCard } from "@/app/menu/gestion/etablissement/settings-card";
import { Chip, ConfirmSheet, Field, GlassButton, Input, Shimmer } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { describeError } from "@/lib/gestion/errors";
import { sinceLabel } from "@/lib/gestion/format";
import { StatusDot } from "./hubrise-settings";

/*
 * Ventes saisies sur la caisse Popina → Ominin (gérant). HubRise porte nos
 * commandes vers la caisse ; ce panneau fait le chemin inverse : le gérant
 * colle la clé d'API que le support Popina lui a remise, et chaque vente
 * réglée sur la caisse devient une commande « Caisse » dans Commandes et
 * Paiements.
 */

interface PopinaStatus {
  connected: boolean;
  blocked?: boolean;
  locationName?: string | null;
  lastSaleAt?: string | null;
  reconciledAt?: string | null;
}

/** "unreadable" : statut illisible — surtout ne pas proposer d'écraser la clé. */
async function fetchPopinaStatus(): Promise<PopinaStatus | "unreadable"> {
  try {
    const response = await fetch("/api/popina/connect");
    if (!response.ok) return "unreadable";
    return (await response.json()) as PopinaStatus;
  } catch {
    return "unreadable";
  }
}

export function PopinaSettings() {
  const toast = useToast();
  const [status, setStatus] = useState<PopinaStatus | "unreadable" | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [keyError, setKeyError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const load = useCallback(async () => setStatus(await fetchPopinaStatus()), []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const send = async (init: RequestInit, success: string) => {
    setBusy(true);
    setKeyError(null);
    try {
      const response = await fetch("/api/popina/connect", init);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error);
      }
      toast.success(success);
      setApiKey("");
      await load();
    } catch (error) {
      const message = describeError(error).message;
      if (init.method === "POST") setKeyError(message);
      else toast.error(message);
    }
    setBusy(false);
  };

  const connect = (event: React.FormEvent) => {
    event.preventDefault();
    void send(
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      },
      "Caisse Popina reliée."
    );
  };

  const keyForm = (label: string) => (
    <form onSubmit={connect} className="flex flex-col gap-3">
      <Field label="Clé d'API Popina" hint="Le support Popina vous la remet sur demande." error={keyError ?? undefined}>
        <Input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          aria-invalid={keyError !== null}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <GlassButton variant="primary" type="submit" disabled={busy || !apiKey.trim()}>
          {busy ? "Vérification…" : label}
        </GlassButton>
        {!apiKey.trim() && <p className="text-g-meta text-muted">Collez la clé pour relier.</p>}
      </div>
    </form>
  );

  const state =
    status && status !== "unreadable" && status.connected ? (
      status.blocked ? (
        <Chip tone="problem" icon={<StatusDot />}>Clé refusée</Chip>
      ) : (
        <span className="[--g-entity:var(--status-signed)]">
          <Chip icon={<StatusDot />}>Connectée</Chip>
        </span>
      )
    ) : null;

  return (
    <SettingsCard
      title="Ventes depuis la caisse (Popina)"
      text="Chaque vente réglée sur la caisse arrive dans Commandes et Paiements, marquée « Caisse » ; elle se corrige sur la caisse."
      right={state}
    >
      {status === null ? (
        <Shimmer className="h-g-control" />
      ) : status === "unreadable" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-g-label text-muted">État de la connexion illisible pour l&rsquo;instant.</p>
          <GlassButton onClick={() => void load()}>Réessayer</GlassButton>
        </div>
      ) : !status.connected ? (
        keyForm("Relier la caisse")
      ) : (
        <div className="flex flex-col gap-4">
          {status.locationName && (
            <p className="text-g-label text-muted">{status.locationName}</p>
          )}
          {status.blocked && (
            <>
              <p className="text-g-label text-muted">
                Popina n&rsquo;accepte plus la clé. Les ventes de la caisse n&rsquo;arrivent plus ;
                demandez une nouvelle clé au support Popina et collez-la ici.
              </p>
              {keyForm("Remplacer la clé")}
            </>
          )}
          <dl className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["Dernière vente reçue", status.lastSaleAt],
                ["Dernière vérification", status.reconciledAt],
              ] as const
            ).map(([label, at]) => (
              <div key={label}>
                <dt className="text-g-meta text-muted">{label}</dt>
                <dd className="text-g-label">{at ? sinceLabel(at) : "Aucune pour l'instant"}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center gap-2">
            <GlassButton href="/gestion/paiements">Voir dans Paiements</GlassButton>
            <GlassButton onClick={() => setConfirmDisconnect(true)} disabled={busy}>
              Déconnecter Popina
            </GlassButton>
          </div>
        </div>
      )}

      {confirmDisconnect && (
        <ConfirmSheet
          title="Déconnecter Popina ?"
          text="Les ventes réglées sur la caisse n'arriveront plus dans Ominin. Celles déjà reçues restent dans Commandes et Paiements."
          confirmLabel="Déconnecter"
          destructive
          onConfirm={() => {
            setConfirmDisconnect(false);
            void send({ method: "DELETE" }, "Popina déconnectée.");
          }}
          onClose={() => setConfirmDisconnect(false)}
        />
      )}
    </SettingsCard>
  );
}
