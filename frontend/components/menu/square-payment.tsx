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

/** Le thème se lit au montage : texte clair ⇒ fond sombre. */
function isDarkTheme(element: Element): boolean {
  const [r, g, b] = getComputedStyle(element).color.match(/\d+/g)!.map(Number);
  return 0.299 * r + 0.587 * g + 0.114 * b > 127.5;
}

/*
 * Le formulaire carte vit dans une iframe Square : nos classes n'y entrent
 * pas, seules les propriétés que le SDK accepte passent. Les couleurs sont
 * celles du thème du restaurant, relues sur la page — via la couleur
 * calculée, toujours en rgb()/rgba() : la feuille compilée écrit les
 * transparences en hex à huit chiffres, que Square refuse.
 */
function cardStyle(element: Element): Record<string, Record<string, string>> {
  const probe = document.createElement("span");
  element.appendChild(probe);
  const token = (name: string) => {
    probe.style.color = `var(${name})`;
    return getComputedStyle(probe).color;
  };
  const style = {
    // Même rayon que le rounded-2xl des panneaux de la feuille.
    ".input-container": {
      borderColor: token("--hairline"),
      borderRadius: "16px",
    },
    ".input-container.is-focus": { borderColor: token("--ember-1") },
    ".input-container.is-error": { borderColor: token("--ember-3") },
    input: { color: token("--foreground") },
    "input::placeholder": { color: token("--muted") },
    ".message-text": { color: token("--muted") },
    ".message-icon": { color: token("--muted") },
    ".message-text.is-error": { color: token("--ember-3") },
    ".message-icon.is-error": { color: token("--ember-3") },
  };
  probe.remove();
  return style;
}

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => SquarePayments;
    };
  }
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <rect x="3" y="7" width="10" height="7" rx="1.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
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

  const due = formatPrice(total + tipAmount);

  if (state === "paid") {
    return (
      <div className="relative flex flex-col items-center gap-6 overflow-hidden px-6 pt-12 pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
        <div aria-hidden className="ember-glow pointer-events-none absolute inset-x-0 top-0 h-56" />
        <div className="relative flex size-20 items-center justify-center">
          <span aria-hidden className="pulse-ring absolute inset-0 rounded-full border-2 border-ember-2" />
          <span className="ember-gradient order-pop flex size-16 items-center justify-center rounded-full text-background shadow-xl shadow-black/30">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-8">
              <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
        <div className="rise relative flex flex-col gap-2">
          <p className="ember-text text-[11px] font-semibold uppercase tracking-[0.28em]">
            Paiement confirmé
          </p>
          <p className="font-display text-4xl font-medium tabular-nums">{due}</p>
          <p className="text-sm leading-relaxed text-muted">
            Merci&nbsp;! Votre commande part en cuisine.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDone(true)}
          className="ember-gradient relative h-12 w-full rounded-full text-sm font-semibold text-background transition active:scale-[0.99]"
        >
          Continuer
        </button>
      </div>
    );
  }

  if (state === "declined" || state === "error") {
    return (
      <div className="rise flex flex-col items-center gap-6 px-6 pt-10 pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
        <span className="flex size-14 items-center justify-center rounded-full border border-ember-3/40 bg-ember-3/10 text-ember-3">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-6">
            <path d="M12 7.5v5.5M12 16.5v.01" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
          </svg>
        </span>
        <div className="flex flex-col gap-2">
          <h3 className="font-display text-2xl font-medium">
            {state === "declined"
              ? "Paiement refusé"
              : "Le paiement n\u2019a pas pu démarrer"}
          </h3>
          <p className="text-sm leading-relaxed text-muted">
            {state === "declined"
              ? "Essayez une autre carte, ou réglez au comptoir."
              : "Réessayez dans un instant, ou réglez au comptoir."}{" "}
            Votre commande est enregistrée et partira en cuisine dès
            l&rsquo;encaissement.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              setAttempt((count) => count + 1);
              setState("loading");
            }}
            className="ember-gradient h-12 w-full rounded-full text-sm font-semibold text-background transition active:scale-[0.99]"
          >
            Réessayer
          </button>
          <button
            type="button"
            onClick={() => onDone(false)}
            className="h-12 w-full rounded-full border border-hairline text-sm font-semibold transition hover:bg-surface-raised"
          >
            Payer au comptoir
          </button>
        </div>
      </div>
    );
  }

  const hasWallet = wallets.applePay || wallets.googlePay;

  const busy = state !== "ready";

  return (
    <div className="relative overflow-hidden">
      <div aria-hidden className="ember-glow pointer-events-none absolute inset-x-0 top-0 h-56" />
      <div className="relative flex flex-col px-6 pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <header className="rise flex flex-col items-center gap-2 text-center">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-ember-1">
            <LockIcon className="size-3.5" />
            Paiement sécurisé
          </p>
          <p className="ember-text font-display text-5xl font-medium tabular-nums">
            {due}
          </p>
          {tipAmount > 0 && (
            <p className="text-xs text-muted tabular-nums">
              Commande {formatPrice(total)} · Pourboire {formatPrice(tipAmount)}
            </p>
          )}
        </header>

        {/* Jamais masquée : Google Pay se dimensionne sur son conteneur au montage. */}
        <section
          className={`rise flex flex-col gap-2.5 ${hasWallet ? "mt-6" : ""}`}
          style={{ animationDelay: "80ms" }}
        >
          {wallets.applePay && (
            <button
              type="button"
              onClick={() => void pay("applePay")}
              disabled={busy}
              aria-label="Payer avec Apple Pay"
              className={`h-12 w-full rounded-full [-apple-pay-button-type:plain] [-webkit-appearance:-apple-pay-button] disabled:opacity-60 ${
                dark
                  ? "[-apple-pay-button-style:white]"
                  : "[-apple-pay-button-style:black]"
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
            <div className="mt-3.5 flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">
              <span className="h-px flex-1 bg-hairline" />
              ou par carte
              <span className="h-px flex-1 bg-hairline" />
            </div>
          )}
        </section>

        <section
          className="rise mt-6 flex flex-col gap-3"
          style={{ animationDelay: "140ms" }}
        >
          {!hasWallet && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">
              Carte bancaire
            </p>
          )}
          <div className={`relative ${state === "loading" ? "min-h-28" : ""}`}>
            {/* Conteneur du formulaire carte Square (iframe hors périmètre PCI).
                Deux fonds blancs à neutraliser : le cadre, que la feuille de
                Square (chargée après la nôtre) peint en blanc — d'où le
                !important —, et l'iframe elle-même, que le navigateur rend
                opaque tant que son color-scheme diffère de celui du parent. */}
            <div
              id={CARD_CONTAINER_ID}
              className="[color-scheme:normal] [&_.sq-card-iframe-container]:bg-surface-raised!"
            />
            {state === "loading" && (
              <div aria-hidden className="absolute inset-0 flex flex-col gap-px overflow-hidden rounded-2xl border border-hairline">
                <div className="shimmer flex-1" />
                <div className="flex flex-1 gap-px">
                  <div className="shimmer flex-1" />
                  <div className="shimmer flex-1" />
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => void pay("card")}
            disabled={busy}
            className="ember-gradient flex h-13 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-background shadow-lg shadow-black/25 transition active:scale-[0.99] disabled:opacity-60"
          >
            {state === "paying" ? (
              <>
                <Spinner />
                Paiement en cours…
              </>
            ) : state === "loading" ? (
              "Préparation du paiement…"
            ) : (
              <>
                <LockIcon className="size-4" />
                Payer {due}
              </>
            )}
          </button>
        </section>

        <footer
          className="rise mt-6 flex flex-col items-center gap-4 border-t border-hairline pt-5"
          style={{ animationDelay: "200ms" }}
        >
          <p className="max-w-xs text-center text-[11px] leading-relaxed text-faint">
            Paiement chiffré, opéré par Square. Vos données de carte ne
            transitent jamais par nos serveurs.
          </p>
          <button
            type="button"
            onClick={() => onDone(false)}
            disabled={state === "paying"}
            className="text-sm font-medium text-muted underline-offset-4 transition hover:text-foreground hover:underline disabled:opacity-40"
          >
            Payer au comptoir plutôt
          </button>
        </footer>
      </div>
    </div>
  );
}
