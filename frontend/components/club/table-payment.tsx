"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Stripe, StripeElements, StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import { themeColors } from "@/components/menu/card-payment";
import { preloadStripe } from "@/components/menu/stripe-payment";
import type { Club } from "@/lib/club/types";
import { formatCents } from "@/lib/club/format";

/*
 * Le règlement d'une table tenue. Fournisseur « demo » : une carte de
 * démonstration, rien n'est débité, /api/club/pay règle la réservation.
 * Stripe : comme le menu (stripe-payment.tsx), Apple Pay et Google Pay en
 * tête (Express Checkout), puis la carte (Payment Element), sur le compte
 * connecté du club ; /api/club/verify constate le paiement aussitôt.
 */

type State = "loading" | "ready" | "paying" | "paid" | "declined" | "error";

type Outcome = { onPaid: () => void; onExpired: () => void };

async function post(path: string, bookingId: string) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    paid?: boolean;
    error?: string;
    clientSecret?: string;
    accountId?: string;
    publishableKey?: string;
  };
  return { status: response.status, ok: response.ok, body };
}

function PayButton({ state, totalCents, onClick }: { state: State; totalCents: number; onClick?: () => void }) {
  const busy = state === "paying" || state === "loading";
  return (
    <button
      type="button"
      className="club-button club-button-primary club-button-block"
      onClick={onClick}
      disabled={busy || state === "paid"}
      aria-busy={busy || undefined}
    >
      {state === "paid" ? (
        "Payé"
      ) : state === "paying" ? (
        <>
          <span className="club-spinner" aria-hidden />
          Paiement…
        </>
      ) : (
        <>Payer {formatCents(totalCents)}</>
      )}
    </button>
  );
}

function DemoPayment({ bookingId, totalCents, onPaid, onExpired }: { bookingId: string; totalCents: number } & Outcome) {
  const [state, setState] = useState<State>("ready");
  const [error, setError] = useState<string | null>(null);
  const pay = async () => {
    setState("paying");
    setError(null);
    try {
      const { status, ok, body } = await post("/api/club/pay", bookingId);
      if (status === 410) return onExpired();
      if (ok && body.paid) {
        setState("paid");
        onPaid();
        return;
      }
      setError(body.error ?? "Le paiement n'a pas abouti.");
    } catch {
      setError("Connexion perdue. Réessayez.");
    }
    setState("ready");
  };
  return (
    <div className="club-pay">
      <div className="club-demo-card" aria-hidden>
        <span className="club-demo-card-chip" />
        <span className="club-demo-card-label">Carte de démonstration</span>
        <span className="club-demo-card-number club-nums">•••• •••• •••• 0000</span>
        <span className="club-demo-card-sheen" />
      </div>
      <p className="club-pay-note">
        <strong>Démonstration.</strong>{" "}Aucun débit n&rsquo;est effectué : la table est réservée comme
        après un vrai paiement.
      </p>
      {error && (
        <p className="club-error" role="alert">
          {error}
        </p>
      )}
      <PayButton state={state} totalCents={totalCents} onClick={() => void pay()} />
    </div>
  );
}

const EXPRESS_ID = "club-stripe-express";
const CARD_ID = "club-stripe-card";

