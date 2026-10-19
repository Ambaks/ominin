"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Appearance,
  Stripe,
  StripeElements,
  StripeExpressCheckoutElementConfirmEvent,
} from "@stripe/stripe-js";
import type { CardPaymentState } from "@/components/menu/card-payment";

/*
 * Un règlement dans la page par Stripe Elements, commun au menu (commande)
 * et à Ominin Club (table) : Apple Pay et Google Pay en tête (Express
 * Checkout), puis la carte (Payment Element), sans e-mail ni adresse. La
 * carte ne touche jamais nos serveurs : elle est saisie dans les iframes
 * Stripe — Ominin reste hors du périmètre PCI.
 *
 * L'intent est préparé au serveur (prepare : montant relu en base, sur le
 * compte connecté, la clé publique arrive avec lui), puis confirmé ici ;
 * 3-D Secure s'ouvre par-dessus la page, sans la quitter. Chaque appelant
 * dit où préparer, quoi faire une fois débité, et habille les formulaires.
 */

/**
 * Importé, le module injecte Stripe.js — un script lourd, suivi de ses
 * requêtes de détection de fraude : seulement à l'approche d'un règlement
 * en ligne. Rappelé, il ne recharge rien.
 */
export const preloadStripe = () => import("@stripe/stripe-js");

export type PreparedIntent =
  | { kind: "intent"; clientSecret: string; accountId: string; publishableKey: string }
  /** Réglé entre-temps (une tentative précédente a abouti). */
  | { kind: "paid" }
  | { kind: "error" }
  /** L'appelant a pris la main (délai passé…) : plus rien à monter. */
  | { kind: "halt" };

const buttonHeightOf = (height: number | (() => number)) =>
  typeof height === "function" ? height() : height;

export function useStripeElements({
  expressId,
  cardId,
  prepareKey,
  prepare,
  onSucceeded,
  onAlreadyPaid,
  appearance,
  buttonHeight,
}: {
  expressId: string;
  cardId: string;
  /** Change ⇒ nouvel intent (commande, pourboire…). */
  prepareKey: string;
  prepare: () => Promise<PreparedIntent>;
  /** Débité : à constater côté serveur avant que la feuille passe à « payé ». */
  onSucceeded: () => Promise<void>;
  onAlreadyPaid?: () => void;
  /** Habillage des iframes, lu sur le conteneur de la carte au montage. */
  appearance: (container: HTMLElement) => { appearance: Appearance; dark: boolean };
  /** Hauteur des boutons Apple Pay / Google Pay (px), ou sa lecture au montage (un jeton CSS). */
  buttonHeight: number | (() => number);
}) {
  const [state, setState] = useState<CardPaymentState>("loading");
  // Une tentative refusée démonte le formulaire : « Réessayer » en remonte
  // un neuf, sur le même intent (le serveur le reprend).
  const [attempt, setAttempt] = useState(0);
  const [hasWallet, setHasWallet] = useState(false);
  const session = useRef<{ stripe: Stripe; elements: StripeElements } | null>(null);
  // Lus au moment voulu, pas en dépendances : une fonction recréée à chaque
  // rendu remonterait les éléments Stripe — et effacerait une carte en cours.
  const callbacks = useRef({ prepare, onSucceeded, onAlreadyPaid, appearance, buttonHeight });
  useEffect(() => {
    callbacks.current = { prepare, onSucceeded, onAlreadyPaid, appearance, buttonHeight };
  }, [prepare, onSucceeded, onAlreadyPaid, appearance, buttonHeight]);

  const confirm = useCallback(async (express?: StripeExpressCheckoutElementConfirmEvent) => {
    const current = session.current;
    if (!current) return;
    setState("paying");
    try {
      const { error, paymentIntent } = await current.stripe.confirmPayment({
        elements: current.elements,
        // Une carte ne quitte pas la page (3-D Secure s'ouvre par-dessus) ;
        // l'adresse de retour ne sert qu'au cas où la banque l'exigerait.
        redirect: "if_required",
        confirmParams: { return_url: window.location.href },
      });
      if (paymentIntent?.status === "succeeded") {
        await callbacks.current.onSucceeded();
        setState("paid");
        return;
      }
      express?.paymentFailed();
      // Champ incomplet ou invalide : le formulaire le signale de lui-même,
      // le client corrige sans rien perdre.
      setState(error?.type === "validation_error" ? "ready" : "declined");
    } catch {
      // Réseau coupé en pleine confirmation : « Réessayer » reprend l'intent,
      // que le serveur clôt s'il a été débité entre-temps.
      express?.paymentFailed();
      setState("error");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let teardown = () => {};

    (async () => {
      // Le script se charge pendant que le serveur prépare l'intent.
      const [prepared, { loadStripe }] = await Promise.all([
        callbacks.current.prepare(),
        preloadStripe(),
      ]);
      if (cancelled || prepared.kind === "halt") return;
      if (prepared.kind === "paid") {
        setState("paid");
        callbacks.current.onAlreadyPaid?.();
        return;
      }
      if (prepared.kind === "error") {
        setState("error");
        return;
      }
      const stripe = await loadStripe(prepared.publishableKey, {
        stripeAccount: prepared.accountId,
        locale: "fr",
      });
      if (cancelled) return;
      if (!stripe) {
        setState("error");
        return;
      }

      const { appearance: look, dark } = callbacks.current.appearance(document.getElementById(cardId)!);
      const elements = stripe.elements({ clientSecret: prepared.clientSecret, appearance: look });

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
        buttonHeight: buttonHeightOf(callbacks.current.buttonHeight),
        buttonType: { applePay: "plain", googlePay: "plain" },
        buttonTheme: {
          applePay: dark ? "white" : "black",
          googlePay: dark ? "white" : "black",
        },
      });
      express.on("ready", ({ availablePaymentMethods }) => {
        if (cancelled) return;
        setHasWallet(Boolean(availablePaymentMethods?.applePay || availablePaymentMethods?.googlePay));
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

      express.mount(`#${expressId}`);
      card.mount(`#${cardId}`);
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
  }, [prepareKey, attempt, confirm, expressId, cardId]);

  const retry = useCallback(() => {
    setAttempt((count) => count + 1);
    setHasWallet(false);
    setState("loading");
  }, []);

  return { state, hasWallet, confirm, retry };
}
