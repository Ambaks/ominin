"use client";

import { useEffect, useState } from "react";
import { ExternalLinkIcon } from "@/components/gestion/icons";
import { GlassButton } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { describeError } from "./describe-error";

/*
 * « Mon espace Stripe » : l'espace Express où le restaurant voit ce que ses
 * clients ont payé en ligne, son solde et ses virements. Affiché seulement
 * quand un compte Stripe est relié. Le lien de connexion est à usage unique :
 * il se demande au clic, dans un onglet ouvert d'avance pour que le
 * navigateur ne le bloque pas comme une fenêtre surgissante.
 */
export function StripeDashboardButton() {
  const toast = useToast();
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/stripe/connect")
      .then((response) => response.json())
      .then((body: { connected?: boolean }) => setConnected(Boolean(body.connected)))
      .catch(() => {});
  }, []);

  if (!connected) return null;

  const open = async () => {
    setBusy(true);
    const tab = window.open("", "_blank");
    try {
      const response = await fetch("/api/stripe/dashboard", { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !body.url) {
        throw new Error(body.error ?? "Lien Stripe indisponible.");
      }
      if (tab) tab.location.href = body.url;
      else window.location.assign(body.url);
    } catch (error) {
      tab?.close();
      toast.error(describeError(error).message);
    }
    setBusy(false);
  };

  return (
    <GlassButton
      data-visite="stripe-espace"
      onClick={() => void open()}
      disabled={busy}
      title="Votre solde, vos virements et le détail de chaque paiement en ligne, chez Stripe"
    >
      {busy ? "Ouverture…" : "Mon espace Stripe"}
      <ExternalLinkIcon />
    </GlassButton>
  );
}
