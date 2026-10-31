"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { describeError } from "@/lib/gestion/errors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import { XIcon } from "./icons";
import { GlassButton, Plate } from "./ui";

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
  const [checked, setChecked] = useState(false);

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
      .catch(() => setChargesEnabled(null))
      .finally(() => setChecked(true));
  }, [eligible]);

  // Statut pas encore lu : la visite d'accueil, dont une étape montre ce
  // bandeau, attend de savoir s'il paraîtra.
  if (eligible && !checked) return <span data-visite-attente hidden />;
  if (!eligible || dismissed || chargesEnabled !== false) return null;

  const startOnboarding = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/stripe/connect", { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !body.url) {
        throw body.error ? new Error(body.error) : response;
      }
      window.location.assign(body.url);
    } catch (error) {
      toast.error(describeError(error).message);
      setBusy(false);
    }
  };

  return (
    <Plate
      data-visite="stripe"
      className="g-money flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="min-w-0">
        <p className="g-eyebrow">Paiement en ligne</p>
        <h2 className="mt-2 font-display text-g-h2">Reliez votre compte Stripe</h2>
        <p className="mt-1 text-g-body text-muted">
          Vos clients pourront régler leur commande par carte, Apple Pay ou
          Google Pay, directement sur votre compte.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <GlassButton
          variant="primary"
          data-visite="stripe-relier"
          onClick={() => void startOnboarding()}
          disabled={busy}
        >
          {busy ? "Redirection…" : "Relier mon compte Stripe"}
        </GlassButton>
        <GlassButton variant="icon" aria-label="Masquer" onClick={() => setDismissed(true)}>
          <XIcon />
        </GlassButton>
      </div>
    </Plate>
  );
}
