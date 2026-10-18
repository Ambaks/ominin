"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HoldCountdown } from "@/components/club/hold-countdown";
import { useMagnetic } from "@/components/club/use-magnetic";
import { themeColors } from "@/components/menu/card-payment";
import { useStripeElements, type PreparedIntent } from "@/components/payment/use-stripe-elements";
import { formatCents } from "@/lib/club/format";
import { TABLE_HOLD_S } from "@/lib/club/hold";
import type { Club } from "@/lib/club/types";

/*
 * Le règlement d'une table tenue, sous son compte à rebours. Fournisseur
 * « demo » : rien n'est débité, /api/club/pay règle la réservation. Stripe :
 * use-stripe-elements (comme le menu) sur le compte connecté du club, Apple
 * Pay et Google Pay en tête ; /api/club/verify constate le paiement.
 *
 * Le délai ne coupe jamais un paiement en cours (carte, 3-D Secure) : à
 * zéro, on attend sa fin, puis le serveur dit s'il a été réglé avant de
 * rendre la table.
 */

type Outcome = { onPaid: () => void; onExpired: () => void; onBusy: (busy: boolean) => void };

async function post(path: "/api/club/pay" | "/api/club/verify", bookingId: string) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    paid?: boolean;
    error?: string;
    clientSecret?: string;
    accountId?: string;
    publishableKey?: string;
  };
  return { status: response.status, ok: response.ok, body };
}

function PayButton({
  busy,
  paid,
  totalCents,
  onClick,
}: {
  busy: boolean;
  paid?: boolean;
  totalCents: number;
  onClick?: () => void;
}) {
  const ref = useMagnetic<HTMLButtonElement>();
  return (
    <button
      ref={ref}
      type="button"
      className="club-button club-button-primary club-button-block club-magnet"
      onClick={onClick}
      disabled={busy || paid}
      aria-busy={busy || undefined}
    >
      {paid ? (
        "Payé"
      ) : busy ? (
        <>
          <span className="club-spinner" aria-hidden />
          Paiement…
        </>
      ) : (
        <>
          Payer <span className="club-mono">{formatCents(totalCents)}</span>
        </>
      )}
    </button>
  );
}

function DemoPayment({ bookingId, totalCents, onPaid, onExpired, onBusy }: { bookingId: string; totalCents: number } & Outcome) {
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pay = async () => {
    setPaying(true);
    onBusy(true);
    setError(null);
    try {
      const { status, ok, body } = await post("/api/club/pay", bookingId);
      if (status === 410) return onExpired();
      if (ok && body.paid) {
        setPaid(true);
        return onPaid();
      }
      setError(body.error ?? "Le paiement n'a pas abouti.");
    } catch {
      setError("Connexion perdue. Réessayez.");
    } finally {
      setPaying(false);
      onBusy(false);
    }
  };
  return (
    <div className="club-pay">
      <div className="club-demo">
        <div className="club-demo-card" aria-hidden>
          <span className="club-demo-card-chip" />
          <span className="club-demo-card-number club-mono">•••• 0000</span>
        </div>
        <p className="club-pay-note">
          <strong>Carte de démonstration.</strong> Aucun débit : la table est réservée comme après un vrai paiement.
        </p>
      </div>
      {error && (
        <p className="club-error" role="alert">
          {error}
        </p>
      )}
      <div className="club-sticky-cta">
        <PayButton busy={paying} paid={paid} totalCents={totalCents} onClick={() => void pay()} />
      </div>
    </div>
  );
}

const EXPRESS_ID = "club-stripe-express";
const CARD_ID = "club-stripe-card";

