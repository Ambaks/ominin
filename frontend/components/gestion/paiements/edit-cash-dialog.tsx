"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { orderTotal } from "@/lib/gestion/selectors";
import type { Order } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu-data";

export function EditCashDialog({
  order,
  onSave,
  onClose,
}: {
  order: Order;
  onSave: (cashGiven: number, cashChange: number) => void;
  onClose: () => void;
}) {
  const total = orderTotal(order);
  const [givenRaw, setGivenRaw] = useState(
    order.cashGiven != null
      ? order.cashGiven.toFixed(2).replace(".", ",")
      : ""
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const given = parseFloat(givenRaw.replace(",", "."));
  const validGiven = !Number.isNaN(given) && given >= total;
  const change = validGiven ? Math.round((given - total) * 100) / 100 : 0;

  return (
    <Modal
      title="Modifier le paiement"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold transition-colors hover:border-ember-2/40"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!givenRaw || !validGiven}
            onClick={() => onSave(given, change)}
            className="ember-gradient rounded-full px-5 py-2 text-sm font-semibold text-background disabled:opacity-40"
          >
            Enregistrer
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted">Total de la commande</span>
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
                  onSave(given, change);
                }
              }}
              placeholder={total.toFixed(2).replace(".", ",")}
              className="flex-1 bg-transparent text-lg tabular-nums outline-none placeholder:text-faint"
            />
            <span className="text-sm text-muted">&euro;</span>
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
