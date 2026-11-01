"use client";

import { useCallback, useState } from "react";
import { themeColors } from "@/components/menu/card-payment";
import { HoldCountdown } from "@/components/club/hold-countdown";
import {
  SQUARE_CARD_CONTAINER_ID,
  SQUARE_GOOGLE_PAY_CONTAINER_ID,
  useSquarePayments,
  type SquareMethodName,
} from "@/components/payment/use-square-payments";
import type { BulleCheckout } from "@/lib/bulles/server";
import { TABLE_HOLD_S } from "@/lib/club/hold";
import { formatCents } from "@/lib/club/format";

/*
 * Le paiement d'une part de bulle : la carte, Apple Pay ou Google Pay par la
 * caisse Square du restaurant (ou un bouton en démonstration), sous le
 * compte à rebours de la place tenue. Le montant affiché n'est qu'indicatif :
 * le serveur débite celui de la part, relu en base.
 */

/** Ce que le serveur a fait du paiement (PartOutcome, lib/bulles/settle). */
export type PartResult = {
  paid: boolean;
  confirmed: boolean;
  /** Rendu au client : plus de bulle (closed), places déjà payées (full), paiement en trop (mismatch). */
  refunded: "closed" | "full" | "mismatch" | null;
};

/** Ce qu'on dit d'un paiement rendu. */
export function refundMessage(reason: NonNullable<PartResult["refunded"]>): string {
  return reason === "closed"
    ? "Toutes les bulles de ce créneau viennent d'être confirmées par d'autres groupes : votre paiement vous est remboursé."
    : reason === "full"
      ? "Les places du groupe venaient d'être toutes payées : votre paiement vous est remboursé."
      : "Ce paiement ne correspondait plus à votre place : il vous est remboursé.";
}

/** Le formulaire carte vit dans une iframe Square : les couleurs du parchemin lui sont passées. */
function cardStyle(element: Element): Record<string, Record<string, string>> {
  const color = themeColors(element, ["--bo-filet", "--bo-caramel", "--bo-erreur", "--bo-nuit", "--bo-muted"]);
  return {
    ".input-container": { borderColor: color["--bo-filet"], borderRadius: "16px" },
    ".input-container.is-focus": { borderColor: color["--bo-caramel"] },
    ".input-container.is-error": { borderColor: color["--bo-erreur"] },
    input: { color: color["--bo-nuit"] },
    "input::placeholder": { color: color["--bo-muted"] },
    ".message-text": { color: color["--bo-muted"] },
    ".message-icon": { color: color["--bo-muted"] },
    ".message-text.is-error": { color: color["--bo-erreur"] },
    ".message-icon.is-error": { color: color["--bo-erreur"] },
  };
}

// Le formulaire est posé sur le parchemin : portefeuilles en noir.
const lightBackground = () => false;

async function settle(partId: string, sourceId?: string): Promise<PartResult | { error: string }> {
  const response = await fetch("/api/bulles/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ partId, sourceId }),
  });
  const body = (await response.json().catch(() => ({}))) as Partial<PartResult> & { error?: string };
  if (!response.ok) return { error: body.error ?? "Le paiement n'a pas pu aboutir." };
  return { paid: Boolean(body.paid), confirmed: Boolean(body.confirmed), refunded: body.refunded ?? null };
}

