"use client";

import { useCallback, useEffect } from "react";
import {
  CardPaymentFailed,
  CardPaymentForm,
  CardPaymentPaid,
  isDarkTheme,
  themeColors,
} from "@/components/menu/card-payment";
import {
  preloadStripe,
  useStripeElements,
  type PreparedIntent,
} from "@/components/payment/use-stripe-elements";
import { formatPrice } from "@/lib/menu/format";
import type { CardPhase } from "@/lib/menu/online-payment";

/*
 * Règlement d'une commande dans la page par Stripe Elements
 * (use-stripe-elements.ts). Le Payment Intent est préparé par
 * /api/stripe/pay sur le compte connecté du restaurant. La commande est
 * déjà enregistrée et part en cuisine dès l'encaissement, que
 * /api/stripe/verify constate aussitôt (le webhook connecté reste le filet).
 */

export { preloadStripe };

const EXPRESS_CONTAINER_ID = "stripe-express";
const CARD_CONTAINER_ID = "stripe-card";

export function StripePayment({
  orderId,
  total,
  tipAmount,
  onDone,
  onPhase,
}: {
  orderId: string;
  /** Affiché dans la feuille ; le montant débité reste celui du serveur. */
  total: number;
  tipAmount: number;
  /** Fin du règlement — payé, ou abandon (le client réglera au comptoir). */
  onDone: (paid: boolean) => void;
  onPhase?: (phase: CardPhase) => void;
}) {
  const prepare = useCallback(async (): Promise<PreparedIntent> => {
    const response = await fetch("/api/stripe/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tipAmount > 0 ? { orderId, tipAmount } : { orderId }),
    });
    const body = (await response.json()) as {
      clientSecret?: string;
      accountId?: string;
      publishableKey?: string;
      paid?: boolean;
    };
    if (response.ok && body.paid) return { kind: "paid" };
    if (!response.ok || !body.clientSecret || !body.accountId || !body.publishableKey) {
      return { kind: "error" };
    }
    return {
      kind: "intent",
      clientSecret: body.clientSecret,
      accountId: body.accountId,
      publishableKey: body.publishableKey,
    };
  }, [orderId, tipAmount]);

  // Débité : la commande se règle tout de suite, sans attendre le webhook.
  // Une vérification en échec ne change rien au débit, déjà fait.
  const onSucceeded = useCallback(async () => {
    await fetch("/api/stripe/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    }).catch(() => {});
  }, [orderId]);

  const appearance = useCallback((container: HTMLElement) => {
    const dark = isDarkTheme(container);
    const color = themeColors(container, [
      "--surface-raised",
      "--foreground",
      "--muted",
      "--hairline",
      "--ember-1",
      "--ember-3",
    ]);
    return {
      dark,
      appearance: {
        theme: dark ? ("night" as const) : ("stripe" as const),
        variables: {
          colorPrimary: color["--ember-1"],
          colorBackground: color["--surface-raised"],
          colorText: color["--foreground"],
          colorTextSecondary: color["--muted"],
          colorTextPlaceholder: color["--muted"],
          colorDanger: color["--ember-3"],
          // Même rayon que le rounded-2xl des panneaux de la feuille.
          borderRadius: "16px",
        },
        rules: {
          ".Input": { borderColor: color["--hairline"], boxShadow: "none" },
          ".Input:focus": { borderColor: color["--ember-1"], boxShadow: "none" },
        },
      },
    };
  }, []);

  const { state, hasWallet, confirm, retry } = useStripeElements({
    expressId: EXPRESS_CONTAINER_ID,
    cardId: CARD_CONTAINER_ID,
    prepareKey: `${orderId}:${tipAmount}`,
    prepare,
    onSucceeded,
    appearance,
    // La hauteur du bouton « Payer » de la carte (h-12).
    buttonHeight: 48,
  });

  const phase: CardPhase = state === "paying" ? "charging" : state === "paid" ? "paid" : "form";
  useEffect(() => {
    onPhase?.(phase);
  }, [phase, onPhase]);

  if (state === "paid") {
    return (
      <CardPaymentPaid due={formatPrice(total + tipAmount)} onContinue={() => onDone(true)} />
    );
  }

  if (state === "declined" || state === "error") {
    return (
      <CardPaymentFailed
        declined={state === "declined"}
        onRetry={retry}
        onCounter={() => onDone(false)}
      />
    );
  }

  return (
    <CardPaymentForm
      state={state}
      total={total}
      tipAmount={tipAmount}
      hasWallet={hasWallet}
      operator="Stripe"
      onPay={() => void confirm()}
      onCounter={() => onDone(false)}
      wallets={
        // Stripe y monte les boutons ; vide si aucun portefeuille.
        <div
          id={EXPRESS_CONTAINER_ID}
          className={state === "paying" ? "pointer-events-none opacity-60" : ""}
        />
      }
      card={<div id={CARD_CONTAINER_ID} />}
    />
  );
}
