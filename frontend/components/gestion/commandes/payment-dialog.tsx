"use client";

import { Modal } from "@/components/ui/modal";
import { PAYMENT_MODE_LABELS } from "@/lib/gestion/constants";
import type { PaymentMode } from "@/lib/gestion/types";

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

export function PaymentDialog({
  onSelect,
  onClose,
}: {
  onSelect: (mode: PaymentMode) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Mode de paiement" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        {(["especes", "carte"] as PaymentMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onSelect(mode)}
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
