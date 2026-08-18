"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { PAYMENT_MODE_LABELS } from "@/lib/gestion/constants";
import type { PaymentMode } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu-data";

function CashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

export interface CashDetails {
  cashGiven: number;
  cashChange: number;
}

export function PaymentDialog({
  total,
  onSelect,
  onClose,
}: {
  total: number;
  onSelect: (mode: PaymentMode, cashDetails?: CashDetails) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"mode" | "cash">("mode");
  const [givenRaw, setGivenRaw] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const given = parseFloat(givenRaw.replace(",", "."));
  const validGiven = !Number.isNaN(given) && given >= total;
  const change = validGiven ? Math.round((given - total) * 100) / 100 : 0;

  if (step === "cash") {
    return (
      <Modal
        title="Paiement en espèces"
        onClose={onClose}
        footer={
          <>
            <button
              type="button"
              onClick={() => setStep("mode")}
              className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold transition-colors hover:border-ember-2/40"
            >
              Retour
            </button>
            <button
              type="button"
              disabled={!givenRaw || !validGiven}
              onClick={() =>
                onSelect("especes", { cashGiven: given, cashChange: change })
              }
              className="ember-gradient rounded-full px-5 py-2 text-sm font-semibold text-background disabled:opacity-40"
            >
              Encaisser
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted">Total à régler</span>
            <span className="font-display text-2xl text-ember-1">
              {formatPrice(total)}
            </span>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Montant reçu</span>
            <div className="flex items-center gap-2 rounded-xl border border-hairline bg-surface px-4 py-3 focus-within:border-ember-2/60">
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                autoFocus
                value={givenRaw}
                onChange={(e) => setGivenRaw(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && givenRaw && validGiven) {
                    onSelect("especes", {
                      cashGiven: given,
                      cashChange: change,
                    });
                  }
                }}
                placeholder={total.toFixed(2).replace(".", ",")}
                className="flex-1 bg-transparent text-lg tabular-nums outline-none placeholder:text-faint"
              />
              <span className="text-sm text-muted">€</span>
            </div>
            {givenRaw && !Number.isNaN(given) && given < total && (
              <span className="text-xs text-ember-3">
                Le montant doit être supérieur ou égal au total.
              </span>
            )}
          </label>

          {validGiven && (
            <div className="flex items-baseline justify-between rounded-xl border border-ember-2/25 bg-ember-2/5 px-4 py-3">
              <span className="text-sm font-medium">Monnaie à rendre</span>
              <span className="font-display text-xl tabular-nums text-ember-1">
                {formatPrice(change)}
              </span>
            </div>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Mode de paiement" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        {(["especes", "carte"] as PaymentMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              if (mode === "especes") setStep("cash");
              else onSelect(mode);
            }}
            className="flex flex-col items-center gap-2 rounded-2xl border border-hairline bg-surface px-4 py-5 text-sm font-semibold transition-colors hover:border-ember-2/40"
          >
            <span className="text-ember-1">
              {mode === "especes" ? <CashIcon /> : <CardIcon />}
            </span>
            {PAYMENT_MODE_LABELS[mode]}
          </button>
        ))}
      </div>
    </Modal>
  );
}
