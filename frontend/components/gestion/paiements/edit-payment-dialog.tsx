"use client";

import { useState } from "react";
import { GlassButton, Plate } from "@/components/gestion/ui";
import { Modal } from "@/components/ui/modal";
import type { PaymentCorrection } from "@/lib/gestion/api";
import { PAYMENT_MODE_LABELS } from "@/lib/gestion/constants";
import { amountToInput, parseAmount } from "@/lib/gestion/format";
import { orderTotal, paidInMode } from "@/lib/gestion/selectors";
import type { EncaissementMode, Order } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";

/*
 * Correction d'un encaissement par le gérant : le mode — espèces, carte, ou
 * les deux —, la part en espèces d'un règlement partagé, et ce que le client
 * a tendu s'il y a eu de la monnaie à rendre. Le total est celui de la
 * marchandise ; le pourboire, posé à l'encaissement, ne se retouche pas ici.
 */

const MODES: EncaissementMode[] = ["especes", "carte", "mixte"];

const FIELD_CLASS =
  "flex items-center gap-2 rounded-g-card border border-hairline bg-surface px-4 py-3 focus-within:border-ember-2/60";

export function EditPaymentDialog({
  order,
  onSave,
  onClose,
}: {
  order: Order;
  onSave: (correction: PaymentCorrection) => void;
  onClose: () => void;
}) {
  const total = orderTotal(order);
  const cashLeg = order.payments.find((leg) => leg.mode === "especes");
  const [mode, setMode] = useState<EncaissementMode>(
    order.paymentMode === "carte" || order.paymentMode === "mixte"
      ? order.paymentMode
      : "especes"
  );
  const [cashRaw, setCashRaw] = useState(
    order.paymentMode === "mixte" ? amountToInput(paidInMode(order, "especes")) : ""
  );
  const [givenRaw, setGivenRaw] = useState(
    order.cashGiven != null
      ? amountToInput(order.cashGiven)
      : cashLeg?.cashGiven != null
        ? amountToInput(cashLeg.cashGiven)
        : ""
  );

  const cashPart = parseAmount(cashRaw);
  const validSplit =
    mode !== "mixte" || (cashPart != null && cashPart > 0 && cashPart < total);
  // Part réglée en espèces : tout, rien, ou ce que le gérant a saisi.
  const cash =
    mode === "especes" ? total : mode === "mixte" && validSplit ? cashPart! : 0;
  const given = parseAmount(givenRaw);
  // Montant reçu facultatif : sans saisie, le client a tendu sa part au centime.
  const hasGiven = mode !== "carte" && givenRaw.trim() !== "";
  const validGiven = !hasGiven || (given != null && given >= cash);
  const change =
    hasGiven && validGiven && given != null
      ? Math.round((given - cash) * 100) / 100
      : 0;
  const valid = validSplit && validGiven;
  // Le bouton désactivé dit pourquoi (§ 3.9).
  const blocker = !validSplit
    ? "Indiquez la part en espèces pour enregistrer."
    : !validGiven
      ? "Le montant reçu doit couvrir la part en espèces."
      : null;

  const save = () => {
    if (!valid) return;
    onSave({
      mode,
      cashAmount: mode === "mixte" ? cashPart! : undefined,
      cashGiven: hasGiven ? given! : undefined,
      cashChange: hasGiven ? change : undefined,
    });
  };

  return (
    <Modal
      title="Modifier l'encaissement"
      onClose={onClose}
      footer={
        <>
          {blocker && (
            <span className="mr-auto text-g-meta text-muted">{blocker}</span>
          )}
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton variant="primary" disabled={!valid} onClick={save}>
            Enregistrer
          </GlassButton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-baseline justify-between">
          <span className="text-muted">Total de la commande</span>
          <span className="text-g-kpi tabular-nums">{formatPrice(total)}</span>
        </div>

        <div role="group" aria-label="Mode de paiement" className="grid grid-cols-3 gap-2">
          {MODES.map((candidate) => (
            <button
              key={candidate}
              type="button"
              onClick={() => setMode(candidate)}
              aria-pressed={mode === candidate}
              className={`g-press min-h-g-control rounded-g-card border px-3 py-2.5 text-g-label font-semibold transition-colors ${
                mode === candidate
                  ? "border-ember-2 bg-ember-2/10 text-foreground"
                  : "border-hairline bg-surface text-muted"
              }`}
            >
              {PAYMENT_MODE_LABELS[candidate]}
            </button>
          ))}
        </div>

        {mode === "mixte" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-g-label font-medium">Part en espèces</span>
            <div className={FIELD_CLASS}>
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                value={cashRaw}
                onChange={(event) => setCashRaw(event.target.value)}
                placeholder="0,00"
                className="flex-1 bg-transparent text-lg tabular-nums outline-none placeholder:text-faint"
              />
              <span className="text-muted">€</span>
            </div>
            <span className={`text-g-meta ${cashRaw && !validSplit ? "text-foreground" : "text-muted"}`}>
              {cashRaw && !validSplit
                ? "La part doit être supérieure à 0 et inférieure au total."
                : validSplit && cashPart != null
                  ? `La carte prend le reste : ${formatPrice(Math.round((total - cashPart) * 100) / 100)}.`
                  : "La carte prend le reste."}
            </span>
          </label>
        )}

        {mode !== "carte" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-g-label font-medium">
              Montant reçu en espèces{" "}
              <span className="font-normal text-muted">(si monnaie rendue)</span>
            </span>
            <div className={FIELD_CLASS}>
              <input
                type="text"
                inputMode="decimal"
                autoFocus={mode === "especes"}
                value={givenRaw}
                onChange={(event) => setGivenRaw(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") save();
                }}
                placeholder={amountToInput(cash)}
                className="flex-1 bg-transparent text-lg tabular-nums outline-none placeholder:text-faint"
              />
              <span className="text-muted">€</span>
            </div>
          </label>
        )}

        {hasGiven && validGiven && (
          <Plate className="g-money flex items-baseline justify-between px-4 py-3">
            <span className="text-g-label font-medium">Monnaie rendue</span>
            <span className="text-g-kpi tabular-nums">{formatPrice(change)}</span>
          </Plate>
        )}

        {order.tipAmount ? (
          <p className="text-g-meta text-muted">
            Pourboire de {formatPrice(order.tipAmount)} inchangé.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
