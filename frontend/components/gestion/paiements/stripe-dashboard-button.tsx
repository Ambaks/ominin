"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";

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
        throw new Error(body.error ?? "Une erreur est survenue.");
      }
      if (tab) tab.location.href = body.url;
      else window.location.assign(body.url);
    } catch (error) {
      tab?.close();
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
    setBusy(false);
  };

  return (
    <button
      type="button"
      onClick={() => void open()}
      disabled={busy}
      className="min-h-11 shrink-0 rounded-full border border-hairline px-4 text-sm font-medium transition-colors hover:border-ember-2/40 disabled:opacity-60 lg:pointer-fine:min-h-9"
    >
      {busy ? "Ouverture…" : "Mon espace Stripe"}
    </button>
  );
}
