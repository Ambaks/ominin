"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CardPaymentFailed,
  CardPaymentForm,
  CardPaymentPaid,
  isDarkTheme,
  themeColors,
  type CardPaymentState,
} from "@/components/menu/card-payment";
import {
  SQUARE_CARD_CONTAINER_ID,
  SQUARE_GOOGLE_PAY_CONTAINER_ID,
  useSquarePayments,
  type SquareMethodName,
} from "@/components/payment/use-square-payments";
import { formatPrice } from "@/lib/menu/format";
import type { CardPhase } from "@/lib/menu/online-payment";

/*
 * Règlement d'une commande dans la page via le SDK Web Payments de Square
 * (useSquarePayments). L'ordre est inverse de SumUp : là-bas le checkout
 * était créé au serveur puis le widget montait dessus ; ici le formulaire
 * carte se monte d'abord, et le serveur n'est appelé qu'une fois le jeton
 * obtenu. La commande est déjà enregistrée et part en cuisine dès
 * l'encaissement.
 */

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

export function SquarePayment({
  orderId,
  locationId,
  total,
  tipAmount,
  merchant,
  bar,
  onDone,
  onPhase,
}: {
  orderId: string;
  locationId: string;
  /** Affiché par Apple Pay / Google Pay ; le montant débité reste celui du serveur. */
  total: number;
  tipAmount: number;
  /** L'établissement encaisseur, nommé au-dessus du montant. */
  merchant?: string;
  /** Retrait au bar : on y règle, au lieu du comptoir. */
  bar: boolean;
  /** Fin du règlement — payé, ou abandon (le client réglera au comptoir). */
  onDone: (paid: boolean) => void;
  onPhase?: (phase: CardPhase) => void;
}) {
  const amount = (total + tipAmount).toFixed(2);
  const square = useSquarePayments({ locationId, amount, cardStyle, isDark: isDarkTheme });
  // Ce que le client a fait du formulaire prêt ; null : l'état du SDK.
  const [outcome, setOutcome] = useState<"paying" | "paid" | "declined" | null>(null);
  const state: CardPaymentState = outcome ?? square.status;
  const phase: CardPhase = state === "paying" ? "charging" : state === "paid" ? "paid" : "form";
  useEffect(() => {
    onPhase?.(phase);
  }, [phase, onPhase]);

  const { tokenize } = square;
  const pay = useCallback(async (method: SquareMethodName) => {
    setOutcome("paying");
    try {
      const token = await tokenize(method);
      if (!token) {
        setOutcome("declined");
        return;
      }
      // Le montant n'est pas transmis : le serveur relit les lignes en base.
      const response = await fetch("/api/square/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          sourceId: token,
          ...(tipAmount > 0 ? { tipAmount } : {}),
        }),
      });
      const body = (await response.json()) as { paid?: boolean };
      setOutcome(response.ok && body.paid ? "paid" : "declined");
    } catch {
      setOutcome("declined");
    }
  }, [orderId, tipAmount, tokenize]);

  if (state === "paid") {
    return (
      <CardPaymentPaid bar={bar} due={formatPrice(total + tipAmount)} onContinue={() => onDone(true)} />
    );
  }

  if (state === "declined" || state === "error") {
    return (
      <CardPaymentFailed
        bar={bar}
        declined={state === "declined"}
        onRetry={() => {
          setOutcome(null);
          square.retry();
        }}
        onCounter={() => onDone(false)}
      />
    );
  }

  const { wallets, dark } = square;
  return (
    <CardPaymentForm
      bar={bar}
      state={state}
      total={total}
      tipAmount={tipAmount}
      merchant={merchant}
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
            id={SQUARE_GOOGLE_PAY_CONTAINER_ID}
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
          id={SQUARE_CARD_CONTAINER_ID}
          className="[color-scheme:normal] [&_.sq-card-iframe-container]:bg-surface-raised!"
        />
      }
    />
  );
}
