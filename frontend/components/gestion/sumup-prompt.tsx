"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";

/*
 * Invite à relier le compte SumUp, en tête de l'Aperçu. Visible pour le
 * gérant d'une offre Connect quand SumUp est choisi mais pas encore relié —
 * dont BOHO (présélectionné au seed) — ou juste après le paiement de
 * l'abonnement (?checkout=succes) si aucun fournisseur n'est encore décidé.
 */

export function SumUpPrompt() {
  const state = useGestion();
  const { role } = useGestionAccess();
  const toast = useToast();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  // Initialisation paresseuse : window absent au rendu serveur, et le premier
  // rendu est null de toute façon (connected commence à null).
  const [postCheckout] = useState(
    () =>
      typeof window !== "undefined" &&
      window.location.search.includes("checkout=succes")
  );

  const provider = state?.etablissement.paymentProvider ?? null;
  const eligible =
    state !== null &&
    role === "gerant" &&
    state.etablissement.offre === "connect" &&
    (provider === "sumup" || (provider === null && postCheckout));

  useEffect(() => {
    if (!eligible) return;
    fetch("/api/sumup/connect")
      .then((response) => response.json())
      .then((body: { connected?: boolean }) => {
        setConnected(Boolean(body.connected));
      })
      .catch(() => setConnected(null));
  }, [eligible]);

  if (!eligible || dismissed || connected !== false) return null;

  const startConnect = async () => {
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

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-ember-2/40 bg-surface p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
      <div>
        <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
          Dernière étape
        </p>
        <h2 className="mt-1 font-display text-lg font-medium">
          Connectez votre compte SumUp
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Vos clients pourront régler leur commande par carte ou Apple Pay,
          directement sur votre compte SumUp.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <Link
          href="/gestion/etablissement"
          className="text-xs text-muted underline-offset-2 hover:underline"
        >
          Choisir un autre fournisseur
        </Link>
        <button
          type="button"
          onClick={() => void startConnect()}
          disabled={busy}
          className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
        >
          {busy ? "Redirection…" : "Connecter SumUp"}
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
