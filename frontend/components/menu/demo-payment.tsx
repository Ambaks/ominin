"use client";

import { useEffect, useState } from "react";
import {
  CardPaymentFailed,
  CardPaymentForm,
  CardPaymentPaid,
  type CardPaymentState,
} from "@/components/menu/card-payment";
import type { CardPhase } from "@/lib/menu/online-payment";
import { formatPrice } from "@/lib/menu/format";

/*
 * Règlement de démonstration (fournisseur « demo ») : la même feuille que
 * Stripe ou Square, avec une carte de test déjà saisie, et /api/demo/pay qui
 * marque la commande payée — aucun débit. Les champs sont figés : on n'y
 * tape rien, et rien de ce qui s'y lit ne part.
 */
export function DemoPayment({
  orderId,
  total,
  tipAmount,
  onDone,
  onPhase,
}: {
  orderId: string;
  total: number;
  tipAmount: number;
  /** Fin du règlement — payé, ou abandon. */
  onDone: (paid: boolean) => void;
  onPhase?: (phase: CardPhase) => void;
}) {
  const [state, setState] = useState<Extract<CardPaymentState, "ready" | "paying" | "paid" | "declined">>("ready");
  const phase: CardPhase = state === "paying" ? "charging" : state === "paid" ? "paid" : "form";
  useEffect(() => {
    onPhase?.(phase);
  }, [phase, onPhase]);

  const pay = async () => {
    setState("paying");
    try {
      const response = await fetch("/api/demo/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tipAmount > 0 ? { orderId, tipAmount } : { orderId }),
      });
      const body = (await response.json()) as { paid?: boolean };
      setState(response.ok && body.paid ? "paid" : "declined");
    } catch {
      setState("declined");
    }
  };

  if (state === "paid") {
    return (
      <CardPaymentPaid due={formatPrice(total + tipAmount)} onContinue={() => onDone(true)} />
    );
  }

  if (state === "declined") {
    return (
      <CardPaymentFailed
        declined
        onRetry={() => setState("ready")}
        onCounter={() => onDone(false)}
      />
    );
  }

  return (
    <CardPaymentForm
      state={state}
      total={total}
      tipAmount={tipAmount}
      hasWallet={false}
      wallets={null}
      operator="Ominin, en démonstration"
      onPay={() => void pay()}
      onCounter={() => onDone(false)}
      card={<DemoCard />}
    />
  );
}

/** La carte de test, comme les champs d'un prestataire, en lecture seule. */
function DemoCard() {
  const field = "flex flex-col gap-0.5 px-4 py-3";
  const label = "text-[11px] font-medium text-faint";
  const value = "text-[15px] tabular-nums tracking-wide";
  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-surface">
      <div className={`${field} border-b border-hairline`}>
        <span className={label}>Numéro de carte</span>
        <span className="flex items-center justify-between gap-3">
          <span className={value}>4242 4242 4242 4242</span>
          <span className="rounded border border-hairline px-1.5 py-0.5 text-[10px] font-bold italic tracking-wider text-muted">
            VISA
          </span>
        </span>
      </div>
      <div className="grid grid-cols-2">
        <div className={`${field} border-r border-hairline`}>
          <span className={label}>Expiration</span>
          <span className={value}>12 / 34</span>
        </div>
        <div className={field}>
          <span className={label}>Cryptogramme</span>
          <span className={value}>123</span>
        </div>
      </div>
      <p className="border-t border-hairline bg-ember-2/8 px-4 py-2 text-[11px] font-medium text-muted">
        Carte de démonstration : aucun débit.
      </p>
    </div>
  );
}
