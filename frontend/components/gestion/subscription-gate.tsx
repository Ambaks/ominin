"use client";

import { useEffect, useState } from "react";
import {
  OFFRE_LABELS,
  SUBSCRIPTION_POLL_MS,
} from "@/lib/gestion/constants";
import { refreshSubscription } from "@/lib/gestion/store";
import type { Offre, Role } from "@/lib/gestion/types";
import { pricingSection } from "@/lib/landing-data";

/*
 * Écran affiché à la place de l'espace de gestion tant que l'abonnement
 * n'est pas actif. Au retour de Stripe Checkout (?checkout=succes), le
 * webhook peut mettre quelques secondes à écrire en base : on relit le
 * statut périodiquement — dès qu'il passe actif, le shell réaffiche
 * l'espace et ce composant est démonté (l'intervalle est nettoyé).
 */
export function SubscriptionGate({ role, offre }: { role: Role; offre: Offre }) {
  // Jamais rendu côté serveur (le shell attend l'état) : window est sûr.
  const [confirming] = useState(() =>
    window.location.search.includes("checkout=succes")
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!confirming) return;
    const timer = setInterval(
      () => void refreshSubscription(),
      SUBSCRIPTION_POLL_MS
    );
    return () => clearInterval(timer);
  }, [confirming]);

  const activate = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/checkout", { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !body.url) {
        throw new Error(body.error ?? "Une erreur est survenue.");
      }
      window.location.assign(body.url);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Une erreur est survenue."
      );
      setBusy(false);
    }
  };

  const plan = pricingSection.plans.find((candidate) => candidate.id === offre);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-2xl border border-hairline bg-surface p-8 text-center">
      <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
        {confirming ? "Paiement reçu" : "Dernière étape"}
      </p>
      <h1 className="font-display text-2xl font-medium tracking-tight">
        {confirming
          ? "Activation en cours…"
          : "Activez votre abonnement"}
      </h1>
      {confirming ? (
        <p className="text-sm leading-relaxed text-muted">
          Merci ! Votre paiement est confirmé, votre espace s’ouvre dans
          quelques secondes.
        </p>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-muted">
            Votre établissement est prêt. Il ne reste qu’à activer l’offre{" "}
            <span className="font-semibold text-foreground">
              {OFFRE_LABELS[offre]}
            </span>
            {plan && (
              <>
                {" "}
                à{" "}
                <span className="font-semibold text-foreground">
                  {plan.price} €{pricingSection.perMonth}
                </span>
              </>
            )}
            , sans engagement.
          </p>
          {role === "gerant" ? (
            <button
              type="button"
              onClick={() => void activate()}
              disabled={busy}
              className="ember-gradient rounded-full px-6 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
            >
              Activer mon abonnement
            </button>
          ) : (
            <p className="text-sm text-faint">
              Seul le gérant peut activer l’abonnement.
            </p>
          )}
          {error && <p className="text-sm text-ember-3">{error}</p>}
        </>
      )}
    </div>
  );
}
