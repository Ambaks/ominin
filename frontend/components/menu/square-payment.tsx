"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/menu-data";
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

interface SquareCard extends SquareMethod {
  attach: (selector: string) => Promise<void>;
}

interface SquareGooglePay extends SquareMethod {
  attach: (
    selector: string,
    options: {
      buttonColor: "black" | "white";
      buttonSizeMode: "fill";
      buttonType: "long";
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

/** Le thème se lit au montage : texte clair ⇒ fond sombre. */
function isDarkTheme(element: Element): boolean {
  const [r, g, b] = getComputedStyle(element).color.match(/\d+/g)!.map(Number);
  return 0.299 * r + 0.587 * g + 0.114 * b > 127.5;
}

/*
 * Le formulaire carte vit dans une iframe Square : nos classes n'y entrent
 * pas, seules les propriétés que le SDK accepte passent. Les couleurs sont
 * celles du thème du restaurant, relues sur la page.
 */
function cardStyle(element: Element): Record<string, Record<string, string>> {
  const css = getComputedStyle(element);
  const token = (name: string) => css.getPropertyValue(name).trim();
  return {
    ".input-container": {
      borderColor: token("--hairline"),
      borderRadius: "12px",
    },
    ".input-container.is-focus": { borderColor: token("--ember-1") },
    ".input-container.is-error": { borderColor: token("--ember-3") },
    input: {
      backgroundColor: token("--surface-raised"),
      color: token("--foreground"),
    },
    "input::placeholder": { color: token("--muted") },
    ".message-text": { color: token("--muted") },
    ".message-icon": { color: token("--muted") },
    ".message-text.is-error": { color: token("--ember-3") },
    ".message-icon.is-error": { color: token("--ember-3") },
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

type PaymentState = "loading" | "ready" | "paying" | "paid" | "declined" | "error";

export function SquarePayment({
  orderId,
  locationId,
  total,
  tipAmount,
  onDone,
}: {
  orderId: string;
  locationId: string;
  /** Affiché par Apple Pay / Google Pay ; le montant débité reste celui du serveur. */
  total: number;
  tipAmount: number;
  /** Fin du règlement — payé, ou abandon (le client réglera au comptoir). */
  onDone: (paid: boolean) => void;
}) {
  // APP_ID est figé au build : son absence est un état de départ, pas un
  // événement à poser depuis l'effet.
  const [state, setState] = useState<PaymentState>(APP_ID ? "loading" : "error");
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
        const request = payments.paymentRequest({
          countryCode: SQUARE_COUNTRY,
          currencyCode: SQUARE_CURRENCY,
          total: { amount, label: "Total" },
        });
        // Un portefeuille indisponible (navigateur, appareil, domaine) n'est
        // pas une erreur : la carte reste proposée.
        const [card, applePay, googlePay] = await Promise.all([
          payments.card({ style: cardStyle(container) }),
          payments.applePay(request).catch(() => null),
          payments.googlePay(request).catch(() => null),
        ]);
        const methods = { card, applePay, googlePay };
        if (cancelled) {
          await destroy(methods);
          return;
        }
        await card.attach(`#${CARD_CONTAINER_ID}`);
        const googleAttached = await googlePay
          ?.attach(`#${GOOGLE_PAY_CONTAINER_ID}`, {
            buttonColor: darkTheme ? "white" : "black",
            buttonSizeMode: "fill",
            buttonType: "long",
          })
          .then(() => true)
          .catch(() => false);
        methodsRef.current = methods;
        setDark(darkTheme);
        setWallets({ applePay: Boolean(applePay), googlePay: Boolean(googleAttached) });
        setState("ready");
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
    const source = methodsRef.current?.[method];
    if (!source) return;
    setState("paying");
    try {
      const result = await source.tokenize();
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
  }, [orderId, tipAmount]);

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
            onClick={() => {
              setAttempt((count) => count + 1);
              setState("loading");
            }}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const hasWallet = wallets.applePay || wallets.googlePay;

  return (
    <div className="flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg font-medium">Régler la commande</h3>
        <span className="text-sm font-semibold text-ember-1">
          {formatPrice(total + tipAmount)}
        </span>
      </div>
      {wallets.applePay && (
        <button
          type="button"
          onClick={() => void pay("applePay")}
          disabled={state !== "ready"}
          aria-label="Payer avec Apple Pay"
          className={`h-12 w-full rounded-full [-apple-pay-button-type:plain] [-webkit-appearance:-apple-pay-button] disabled:opacity-60 ${
            dark ? "[-apple-pay-button-style:white]" : "[-apple-pay-button-style:black]"
          }`}
        />
      )}
      {/* Square y injecte le bouton Google Pay ; vide si indisponible. */}
      <div
        id={GOOGLE_PAY_CONTAINER_ID}
        onClick={() => void pay("googlePay")}
        className={`w-full overflow-hidden rounded-full ${
          wallets.googlePay ? "h-12" : "h-0"
        } ${state === "paying" ? "pointer-events-none opacity-60" : ""}`}
      />
      {hasWallet && (
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-hairline" />
          ou par carte
          <span className="h-px flex-1 bg-hairline" />
        </div>
      )}
      {/* Conteneur du formulaire carte Square (iframe hors périmètre PCI). */}
      <div id={CARD_CONTAINER_ID} />
      <button
        type="button"
        onClick={() => void pay("card")}
        disabled={state !== "ready"}
        className="ember-gradient rounded-full px-5 py-3 text-sm font-semibold text-background disabled:opacity-60"
      >
        {state === "paying"
          ? "Un instant…"
          : state === "loading"
            ? "Chargement…"
            : "Payer par carte"}
      </button>
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
