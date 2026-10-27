"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SQUARE_COUNTRY, SQUARE_CURRENCY } from "@/lib/square/config";

/*
 * Le SDK Web Payments de Square dans la page, commun au menu (commande) et
 * aux bulles (places) : la carte, Apple Pay et Google Pay. La carte ne touche
 * jamais nos serveurs : le SDK la tokenise dans le navigateur et nous n'en
 * transmettons qu'un jeton à usage unique — Ominin reste hors du périmètre
 * PCI. Le formulaire se monte d'abord (identifiant d'application et point de
 * vente sont publics) ; l'appelant envoie le jeton à son serveur, qui débite.
 */

/*
 * Bac à sable et production ont chacun leur SDK. L'environnement se lit sur
 * l'identifiant d'application (Square préfixe ceux du bac à sable par
 * « sandbox- ») plutôt que dans une variable séparée : les deux ne peuvent
 * pas se contredire.
 */
const APP_ID = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
const SDK_URL = APP_ID?.startsWith("sandbox-")
  ? "https://sandbox.web.squarecdn.com/v1/square.js"
  : "https://web.squarecdn.com/v1/square.js";

/** Les conteneurs que l'appelant rend, toujours montés : le SDK les remplit. */
export const SQUARE_CARD_CONTAINER_ID = "square-card";
export const SQUARE_GOOGLE_PAY_CONTAINER_ID = "square-google-pay";

interface SquareMethod {
  tokenize: () => Promise<{
    status: string;
    token?: string;
    errors?: { message: string }[];
  }>;
  destroy?: () => Promise<void>;
}

/** Ce que 3-D Secure transmet à la banque ; le SDK exige chaque champ. */
interface CardVerification {
  amount: string;
  currencyCode: string;
  intent: "CHARGE";
  customerInitiated: boolean;
  sellerKeyedIn: boolean;
  billingContact: object;
}

interface SquareCard extends SquareMethod {
  attach: (selector: string) => Promise<void>;
  /** Sans vérification, pas de 3-D Secure : dans l'EEE, la banque qui l'exige refuse le débit. */
  tokenize: (
    verification?: CardVerification
  ) => ReturnType<SquareMethod["tokenize"]>;
}

interface SquareGooglePay extends SquareMethod {
  attach: (
    selector: string,
    options: {
      buttonColor: "black" | "white";
      buttonSizeMode: "fill";
      buttonType: "short";
    }
  ) => Promise<void>;
}

type SquarePaymentRequest = object;

interface SquarePayments {
  card: (options: {
    style: Record<string, Record<string, string>>;
  }) => Promise<SquareCard>;
  paymentRequest: (options: {
    countryCode: string;
    currencyCode: string;
    total: { amount: string; label: string };
  }) => SquarePaymentRequest;
  /** Rejette hors de Safari/Apple Pay ou sur un domaine non enregistré. */
  applePay: (request: SquarePaymentRequest) => Promise<SquareMethod>;
  googlePay: (request: SquarePaymentRequest) => Promise<SquareGooglePay>;
}

interface Methods {
  card: SquareCard;
  applePay: SquareMethod | null;
  googlePay: SquareGooglePay | null;
}

export type SquareMethodName = keyof Methods;

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => SquarePayments;
    };
  }
}

let sdkPromise: Promise<NonNullable<Window["Square"]>> | null = null;

