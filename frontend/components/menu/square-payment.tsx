"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { SQUARE_COUNTRY, SQUARE_CURRENCY } from "@/lib/square/config";

/*
 * Règlement d'une commande dans la page via le SDK Web Payments de Square.
 * La carte ne touche jamais nos serveurs : le SDK la tokenise dans le
 * navigateur et nous n'en transmettons qu'un jeton à usage unique — Ominin
 * reste hors du périmètre PCI.
 *
 * L'ordre est inverse de SumUp : là-bas le checkout était créé au serveur
 * puis le widget montait dessus ; ici le formulaire carte se monte d'abord
 * (identifiant d'application et point de vente sont publics), et le serveur
 * n'est appelé qu'une fois le jeton obtenu. La commande est déjà enregistrée
 * et part en cuisine dès l'encaissement.
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
const CARD_CONTAINER_ID = "square-card";
const GOOGLE_PAY_CONTAINER_ID = "square-google-pay";

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

/*
 * Le formulaire carte vit dans une iframe Square : seules les propriétés que
 * le SDK accepte passent, aux couleurs du thème du restaurant.
 */
function cardStyle(element: Element): Record<string, Record<string, string>> {
  const color = themeColors(element, [
    "--hairline",
    "--ember-1",
    "--ember-3",
    "--foreground",
    "--muted",
  ]);
  return {
    // Même rayon que le rounded-2xl des panneaux de la feuille.
    ".input-container": {
      borderColor: color["--hairline"],
      borderRadius: "16px",
    },
    ".input-container.is-focus": { borderColor: color["--ember-1"] },
    ".input-container.is-error": { borderColor: color["--ember-3"] },
    input: { color: color["--foreground"] },
    "input::placeholder": { color: color["--muted"] },
    ".message-text": { color: color["--muted"] },
    ".message-icon": { color: color["--muted"] },
    ".message-text.is-error": { color: color["--ember-3"] },
    ".message-icon.is-error": { color: color["--ember-3"] },
  };
}

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

export function SquarePayment({
  orderId,
  locationId,
  total,
  tipAmount,
  onDone,
  onPhase,
}: {
  orderId: string;
  locationId: string;
  /** Affiché par Apple Pay / Google Pay ; le montant débité reste celui du serveur. */
  total: number;
  tipAmount: number;
  /** Fin du règlement — payé, ou abandon (le client réglera au comptoir). */
  onDone: (paid: boolean) => void;
  onPhase?: (phase: CardPhase) => void;
}) {
  // APP_ID est figé au build : son absence est un état de départ, pas un
  // événement à poser depuis l'effet.
  const [state, setState] = useState<CardPaymentState>(APP_ID ? "loading" : "error");
  const phase: CardPhase = state === "paying" ? "charging" : state === "paid" ? "paid" : "form";
  useEffect(() => {
    onPhase?.(phase);
  }, [phase, onPhase]);
  // Une tentative refusée démonte le formulaire : « Réessayer » en remonte un
  // neuf, avec un jeton carte neuf (ceux de Square sont à usage unique).
  const [attempt, setAttempt] = useState(0);
  const [wallets, setWallets] = useState({ applePay: false, googlePay: false });
  const [dark, setDark] = useState(true);
  const methodsRef = useRef<Methods | null>(null);
  const amount = (total + tipAmount).toFixed(2);

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
        const container = document.getElementById(CARD_CONTAINER_ID)!;
        const darkTheme = isDarkTheme(container);
        const payments = square.payments(APP_ID, locationId);
        const card = await payments.card({ style: cardStyle(container) });
        if (cancelled) {
          await card.destroy?.();
          return;
        }
        await card.attach(`#${CARD_CONTAINER_ID}`);
        const methods: Methods = { card, applePay: null, googlePay: null };
        methodsRef.current = methods;
        setDark(darkTheme);
        setState("ready");

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
            await googlePay.attach(`#${GOOGLE_PAY_CONTAINER_ID}`, {
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
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
      if (methodsRef.current) void destroy(methodsRef.current);
      methodsRef.current = null;
    };
  }, [locationId, attempt, amount]);

  const pay = useCallback(async (method: keyof Methods) => {
    const methods = methodsRef.current;
    const source = methods?.[method];
    if (!methods || !source) return;
    setState("paying");
    try {
      // La carte passe par 3-D Secure : le SDK n'ouvre le défi de la banque
      // que si elle le demande. Apple Pay et Google Pay authentifient déjà le
      // porteur, et le SDK vérifie ces jetons de lui-même.
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
      if (result.status !== "OK" || !result.token) {
        setState("declined");
        return;
      }
      // Le montant n'est pas transmis : le serveur relit les lignes en base.
      const response = await fetch("/api/square/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          sourceId: result.token,
          ...(tipAmount > 0 ? { tipAmount } : {}),
        }),
      });
      const body = (await response.json()) as { paid?: boolean };
      setState(response.ok && body.paid ? "paid" : "declined");
    } catch {
      setState("declined");
    }
  }, [orderId, tipAmount, amount]);

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
      hasWallet={wallets.applePay || wallets.googlePay}
      operator="Square"
      onPay={() => void pay("card")}
      onCounter={() => onDone(false)}
      wallets={
        <>
          {wallets.applePay && (
            <button
              type="button"
              onClick={() => void pay("applePay")}
              disabled={state !== "ready"}
              aria-label="Payer avec Apple Pay"
              className={`h-12 w-full rounded-full [-apple-pay-button-type:plain] [-webkit-appearance:-apple-pay-button] disabled:opacity-60 ${
                dark
                  ? "[-apple-pay-button-style:white]"
                  : "[-apple-pay-button-style:black]"
              }`}
            />
          )}
          {/* Square y injecte le bouton Google Pay ; vide si indisponible.
              Jamais masqué : le bouton se dimensionne sur son conteneur au
              montage. */}
          <div
            id={GOOGLE_PAY_CONTAINER_ID}
            onClick={() => void pay("googlePay")}
            className={`w-full overflow-hidden rounded-full ${
              wallets.googlePay ? "h-12" : "h-0"
            } ${state === "paying" ? "pointer-events-none opacity-60" : ""}`}
          />
        </>
      }
      card={
        /* Conteneur du formulaire carte Square (iframe hors périmètre PCI).
           Deux fonds blancs à neutraliser : le cadre, que la feuille de
           Square (chargée après la nôtre) peint en blanc — d'où le
           !important —, et l'iframe elle-même, que le navigateur rend
           opaque tant que son color-scheme diffère de celui du parent. */
        <div
          id={CARD_CONTAINER_ID}
          className="[color-scheme:normal] [&_.sq-card-iframe-container]:bg-surface-raised!"
        />
      }
    />
  );
}
