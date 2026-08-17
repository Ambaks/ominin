"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { setOnlinePayment, setPaymentProvider } from "@/lib/gestion/api";
import { PAYMENT_PROVIDER_LABELS } from "@/lib/gestion/constants";
import type { PaymentProvider } from "@/lib/gestion/types";

/*
 * Réglage « paiement à table en ligne » (gérant). Le gérant choisit son
 * fournisseur — Stripe (compte Express, onboarding hébergé) ou SumUp (compte
 * marchand relié par OAuth) — puis active le choix « payer par carte » sur le
 * menu QR. Provider null = non décidé : un compte Stripe déjà validé vaut
 * choix Stripe (restaurants historiques), sinon le sélecteur s'affiche.
 */

interface StripeStatus {
  connected: boolean;
  chargesEnabled: boolean;
}

interface SumUpStatus {
  connected: boolean;
  merchantCode?: string;
}

const PROVIDER_TAGLINES: Record<PaymentProvider, string> = {
  stripe: "Compte Express dédié, onboarding guidé par Stripe.",
  sumup: "Votre compte SumUp existant, caisse et paiements réunis.",
};

export function PaymentSettings({
  initialEnabled,
  initialProvider,
}: {
  initialEnabled: boolean;
  initialProvider: PaymentProvider | null;
}) {
  const toast = useToast();
  const [provider, setProvider] = useState(initialProvider);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [sumupStatus, setSumupStatus] = useState<SumUpStatus | null>(null);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);

  // Retour du flux OAuth SumUp : toast unique, puis URL nettoyée pour ne pas
  // rejouer le message à la prochaine visite.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get("sumup");
    if (!outcome) return;
    if (outcome === "retour") toast.success("Compte SumUp relié.");
    if (outcome === "erreur")
      toast.error("La connexion SumUp a échoué, réessayez.");
    params.delete("sumup");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`
    );
  }, [toast]);

  // Provider indécis : un compte Stripe déjà validé tranche (historique).
  useEffect(() => {
    if (provider === "sumup") return;
    fetch("/api/stripe/connect")
      .then((response) => response.json())
      .then((body: StripeStatus & { error?: string }) => {
        setStripeStatus(
          body.error ? { connected: false, chargesEnabled: false } : body
        );
      })
      .catch(() => setStripeStatus({ connected: false, chargesEnabled: false }));
  }, [provider]);

  useEffect(() => {
    if (provider !== "sumup") return;
    fetch("/api/sumup/connect")
      .then((response) => response.json())
      .then((body: SumUpStatus & { error?: string }) => {
        setSumupStatus(body.error ? { connected: false } : body);
      })
      .catch(() => setSumupStatus({ connected: false }));
  }, [provider]);

  const effectiveProvider: PaymentProvider | null =
    provider ?? (stripeStatus?.chargesEnabled ? "stripe" : null);

  const chooseProvider = async (choice: PaymentProvider) => {
    setProvider(choice);
    try {
      await setPaymentProvider(choice);
    } catch (error) {
      setProvider(provider);
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
  };

  const resetProvider = async () => {
    const previous = provider;
    setProvider(null);
    setSumupStatus(null);
    try {
      await setPaymentProvider(null);
    } catch (error) {
      setProvider(previous);
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
  };

  const startStripeOnboarding = async () => {
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

  const startSumUpConnect = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/sumup/connect", { method: "POST" });
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

  const paymentToggle = (
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
  );

  return (
    <section className="flex max-w-xl flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5 lg:p-6">
      <div>
        <h2 className="font-display text-lg font-medium">Paiement à table</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Vos clients règlent leur commande par carte depuis leur téléphone —
          l&rsquo;argent arrive directement sur votre compte. Sans activation,
          ils règlent au comptoir comme d&rsquo;habitude.
        </p>
      </div>

      {effectiveProvider === null && stripeStatus === null ? (
        <div aria-busy className="shimmer h-10 rounded-xl" />
      ) : effectiveProvider === null ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">Choisissez votre fournisseur :</p>
          {(Object.keys(PAYMENT_PROVIDER_LABELS) as PaymentProvider[]).map(
            (value) => (
              <button
                key={value}
                type="button"
                onClick={() => void chooseProvider(value)}
                className="flex items-center justify-between gap-3 rounded-xl border border-hairline px-4 py-3 text-left transition-colors hover:border-ember-2/60"
              >
                <span>
                  <span className="block text-sm font-semibold">
                    {PAYMENT_PROVIDER_LABELS[value]}
                  </span>
                  <span className="block text-xs text-muted">
                    {PROVIDER_TAGLINES[value]}
                  </span>
                </span>
                <span aria-hidden className="text-muted">
                  →
                </span>
              </button>
            )
          )}
        </div>
      ) : effectiveProvider === "stripe" ? (
        stripeStatus === null ? (
          <div aria-busy className="shimmer h-10 rounded-xl" />
        ) : !stripeStatus.chargesEnabled ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {stripeStatus.connected
                ? "Compte Stripe créé — finalisez la vérification pour encaisser."
                : "Aucun compte de paiement relié."}
            </p>
            <button
              type="button"
              onClick={() => void startStripeOnboarding()}
              disabled={busy}
              className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
            >
              {busy
                ? "Redirection…"
                : stripeStatus.connected
                  ? "Reprendre la configuration"
                  : "Relier mon compte Stripe"}
            </button>
          </div>
        ) : (
          paymentToggle
        )
      ) : sumupStatus === null ? (
        <div aria-busy className="shimmer h-10 rounded-xl" />
      ) : !sumupStatus.connected ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Aucun compte SumUp relié.</p>
          <button
            type="button"
            onClick={() => void startSumUpConnect()}
            disabled={busy}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
          >
            {busy ? "Redirection…" : "Connecter SumUp"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Compte SumUp relié (code marchand {sumupStatus.merchantCode}).
          </p>
          {paymentToggle}
        </div>
      )}

      {provider !== null && !enabled && (
        <button
          type="button"
          onClick={() => void resetProvider()}
          className="self-start text-xs text-muted underline-offset-2 hover:underline"
        >
          Changer de fournisseur
        </button>
      )}
    </section>
  );
}
