"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Règlement d'une commande dans la page via le widget SumUp (carte, Apple Pay
 * et Google Pay selon l'appareil). La commande est enregistrée et part en
 * cuisine une fois réglée : ce panneau ne gère que l'encaissement. Un refus
 * SumUp tue le checkout —
 * « Réessayer » en obtient un neuf auprès de /api/sumup/pay. Le succès n'est
 * affiché qu'après confirmation serveur (/api/sumup/verify relit le checkout
 * auprès de l'API SumUp).
 */

const SUMUP_WIDGET_SDK_URL =
  "https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js";
const WIDGET_CONTAINER_ID = "sumup-card";

interface SumUpCardSdk {
  mount: (options: {
    id: string;
    checkoutId: string;
    locale: string;
    onResponse: (type: string, body: unknown) => void;
  }) => { unmount?: () => void };
}

declare global {
  interface Window {
    SumUpCard?: SumUpCardSdk;
  }
}

let sdkPromise: Promise<SumUpCardSdk> | null = null;

/** Charge le SDK une seule fois — jamais pour les restaurants sur Stripe. */
function loadSdk(): Promise<SumUpCardSdk> {
  if (window.SumUpCard) return Promise.resolve(window.SumUpCard);
  sdkPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SUMUP_WIDGET_SDK_URL;
    script.onload = () => {
      if (window.SumUpCard) resolve(window.SumUpCard);
      else reject(new Error("SDK SumUp indisponible."));
    };
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("SDK SumUp indisponible."));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

type PaymentState = "widget" | "verifying" | "paid" | "declined" | "error";

export function SumUpPayment({
  orderId,
  initialCheckoutId,
  onDone,
}: {
  orderId: string;
  initialCheckoutId: string;
  /** Fin du règlement — payé, ou abandon (le client réglera au comptoir). */
  onDone: (paid: boolean) => void;
}) {
  const [checkoutId, setCheckoutId] = useState(initialCheckoutId);
  const [state, setState] = useState<PaymentState>("widget");
  const [busy, setBusy] = useState(false);
  const widgetRef = useRef<{ unmount?: () => void } | null>(null);

  const verify = useCallback(async () => {
    setState("verifying");
    try {
      const response = await fetch("/api/sumup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const body = (await response.json()) as { paid?: boolean };
      setState(response.ok && body.paid ? "paid" : "declined");
    } catch {
      setState("declined");
    }
  }, [orderId]);

  useEffect(() => {
    if (state !== "widget") return;
    let cancelled = false;
    loadSdk()
      .then((sdk) => {
        if (cancelled) return;
        widgetRef.current = sdk.mount({
          id: WIDGET_CONTAINER_ID,
          checkoutId,
          locale: "fr-FR",
          onResponse: (type) => {
            if (type === "success") void verify();
            if (type === "error" || type === "fail") setState("declined");
          },
        });
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
      widgetRef.current?.unmount?.();
      widgetRef.current = null;
    };
  }, [checkoutId, state, verify]);

  const retry = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/sumup/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const body = (await response.json()) as { checkoutId?: string };
      if (!response.ok || !body.checkoutId) throw new Error();
      setCheckoutId(body.checkoutId);
      setState("widget");
    } catch {
      setState("error");
    }
    setBusy(false);
  };

  if (state === "paid") {
    return (
      <div className="flex flex-col items-center gap-4 p-10 text-center">
        <span className="ember-text font-display text-5xl">✓</span>
        <h3 className="font-display text-2xl font-medium">
          Paiement confirmé — merci !
        </h3>
        <button
          type="button"
          onClick={() => onDone(true)}
          className="ember-gradient mt-2 rounded-full px-6 py-2.5 text-sm font-semibold text-background"
        >
          Continuer
        </button>
      </div>
    );
  }

  if (state === "declined" || state === "error") {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <h3 className="font-display text-xl font-medium">
          {state === "declined"
            ? "Paiement refusé."
            : "Le paiement n'a pas pu démarrer."}
        </h3>
        <p className="text-sm leading-relaxed text-muted">
          Vous pouvez réessayer ou régler au comptoir — votre commande est
          enregistrée et partira en cuisine dès l&rsquo;encaissement.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onDone(false)}
            className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold"
          >
            Payer au comptoir
          </button>
          <button
            type="button"
            onClick={() => void retry()}
            disabled={busy}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
          >
            {busy ? "Un instant…" : "Réessayer"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-5">
      <h3 className="font-display text-lg font-medium">Régler la commande</h3>
      {/* Conteneur du widget SumUp (formulaire carte + Apple/Google Pay). */}
      <div id={WIDGET_CONTAINER_ID} />
      {state === "verifying" && (
        <p className="text-center text-sm text-muted">
          Confirmation du paiement…
        </p>
      )}
      <button
        type="button"
        onClick={() => onDone(false)}
        className="self-center text-xs text-muted underline-offset-2 hover:underline"
      >
        Payer au comptoir plutôt
      </button>
    </div>
  );
}
