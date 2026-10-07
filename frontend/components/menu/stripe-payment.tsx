"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadStripe,
  type Stripe,
  type StripeElements,
  type StripeExpressCheckoutElementConfirmEvent,
} from "@stripe/stripe-js";
import {
  CardPaymentFailed,
  CardPaymentForm,
  CardPaymentPaid,
  isDarkTheme,
  themeColors,
  type CardPaymentState,
} from "@/components/menu/card-payment";
import { formatPrice } from "@/lib/menu-data";
import type { CardPhase } from "@/lib/menu/online-payment";

/*
 * Règlement d'une commande dans la page par Stripe Elements : Apple Pay et
 * Google Pay en tête (Express Checkout), puis la carte (Payment Element),
 * sans e-mail ni adresse. La carte ne touche jamais nos serveurs : elle est
 * saisie dans les iframes Stripe — Ominin reste hors du périmètre PCI.
 *
 * Le Payment Intent est préparé au serveur (/api/stripe/pay, montant relu en
 * base) sur le compte connecté du restaurant — la clé publique arrive avec
 * lui —, puis confirmé ici ; 3-D Secure
 * s'ouvre par-dessus la page, sans la quitter. La commande est déjà
 * enregistrée et part en cuisine dès l'encaissement, que /api/stripe/verify
 * constate aussitôt (le webhook connecté reste le filet).
 */

const EXPRESS_CONTAINER_ID = "stripe-express";
const CARD_CONTAINER_ID = "stripe-card";

interface Session {
  stripe: Stripe;
  elements: StripeElements;
}

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
  const [state, setState] = useState<CardPaymentState>("loading");
  const phase: CardPhase = state === "paying" ? "charging" : state === "paid" ? "paid" : "form";
  useEffect(() => {
    onPhase?.(phase);
  }, [phase, onPhase]);
  // Une tentative refusée démonte le formulaire : « Réessayer » en remonte un
  // neuf, sur le même intent (le serveur le reprend).
  const [attempt, setAttempt] = useState(0);
  const [hasWallet, setHasWallet] = useState(false);
  const sessionRef = useRef<Session | null>(null);

  // Débité : la commande se règle tout de suite, sans attendre le webhook.
  // Une vérification en échec ne change rien au débit, déjà fait.
  const settle = useCallback(async () => {
    await fetch("/api/stripe/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    }).catch(() => {});
    setState("paid");
  }, [orderId]);

  const confirm = useCallback(
    async (express?: StripeExpressCheckoutElementConfirmEvent) => {
      const session = sessionRef.current;
      if (!session) return;
      setState("paying");
      const { error, paymentIntent } = await session.stripe.confirmPayment({
        elements: session.elements,
        // Une carte ne quitte pas la page (3-D Secure s'ouvre par-dessus) ;
        // l'adresse de retour ne sert qu'au cas où la banque l'exigerait.
        redirect: "if_required",
        confirmParams: { return_url: window.location.href },
      });
      if (paymentIntent?.status === "succeeded") {
        await settle();
        return;
      }
      express?.paymentFailed();
      // Champ incomplet ou invalide : le formulaire le signale de lui-même,
      // le client corrige sans rien perdre.
      if (error?.type === "validation_error") setState("ready");
      else setState("declined");
    },
    [settle]
  );

  useEffect(() => {
    let cancelled = false;
    let teardown = () => {};

    (async () => {
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
      if (cancelled) return;
      // Réglée entre-temps (une tentative précédente a abouti).
      if (response.ok && body.paid) {
        setState("paid");
        return;
      }
      if (
        !response.ok ||
        !body.clientSecret ||
        !body.accountId ||
        !body.publishableKey
      ) {
        setState("error");
        return;
      }
      const stripe = await loadStripe(body.publishableKey, {
        stripeAccount: body.accountId,
        locale: "fr",
      });
      if (cancelled) return;
      if (!stripe) {
        setState("error");
        return;
      }

      const container = document.getElementById(CARD_CONTAINER_ID)!;
      const dark = isDarkTheme(container);
      const color = themeColors(container, [
        "--surface-raised",
        "--foreground",
        "--muted",
        "--hairline",
        "--ember-1",
        "--ember-3",
      ]);
      const elements = stripe.elements({
        clientSecret: body.clientSecret,
        appearance: {
          theme: dark ? "night" : "stripe",
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
      });

      // Apple Pay d'abord, Google Pay ensuite, l'un sous l'autre ; aucun
      // autre bouton (Link demanderait l'e-mail). Un portefeuille
      // indisponible (navigateur, appareil, domaine) n'est pas une erreur :
      // il ne s'affiche simplement pas.
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
        // La hauteur du bouton « Payer » de la carte (h-12).
        buttonHeight: 48,
        buttonType: { applePay: "plain", googlePay: "plain" },
        buttonTheme: {
          applePay: dark ? "white" : "black",
          googlePay: dark ? "white" : "black",
        },
      });
      express.on("ready", ({ availablePaymentMethods }) => {
        if (cancelled) return;
        setHasWallet(
          Boolean(availablePaymentMethods?.applePay || availablePaymentMethods?.googlePay)
        );
      });
      express.on("confirm", (event) => void confirm(event));

      const card = elements.create("payment", {
        wallets: { applePay: "never", googlePay: "never", link: "never" },
        fields: {
          billingDetails: { email: "never", phone: "never", address: "if_required" },
        },
        terms: { card: "never" },
      });
      card.on("ready", () => {
        if (!cancelled) setState("ready");
      });
      card.on("loaderror", () => {
        if (!cancelled) setState("error");
      });

      express.mount(`#${EXPRESS_CONTAINER_ID}`);
      card.mount(`#${CARD_CONTAINER_ID}`);
      sessionRef.current = { stripe, elements };
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
      sessionRef.current = null;
    };
  }, [orderId, tipAmount, attempt, confirm]);

  if (state === "paid") {
    return (
      <CardPaymentPaid due={formatPrice(total + tipAmount)} onContinue={() => onDone(true)} />
    );
  }

  if (state === "declined" || state === "error") {
    return (
      <CardPaymentFailed
        declined={state === "declined"}
        onRetry={() => {
          setAttempt((count) => count + 1);
          setHasWallet(false);
          setState("loading");
        }}
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