function StripeTablePayment({ bookingId, totalCents, onPaid, onExpired }: { bookingId: string; totalCents: number } & Outcome) {
  const [state, setState] = useState<State>("loading");
  const [attempt, setAttempt] = useState(0);
  const [hasWallet, setHasWallet] = useState(false);
  const session = useRef<{ stripe: Stripe; elements: StripeElements } | null>(null);
  const outcome = useRef({ onPaid, onExpired });
  useEffect(() => {
    outcome.current = { onPaid, onExpired };
  }, [onPaid, onExpired]);

  const settle = useCallback(async () => {
    await post("/api/club/verify", bookingId).catch(() => null);
    setState("paid");
    outcome.current.onPaid();
  }, [bookingId]);

  const confirm = useCallback(
    async (express?: StripeExpressCheckoutElementConfirmEvent) => {
      const current = session.current;
      if (!current) return;
      setState("paying");
      const { error, paymentIntent } = await current.stripe.confirmPayment({
        elements: current.elements,
        redirect: "if_required",
        confirmParams: { return_url: window.location.href },
      });
      if (paymentIntent?.status === "succeeded") return settle();
      express?.paymentFailed();
      setState(error?.type === "validation_error" ? "ready" : "declined");
    },
    [settle]
  );

  useEffect(() => {
    let cancelled = false;
    let teardown = () => {};
    (async () => {
      const [{ status, ok, body }, { loadStripe }] = await Promise.all([
        post("/api/club/pay", bookingId),
        preloadStripe(),
      ]);
      if (cancelled) return;
      if (status === 410) return outcome.current.onExpired();
      if (ok && body.paid) {
        setState("paid");
        outcome.current.onPaid();
        return;
      }
      if (!ok || !body.clientSecret || !body.accountId || !body.publishableKey) {
        setState("error");
        return;
      }
      const stripe = await loadStripe(body.publishableKey, { stripeAccount: body.accountId, locale: "fr" });
      if (cancelled) return;
      if (!stripe) {
        setState("error");
        return;
      }
      const container = document.getElementById(CARD_ID)!;
      const color = themeColors(container, ["--c-raised", "--c-text", "--c-muted", "--c-line", "--c-gold", "--c-coral"]);
      const elements = stripe.elements({
        clientSecret: body.clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: color["--c-gold"],
            colorBackground: color["--c-raised"],
            colorText: color["--c-text"],
            colorTextSecondary: color["--c-muted"],
            colorTextPlaceholder: color["--c-muted"],
            colorDanger: color["--c-coral"],
            borderRadius: "12px",
          },
          rules: {
            ".Input": { borderColor: color["--c-line"], boxShadow: "none" },
            ".Input:focus": { borderColor: color["--c-gold"], boxShadow: "none" },
          },
        },
      });
      const express = elements.create("expressCheckout", {
        paymentMethods: {
          applePay: "auto",
          googlePay: "auto",
          link: "never",
          paypal: "never",
          amazonPay: "never",
          klarna: "never",
        },
        paymentMethodOrder: ["applePay", "googlePay"],
        layout: { maxColumns: 1, overflow: "never" },
        // La hauteur des boutons de la page (.club-button).
        buttonHeight: 52,
        buttonType: { applePay: "plain", googlePay: "plain" },
        buttonTheme: { applePay: "white", googlePay: "white" },
      });
      // Un portefeuille indisponible (appareil, navigateur) ne s'affiche pas.
      express.on("ready", ({ availablePaymentMethods }) => {
        if (!cancelled) setHasWallet(Boolean(availablePaymentMethods?.applePay || availablePaymentMethods?.googlePay));
      });
      express.on("confirm", (event) => void confirm(event));
      const card = elements.create("payment", {
        wallets: { applePay: "never", googlePay: "never", link: "never" },
        fields: { billingDetails: { email: "never", phone: "never", address: "if_required" } },
        terms: { card: "never" },
      });
      card.on("ready", () => {
        if (!cancelled) setState("ready");
      });
      card.on("loaderror", () => {
        if (!cancelled) setState("error");
      });
      express.mount(`#${EXPRESS_ID}`);
      card.mount(`#${CARD_ID}`);
      session.current = { stripe, elements };
      teardown = () => {
        express.destroy();
        card.destroy();
      };
    })().catch(() => {
      if (!cancelled) setState("error");
    });
    return () => {
      cancelled = true;
      teardown();
      session.current = null;
    };
  }, [bookingId, attempt, confirm]);

  if (state === "declined" || state === "error") {
    return (
      <div className="club-pay">
        <p className="club-error" role="alert">
          {state === "declined"
            ? "Paiement refusé par votre banque. Rien n'a été débité."
            : "Le paiement n'a pas pu se charger."}
        </p>
        <button
          type="button"
          className="club-button club-button-ghost club-button-block"
          onClick={() => {
            setState("loading");
            setHasWallet(false);
            setAttempt((count) => count + 1);
          }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="club-pay" aria-busy={state === "loading" || undefined}>
      <div id={EXPRESS_ID} className={state === "paying" ? "club-pay-locked" : ""} />
      {hasWallet && (
        <p className="club-pay-or" aria-hidden>
          <span>ou par carte</span>
        </p>
      )}
      <div id={CARD_ID} className="club-pay-card" />
      <PayButton state={state} totalCents={totalCents} onClick={() => void confirm()} />
      <p className="club-pay-note">Paiement sécurisé par Stripe : votre numéro de carte ne passe jamais par Ominin.</p>
    </div>
  );
}

export function TablePayment({
  provider,
  ...props
}: {
  provider: Club["paymentProvider"];
  bookingId: string;
  totalCents: number;
} & Outcome) {
  return provider === "demo" ? <DemoPayment {...props} /> : <StripeTablePayment {...props} />;
}
