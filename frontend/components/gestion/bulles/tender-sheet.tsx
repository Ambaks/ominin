"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CashChangeFields, CashIcon, readCash } from "@/components/gestion/commandes/payment-dialog";
import { PaymentsIcon } from "@/components/gestion/icons";
import { GlassButton, Sheet } from "@/components/gestion/ui";
import { PAYMENT_MODE_LABELS } from "@/lib/gestion/constants";
import type { BulleTender } from "@/lib/gestion/bulles-api";
import { formatPrice } from "@/lib/menu/format";

/*
 * Encaisser une réservation sur place. Carte : le client paie sur le TPE du
 * restaurant et le geste ne fait que l'enregistrer, sans appel à Square.
 * Espèces : le rendu de monnaie de l'addition, sans pourboire. `later` ajoute
 * le choix de ne rien encaisser maintenant.
 */
export function TenderSheet({
  amountCents,
  busy,
  later,
  onSelect,
  onClose,
}: {
  amountCents: number;
  busy: boolean;
  later?: () => void;
  onSelect: (tender: BulleTender) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"mode" | "cash">("mode");
  const [givenRaw, setGivenRaw] = useState("");
  const due = amountCents / 100;
  const { valid } = readCash(givenRaw, due);
  const cashBody = useRef<HTMLDivElement>(null);
  useEffect(() => {
    cashBody.current?.querySelector("input")?.focus();
  }, [step]);

  const settleCash = () => {
    if (valid && !busy) onSelect("especes");
  };

  if (step === "cash") {
    return (
      <Sheet
        title="Paiement en espèces"
        onClose={onClose}
        footer={
          <>
            {!valid && <p>Indiquez le montant reçu pour encaisser.</p>}
            <GlassButton onClick={() => setStep("mode")}>Retour</GlassButton>
            <GlassButton variant="primary" disabled={!valid || busy} onClick={settleCash}>
              Encaisser
            </GlassButton>
          </>
        }
      >
        <div ref={cashBody} className="flex flex-col gap-5">
          <CashChangeFields
            due={due}
            dueLabel="Total à régler"
            givenRaw={givenRaw}
            onGivenChange={setGivenRaw}
            onSubmit={settleCash}
          />
        </div>
      </Sheet>
    );
  }

  const modeButton = (label: string, icon: ReactNode, onClick: () => void) => (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="g-plate g-press flex min-h-g-control flex-col items-center justify-center gap-2.5 px-4 py-5 text-g-label font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1 disabled:opacity-50"
    >
      <span className="flex text-ember-1 *:size-6">{icon}</span>
      {label}
    </button>
  );

  return (
    <Sheet title="Mode de paiement" onClose={onClose}>
      <div className="g-money mb-4 flex items-baseline justify-between gap-3">
        <span className="text-g-body text-muted">À encaisser</span>
        <span className="text-g-kpi tabular-nums text-g-entity">{formatPrice(due)}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {modeButton(PAYMENT_MODE_LABELS.carte, <PaymentsIcon />, () => onSelect("carte"))}
        {modeButton(PAYMENT_MODE_LABELS.especes, <CashIcon />, () => setStep("cash"))}
      </div>
      <p className="mt-3 text-g-meta text-muted">
        Carte : le client paie sur votre TPE, puis appuyez sur Carte. Ominin l&rsquo;enregistre seulement.
      </p>
      {later && (
        <GlassButton className="mt-4 w-full" disabled={busy} onClick={later}>
          Plus tard
        </GlassButton>
      )}
    </Sheet>
  );
}
