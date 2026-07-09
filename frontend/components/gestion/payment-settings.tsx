"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { setOnlinePayment } from "@/lib/gestion/api";

/*
 * Réglage « paiement à table en ligne » (gérant). Relie le compte Stripe
 * Express du restaurant (onboarding hébergé par Stripe), puis permet
 * d'activer le choix « payer par carte » sur le menu QR. Tant que Stripe
 * n'a pas validé le compte (charges_enabled), le toggle reste verrouillé.
 */

interface ConnectStatus {
  connected: boolean;
  chargesEnabled: boolean;
}

export function PaymentSettings({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const toast = useToast();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/stripe/connect")
      .then((response) => response.json())
      .then((body: ConnectStatus & { error?: string }) => {
        if (!body.error) setStatus(body);
        else setStatus({ connected: false, chargesEnabled: false });
      })
      .catch(() => setStatus({ connected: false, chargesEnabled: false }));
  }, []);

  const startOnboarding = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/stripe/connect", { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !body.url) {
        throw new Error(body.error ?? "Une erreur est survenue.");
      }
      window.location.assign(body.url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
      setBusy(false);
    }
  };

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    try {
      await setOnlinePayment(next);
      toast.success(
        next ? "Paiement en ligne activé." : "Paiement en ligne désactivé."
      );
    } catch (error) {
      setEnabled(!next);
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
  };

  return (
    <section className="flex max-w-xl flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5 lg:p-6">
      <div>
        <h2 className="font-display text-lg font-medium">Paiement à table</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Vos clients règlent leur commande par carte depuis leur téléphone —
          l&rsquo;argent arrive directement sur votre compte Stripe. Sans
          activation, ils règlent au comptoir comme d&rsquo;habitude.
        </p>
      </div>

      {status === null ? (
        <div aria-busy className="shimmer h-10 rounded-xl" />
      ) : !status.chargesEnabled ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {status.connected
              ? "Compte Stripe créé — finalisez la vérification pour encaisser."
              : "Aucun compte de paiement relié."}
          </p>
          <button
            type="button"
            onClick={() => void startOnboarding()}
            disabled={busy}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
          >
            {busy
              ? "Redirection…"
              : status.connected
                ? "Reprendre la configuration"
                : "Relier mon compte Stripe"}
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm font-medium">
            Proposer le paiement par carte sur le menu
          </span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={() => void toggle()}
            className="size-5 accent-ember-2"
          />
        </label>
      )}
    </section>
  );
}
