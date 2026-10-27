"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { sinceLabel } from "@/lib/gestion/format";

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
      const message = error instanceof Error && error.message ? error.message : "Une erreur est survenue.";
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
      <Field label="Clé d'API Popina" hint="Le support Popina vous la remet sur demande.">
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          aria-invalid={keyError !== null}
          aria-describedby={keyError ? "popina-key-error" : undefined}
          className={inputClass}
        />
      </Field>
      {keyError && (
        <p id="popina-key-error" role="alert" className="text-sm text-status-lost">
          {keyError}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !apiKey.trim()}
        className="ember-gradient self-start rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
      >
        {busy ? "Vérification…" : label}
      </button>
    </form>
  );

  return (
    <section className="flex max-w-xl flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5 lg:p-6">
      <div>
        <h2 className="font-display text-lg font-medium">Ventes de la caisse (Popina)</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Chaque vente réglée sur votre caisse arrive dans Commandes et Paiements, marquée
          «&nbsp;Caisse&nbsp;», et compte dans vos chiffres. Elle se corrige sur la caisse ;
          Ominin n&rsquo;y envoie rien par ce lien.
        </p>
      </div>

      {status === null ? (
        <div aria-busy className="shimmer h-10 rounded-xl" />
      ) : status === "unreadable" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">État de la connexion illisible pour l&rsquo;instant.</p>
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-11 rounded-full border border-hairline px-4 text-xs font-semibold hover:border-ember-2"
          >
            Réessayer
          </button>
        </div>
      ) : !status.connected ? (
        keyForm("Relier la caisse")
      ) : (
        <div className="flex flex-col gap-5">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span
              aria-hidden
              className={`size-2.5 rounded-full ${status.blocked ? "bg-status-lost" : "bg-status-signed"}`}
            />
            {status.blocked ? "Clé refusée par Popina" : "Connectée"}
            {status.locationName && <span className="font-normal text-muted">· {status.locationName}</span>}
          </p>

          {status.blocked && (
            <>
              <p className="rounded-xl border border-hairline bg-background px-4 py-3 text-sm leading-relaxed text-muted">
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
              <div key={label} className="flex flex-col gap-0.5">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-faint">{label}</dt>
                <dd className="text-sm text-muted">{at ? sinceLabel(at) : "Aucune pour l'instant"}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/gestion/paiements"
              className="inline-flex min-h-11 items-center rounded-full border border-hairline px-4 text-xs font-semibold hover:border-ember-2"
            >
              Voir dans Paiements
            </Link>
            <button
              type="button"
              onClick={() => setConfirmDisconnect(true)}
              disabled={busy}
              className="min-h-11 text-xs font-medium text-muted hover:underline disabled:opacity-60"
            >
              Déconnecter Popina
            </button>
          </div>
        </div>
      )}

      {confirmDisconnect && (
        <ConfirmDialog
          title="Déconnecter Popina ?"
          message="Les ventes réglées sur la caisse n'arriveront plus dans Ominin. Celles déjà reçues restent dans Commandes et Paiements."
          confirmLabel="Déconnecter"
          destructive
          onConfirm={() => {
            setConfirmDisconnect(false);
            void send({ method: "DELETE" }, "Popina déconnectée.");
          }}
          onClose={() => setConfirmDisconnect(false)}
        />
      )}
    </section>
  );
}