function SquareForm({
  partId,
  amountCents,
  locationId,
  onResult,
}: {
  partId: string;
  amountCents: number;
  locationId: string;
  onResult: (result: PartResult) => void;
}) {
  const square = useSquarePayments({
    locationId,
    amount: (amountCents / 100).toFixed(2),
    cardStyle,
    isDark: lightBackground,
  });
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { tokenize, retry } = square;

  const pay = useCallback(
    async (method: SquareMethodName) => {
      setPaying(true);
      setError(null);
      try {
        const token = await tokenize(method);
        // Carte incomplète, ou Apple Pay / Google Pay refermé : le formulaire
        // reste tel quel, rien n'a été envoyé.
        if (!token) {
          setError("Vérifiez la carte, ou choisissez un autre moyen de paiement.");
          setPaying(false);
          return;
        }
        const result = await settle(partId, token);
        if (!("error" in result) && (result.paid || result.refunded)) {
          onResult(result);
          return;
        }
        // Refus de la banque : le jeton carte est consommé, un formulaire neuf
        // en demande un autre.
        setError("error" in result ? result.error : "Paiement refusé : essayez une autre carte.");
        retry();
      } catch {
        setError("Le paiement n'a pas pu aboutir.");
        retry();
      }
      setPaying(false);
    },
    [partId, tokenize, retry, onResult]
  );

  const ready = square.status === "ready" && !paying;
  const hasWallet = square.wallets.applePay || square.wallets.googlePay;
  return (
    <div className="bo-pay-form">
      {square.wallets.applePay && (
        <button
          type="button"
          onClick={() => void pay("applePay")}
          disabled={!ready}
          aria-label="Payer avec Apple Pay"
          className="bo-apple-pay"
        />
      )}
      {/* Square y injecte le bouton Google Pay ; vide si indisponible. */}
      <div
        key={`google-${square.attempt}`}
        id={SQUARE_GOOGLE_PAY_CONTAINER_ID}
        onClick={() => void pay("googlePay")}
        className="bo-google-pay"
        data-shown={square.wallets.googlePay || undefined}
        data-busy={paying || undefined}
      />
      {hasWallet && <p className="bo-pay-or">ou par carte</p>}
      <div className="bo-card-fields" data-loading={square.status === "loading" || undefined}>
        <div key={`card-${square.attempt}`} id={SQUARE_CARD_CONTAINER_ID} />
      </div>
      {square.status === "error" && (
        <p className="bo-form-error" role="alert">
          Le paiement n&rsquo;a pas pu démarrer. Rechargez la page dans un instant.
        </p>
      )}
      {error && (
        <p className="bo-form-error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="bo-button bo-button--block" onClick={() => void pay("card")} disabled={!ready}>
        {paying ? "Paiement en cours…" : square.status === "loading" ? "Préparation du paiement…" : `Payer ${formatCents(amountCents)}`}
      </button>
      <p className="bo-pay-secure">Paiement sécurisé par Square, directement au restaurant.</p>
    </div>
  );
}

function DemoForm({ partId, amountCents, onResult }: { partId: string; amountCents: number; onResult: (result: PartResult) => void }) {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pay = async () => {
    setPaying(true);
    setError(null);
    const result = await settle(partId).catch(() => ({ error: "Le paiement n'a pas pu aboutir." }));
    if ("error" in result) setError(result.error);
    else onResult(result);
    setPaying(false);
  };
  return (
    <div className="bo-pay-form">
      {error && (
        <p className="bo-form-error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="bo-button bo-button--block" onClick={() => void pay()} disabled={paying}>
        {paying ? "Paiement en cours…" : `Payer ${formatCents(amountCents)}`}
      </button>
      <p className="bo-pay-secure">Démonstration : aucune carte n&rsquo;est débitée.</p>
    </div>
  );
}

export function BullePayment({
  partId,
  amountCents,
  places,
  holdExpiresAt,
  checkout,
  onResult,
  onExpire,
}: {
  partId: string;
  amountCents: number;
  places: number;
  holdExpiresAt: string;
  checkout: BulleCheckout;
  onResult: (result: PartResult) => void;
  onExpire: () => void;
}) {
  // Le délai se compte depuis la réponse du serveur : l'horloge de
  // l'appareil n'y entre pas au-delà de l'écart initial.
  const [remainingMs] = useState(() => Date.parse(holdExpiresAt) - Date.now());
  return (
    <section className="bo-pay" aria-labelledby="bo-pay-title">
      <header className="bo-pay-head">
        <div>
          <p className="bo-eyebrow">Paiement</p>
          <h2 id="bo-pay-title" className="bo-pay-amount">
            {formatCents(amountCents)}
          </h2>
          <p className="bo-pay-detail">
            {places} place{places > 1 ? "s" : ""}, gardée{places > 1 ? "s" : ""} le temps de payer
          </p>
        </div>
        <HoldCountdown remainingMs={remainingMs} totalMs={TABLE_HOLD_S * 1000} onExpire={onExpire} what="vos places" />
      </header>
      {checkout.provider === "square" ? (
        <SquareForm partId={partId} amountCents={amountCents} locationId={checkout.locationId} onResult={onResult} />
      ) : (
        <DemoForm partId={partId} amountCents={amountCents} onResult={onResult} />
      )}
    </section>
  );
}
