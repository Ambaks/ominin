"use client";

import { useEffect, useState } from "react";

/*
 * Retour de Stripe Checkout (?paiement=succes|annule&commande=<id>). Le
 * succès n'est affiché qu'après confirmation serveur (/api/stripe/verify
 * relit la session chez Stripe) — l'URL ne fait pas foi. Un paiement annulé
 * ou non confirmé laisse la commande valable : réessayer, ou régler au
 * comptoir. Les paramètres sont retirés de l'URL aussitôt, un rechargement
 * ne rejoue pas la feuille.
 */

type State =
  | "verifying"
  | "paid"
  | "unpaid"
  | "cancelled"
  | "retrying"
  | "retry_failed";

export function PaymentReturn({
  outcome,
  orderId,
  tableNumber,
}: {
  outcome: "succes" | "annule";
  orderId: string;
  tableNumber: number | null;
}) {
  const [state, setState] = useState<State>(
    outcome === "succes" ? "verifying" : "cancelled"
  );
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("paiement");
    url.searchParams.delete("commande");
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    if (outcome !== "succes") return;
    let cancelled = false;
    fetch("/api/stripe/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    })
      .then((response) => response.json())
      .then((body: { paid?: boolean }) => {
        if (!cancelled) setState(body.paid ? "paid" : "unpaid");
      })
      .catch(() => {
        if (!cancelled) setState("unpaid");
      });
    return () => {
      cancelled = true;
    };
  }, [outcome, orderId]);

  const retry = async () => {
    setState("retrying");
    try {
      const response = await fetch("/api/stripe/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const body = (await response.json()) as { url?: string };
      if (response.ok && body.url) {
        window.location.assign(body.url);
        return;
      }
      setState("retry_failed");
    } catch {
      setState("retry_failed");
    }
  };

  if (!open) return null;

  const table = tableNumber === null ? "votre table" : `la table ${tableNumber}`;
  const counter = (
    <>
      Votre commande est enregistrée pour {table}. Réglez-la auprès
      d&rsquo;un serveur ou au comptoir&nbsp;: elle part en cuisine dès
      l&rsquo;encaissement.
    </>
  );
  const closeButton = (label: string) => (
    <button
      type="button"
      onClick={() => setOpen(false)}
      className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold"
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-t-3xl border border-hairline bg-surface p-10 text-center sm:rounded-3xl">
        {state === "verifying" ? (
          <p aria-busy className="text-sm text-muted">
            Confirmation du paiement…
          </p>
        ) : state === "paid" ? (
          <>
            <span className="ember-text font-display text-5xl">✓</span>
            <h3 className="font-display text-2xl font-medium">
              Paiement reçu — merci&nbsp;!
            </h3>
            <p className="text-sm leading-relaxed text-muted">
              Votre commande part en cuisine pour {table}. Un serveur vous
              l&rsquo;apporte dès qu&rsquo;elle est prête.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ember-gradient mt-2 rounded-full px-6 py-2.5 text-sm font-semibold text-background"
            >
              Continuer
            </button>
          </>
        ) : state === "retry_failed" ? (
          <>
            <h3 className="font-display text-xl font-medium">
              Le paiement n&rsquo;a pas pu démarrer.
            </h3>
            <p className="text-sm leading-relaxed text-muted">{counter}</p>
            {closeButton("Continuer")}
          </>
        ) : (
          <>
            <h3 className="font-display text-xl font-medium">
              {state === "cancelled" ? "Paiement annulé." : "Paiement non confirmé."}
            </h3>
            <p className="text-sm leading-relaxed text-muted">{counter}</p>
            <div className="flex gap-2">
              {closeButton("Payer au comptoir")}
              <button
                type="button"
                onClick={() => void retry()}
                disabled={state === "retrying"}
                className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
              >
                {state === "retrying" ? "Un instant…" : "Réessayer par carte"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
