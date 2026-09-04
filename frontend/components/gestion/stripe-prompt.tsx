"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";

/*
 * Invite à relier le compte Stripe, en tête de l'Aperçu : gérant d'une offre
 * Connect dont le paiement à table n'est pas encore possible (aucun compte
 * relié, ou vérification Stripe inachevée). Disparaît une fois le compte
 * validé, ou pour la session d'un clic sur ×.
 */

export function StripePrompt() {
  const state = useGestion();
  const { role } = useGestionAccess();
  const toast = useToast();
  const [chargesEnabled, setChargesEnabled] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  const eligible =
    state !== null &&
    role === "gerant" &&
    state.etablissement.offre === "connect" &&
    !state.etablissement.onlinePayment;

  useEffect(() => {
    if (!eligible) return;
    fetch("/api/stripe/connect")
      .then((response) => response.json())
      .then((body: { chargesEnabled?: boolean }) => {
        setChargesEnabled(Boolean(body.chargesEnabled));
      })
      .catch(() => setChargesEnabled(null));
  }, [eligible]);

  if (!eligible || dismissed || chargesEnabled !== false) return null;

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

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-ember-2/40 bg-surface p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
      <div>
        <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
          Dernière étape
        </p>
        <h2 className="mt-1 font-display text-lg font-medium">
          Reliez votre compte Stripe
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Vos clients pourront régler leur commande par carte, Apple Pay ou
          Google Pay, directement sur votre compte.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <button
          type="button"
          onClick={() => void startOnboarding()}
          disabled={busy}
          className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
        >
          {busy ? "Redirection…" : "Relier mon compte Stripe"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Masquer"
          className="text-xl leading-none text-muted"
        >
          ×
        </button>
      </div>
    </section>
  );
}
