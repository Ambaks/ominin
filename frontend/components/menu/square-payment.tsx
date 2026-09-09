"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

interface SquareCard {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<{
    status: string;
    token?: string;
    errors?: { message: string }[];
  }>;
  destroy?: () => Promise<void>;
}

interface SquarePayments {
  card: () => Promise<SquareCard>;
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
  tipAmount,
  onDone,
}: {
  orderId: string;
  locationId: string;
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
  const cardRef = useRef<SquareCard | null>(null);

  useEffect(() => {
    if (!APP_ID) return;
    let cancelled = false;
    loadSdk()
      .then(async (square) => {
        const card = await square.payments(APP_ID, locationId).card();
        if (cancelled) {
          await card.destroy?.();
          return;
        }
        await card.attach(`#${CARD_CONTAINER_ID}`);
        cardRef.current = card;
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
      void cardRef.current?.destroy?.();
      cardRef.current = null;
    };
  }, [locationId, attempt]);

  const pay = useCallback(async () => {
    const card = cardRef.current;
    if (!card) return;
    setState("paying");
    try {
      const result = await card.tokenize();
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

  return (
    <div className="flex flex-col gap-3 p-5">
      <h3 className="font-display text-lg font-medium">Régler la commande</h3>
      {/* Conteneur du formulaire carte Square (iframe hors périmètre PCI). */}
      <div id={CARD_CONTAINER_ID} />
      <button
        type="button"
        onClick={() => void pay()}
        disabled={state !== "ready"}
        className="ember-gradient rounded-full px-5 py-3 text-sm font-semibold text-background disabled:opacity-60"
      >
        {state === "paying" ? "Un instant…" : "Payer"}
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