function StripeTablePayment({ bookingId, totalCents, onPaid, onExpired, onBusy }: { bookingId: string; totalCents: number } & Outcome) {
  const [refunded, setRefunded] = useState(false);

  const prepare = useCallback(async (): Promise<PreparedIntent> => {
    const { status, ok, body } = await post("/api/club/pay", bookingId);
    if (status === 410) {
      onExpired();
      return { kind: "halt" };
    }
    if (ok && body.paid) return { kind: "paid" };
    if (!ok || !body.clientSecret || !body.accountId || !body.publishableKey) return { kind: "error" };
    return { kind: "intent", clientSecret: body.clientSecret, accountId: body.accountId, publishableKey: body.publishableKey };
  }, [bookingId, onExpired]);

  // Débité : le serveur relit l'intent. S'il n'a pas pu tenir la table (délai
  // passé et table reprise), il a remboursé : on le dit. Sans réponse, le
  // webhook réglera la réservation ; la page de réservation fait foi.
  const onSucceeded = useCallback(async () => {
    const verified = await post("/api/club/verify", bookingId).catch(() => null);
    if (verified?.ok && verified.body.paid === false) setRefunded(true);
    else onPaid();
  }, [bookingId, onPaid]);

  const appearance = useCallback((container: HTMLElement) => {
    const color = themeColors(container, ["--c-raised", "--c-text", "--c-muted", "--c-line-strong", "--c-gold", "--c-danger"]);
    return {
      dark: true,
      appearance: {
        theme: "night" as const,
        variables: {
          colorPrimary: color["--c-gold"],
          colorBackground: color["--c-raised"],
          colorText: color["--c-text"],
          colorTextSecondary: color["--c-muted"],
          colorTextPlaceholder: color["--c-muted"],
          colorDanger: color["--c-danger"],
          borderRadius: "12px",
        },
        rules: {
          ".Input": { borderColor: color["--c-line-strong"], boxShadow: "none" },
          ".Input:focus": { borderColor: color["--c-gold"], boxShadow: "none" },
        },
      },
    };
  }, []);

  const { state, hasWallet, confirm, retry } = useStripeElements({
    expressId: EXPRESS_ID,
    cardId: CARD_ID,
    prepareKey: bookingId,
    prepare,
    onSucceeded,
    onAlreadyPaid: onPaid,
    appearance,
    // La hauteur des boutons de la page (--c-control).
    buttonHeight: 52,
  });

  useEffect(() => {
    onBusy(state === "paying");
  }, [state, onBusy]);

  if (refunded) {
    return (
      <div className="club-pay">
        <p className="club-error" role="alert">
          Votre paiement est arrivé après la fin du délai, et la table n&rsquo;était plus libre : il vous est remboursé
          automatiquement, sans démarche de votre part.
        </p>
        <button type="button" className="club-button club-button-ghost club-button-block" onClick={onExpired}>
          Choisir une autre table
        </button>
      </div>
    );
  }

  if (state === "declined" || state === "error") {
    return (
      <div className="club-pay">
        <p className="club-error" role="alert">
          {state === "declined"
            ? "Paiement refusé par votre banque. Rien n'a été débité."
            : "Le paiement n'a pas pu aboutir. Réessayez : un paiement déjà passé ne sera pas compté deux fois."}
        </p>
        <button type="button" className="club-button club-button-ghost club-button-block" onClick={retry}>
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="club-pay" aria-busy={state === "loading" || undefined}>
      {state === "loading" && (
        <div className="club-skeleton-stack" aria-hidden>
          <span className="club-skeleton club-skeleton-wallet" />
          <span className="club-skeleton club-skeleton-card" />
        </div>
      )}
      <div id={EXPRESS_ID} className={`club-pay-wallets${state === "paying" ? " club-pay-locked" : ""}`} />
      {hasWallet && (
        <p className="club-pay-or" aria-hidden>
          <span>ou par carte</span>
        </p>
      )}
      <div id={CARD_ID} className="club-pay-card" />
      <p className="club-pay-note">Paiement sécurisé par Stripe : votre numéro de carte ne passe jamais par Ominin.</p>
      <div className="club-sticky-cta">
        <PayButton
          busy={state === "paying" || state === "loading"}
          paid={state === "paid"}
          totalCents={totalCents}
          onClick={() => void confirm()}
        />
      </div>
    </div>
  );
}

export function TablePayment({
  provider,
  bookingId,
  totalCents,
  remainingMs,
  onPaid,
  onExpired,
}: {
  provider: Club["paymentProvider"];
  bookingId: string;
  totalCents: number;
  /** Temps restant sur la table tenue, au montage. */
  remainingMs: number;
  onPaid: () => void;
  onExpired: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  // Les rappels du parent changent à chaque rendu : les enfants reçoivent des fonctions stables.
  const outcome = useRef({ onPaid, onExpired });
  useEffect(() => {
    outcome.current = { onPaid, onExpired };
  }, [onPaid, onExpired]);
  const paid = useCallback(() => outcome.current.onPaid(), []);
  const expired = useCallback(() => outcome.current.onExpired(), []);

  useEffect(() => {
    if (!timeUp || busy) return;
    let gone = false;
    post("/api/club/verify", bookingId)
      .then(({ body }) => {
        if (!gone) (body.paid ? paid : expired)();
      })
      .catch(() => {
        if (!gone) expired();
      });
    return () => {
      gone = true;
    };
  }, [timeUp, busy, bookingId, paid, expired]);

  const onTimeUp = useCallback(() => setTimeUp(true), []);
  const props = { bookingId, totalCents, onPaid: paid, onExpired: expired, onBusy: setBusy };
  return (
    <div className="club-paystep">
      <div className="club-paystep-head">
        <HoldCountdown remainingMs={remainingMs} totalMs={TABLE_HOLD_S * 1000} onExpire={onTimeUp} />
        <p aria-live="polite">
          {timeUp ? (
            busy ? (
              "Paiement en cours : la table reste à vous jusqu'à sa réponse."
            ) : (
              "Délai écoulé, vérification…"
            )
          ) : (
            <>
              <strong>Table tenue pour vous.</strong> Réglez avant la fin du compte à rebours.
            </>
          )}
        </p>
      </div>
      {provider === "demo" ? <DemoPayment {...props} /> : <StripeTablePayment {...props} />}
    </div>
  );
}