/** Charge le SDK une seule fois — jamais pour les restaurants sur Stripe. */
function loadSdk(): Promise<NonNullable<Window["Square"]>> {
  if (window.Square) return Promise.resolve(window.Square);
  sdkPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.onload = () => {
      if (window.Square) resolve(window.Square);
      else reject(new Error("SDK Square indisponible."));
    };
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("SDK Square indisponible."));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export function useSquarePayments({
  locationId,
  amount,
  cardStyle,
  isDark,
}: {
  locationId: string;
  /** « 12.50 » : affiché par Apple Pay / Google Pay et transmis à 3-D Secure. */
  amount: string;
  /** Le formulaire carte vit dans une iframe Square : ses couleurs lui sont passées. */
  cardStyle: (container: Element) => Record<string, Record<string, string>>;
  /** Fond sombre sous le conteneur : boutons de portefeuille clairs. */
  isDark: (container: Element) => boolean;
}) {
  // APP_ID est figé au build : son absence est un état de départ, pas un
  // événement à poser depuis l'effet.
  const [status, setStatus] = useState<"loading" | "ready" | "error">(APP_ID ? "loading" : "error");
  // Une tentative refusée démonte le formulaire : retry en remonte un neuf,
  // avec un jeton carte neuf (ceux de Square sont à usage unique).
  const [attempt, setAttempt] = useState(0);
  const [wallets, setWallets] = useState({ applePay: false, googlePay: false });
  const [dark, setDark] = useState(true);
  const methodsRef = useRef<Methods | null>(null);

  useEffect(() => {
    if (!APP_ID) return;
    let cancelled = false;
    const destroy = (methods: Methods) =>
      Promise.all(
        [methods.card, methods.applePay, methods.googlePay].map((method) =>
          method?.destroy?.()
        )
      );

    loadSdk()
      .then(async (square) => {
        const container = document.getElementById(SQUARE_CARD_CONTAINER_ID)!;
        const darkTheme = isDark(container);
        const payments = square.payments(APP_ID, locationId);
        const card = await payments.card({ style: cardStyle(container) });
        if (cancelled) {
          await card.destroy?.();
          return;
        }
        await card.attach(`#${SQUARE_CARD_CONTAINER_ID}`);
        const methods: Methods = { card, applePay: null, googlePay: null };
        methodsRef.current = methods;
        setDark(darkTheme);
        setStatus("ready");

        // Les portefeuilles arrivent chacun à leur rythme, sans jamais
        // retenir la carte : un portefeuille indisponible (navigateur,
        // appareil, domaine) ou muet n'est pas une erreur.
        const request = payments.paymentRequest({
          countryCode: SQUARE_COUNTRY,
          currencyCode: SQUARE_CURRENCY,
          total: { amount, label: "Total" },
        });
        payments
          .applePay(request)
          .then(async (applePay) => {
            if (cancelled) return applePay.destroy?.();
            methods.applePay = applePay;
            setWallets((current) => ({ ...current, applePay: true }));
          })
          .catch(() => {});
        payments
          .googlePay(request)
          .then(async (googlePay) => {
            if (cancelled) return googlePay.destroy?.();
            await googlePay.attach(`#${SQUARE_GOOGLE_PAY_CONTAINER_ID}`, {
              buttonColor: darkTheme ? "white" : "black",
              buttonSizeMode: "fill",
              buttonType: "short",
            });
            if (cancelled) return googlePay.destroy?.();
            methods.googlePay = googlePay;
            setWallets((current) => ({ ...current, googlePay: true }));
          })
          .catch(() => {});
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      if (methodsRef.current) void destroy(methodsRef.current);
      methodsRef.current = null;
    };
  }, [locationId, attempt, amount, cardStyle, isDark]);

  /**
   * Le jeton à usage unique du moyen choisi, ou null si le porteur abandonne
   * ou que la banque refuse. La carte passe par 3-D Secure : le SDK n'ouvre
   * le défi de la banque que si elle le demande. Apple Pay et Google Pay
   * authentifient déjà le porteur, et le SDK vérifie ces jetons de lui-même.
   */
  const tokenize = useCallback(
    async (method: SquareMethodName): Promise<string | null> => {
      const methods = methodsRef.current;
      const source = methods?.[method];
      if (!methods || !source) return null;
      const result = await (method === "card"
        ? methods.card.tokenize({
            amount,
            currencyCode: SQUARE_CURRENCY,
            intent: "CHARGE",
            customerInitiated: true,
            sellerKeyedIn: false,
            billingContact: {},
          })
        : source.tokenize());
      return result.status === "OK" && result.token ? result.token : null;
    },
    [amount]
  );

  const retry = useCallback(() => {
    setAttempt((count) => count + 1);
    setStatus("loading");
  }, []);

  // attempt sert de clé au conteneur de la carte : le formulaire neuf se monte
  // dans un nœud neuf, pas dans celui que l'ancien quitte encore.
  return { status, wallets, dark, tokenize, retry, attempt };
}
