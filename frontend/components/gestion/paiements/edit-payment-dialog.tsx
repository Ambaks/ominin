"use client";

import { useState } from "react";
import { Field, GlassButton, Input, Plate, Segmented, Sheet } from "@/components/gestion/ui";
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

// « Les deux » : « Espèces + carte » ne tient pas dans un tiers de segmenté au doigt.
const MODES: { value: EncaissementMode; label: string }[] = [
  { value: "especes", label: PAYMENT_MODE_LABELS.especes },
  { value: "carte", label: PAYMENT_MODE_LABELS.carte },
  { value: "mixte", label: "Les deux" },
];

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
    order.paymentMode === "carte" || order.paymentMode === "mixte" ? order.paymentMode : "especes"
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
  const validSplit = mode !== "mixte" || (cashPart != null && cashPart > 0 && cashPart < total);
  // Part réglée en espèces : tout, rien, ou ce que le gérant a saisi.
  const cash = mode === "especes" ? total : mode === "mixte" && validSplit ? cashPart! : 0;
  const given = parseAmount(givenRaw);
  // Montant reçu facultatif : sans saisie, le client a tendu sa part au centime.
  const hasGiven = mode !== "carte" && givenRaw.trim() !== "";
  const validGiven = !hasGiven || (given != null && given >= cash);
  const change = hasGiven && validGiven && given != null ? Math.round((given - cash) * 100) / 100 : 0;
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
    <Sheet
      title="Modifier l'encaissement"
      onClose={onClose}
      footer={
        <>
          {blocker && <p>{blocker}</p>}
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton variant="primary" disabled={!valid} onClick={save}>
            Enregistrer
          </GlassButton>
        </>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-muted">Total de la commande</span>
          <span className="text-g-kpi tabular-nums">{formatPrice(total)}</span>
        </div>

        <Segmented glass={false} label="Mode de paiement" options={MODES} value={mode} onChange={setMode} />

        {mode === "mixte" && (
          <Field
            label="Part en espèces"
            required
            error={cashRaw && !validSplit ? "Entre 0 et le total, exclus." : undefined}
            hint={
              validSplit && cashPart != null
                ? `La carte prend le reste : ${formatPrice(Math.round((total - cashPart) * 100) / 100)}.`
                : "La carte prend le reste."
            }
          >
            <Input
              numeric
              unit="€"
              data-autofocus
              value={cashRaw}
              onChange={(event) => setCashRaw(event.target.value)}
              placeholder="0,00"
            />
          </Field>
        )}

        {mode !== "carte" && (
          <Field
            label="Montant reçu en espèces"
            hint="Seulement s'il y a eu de la monnaie à rendre."
            error={hasGiven && !validGiven ? "Le montant reçu doit couvrir la part en espèces." : undefined}
          >
            <Input
              numeric
              unit="€"
              data-autofocus={mode === "especes" || undefined}
              value={givenRaw}
              onChange={(event) => setGivenRaw(event.target.value)}
              placeholder={amountToInput(cash)}
            />
          </Field>
        )}

        {hasGiven && validGiven && (
          <Plate className="g-money flex items-baseline justify-between px-4 py-3">
            <span className="text-g-label font-medium">Monnaie rendue</span>
            <span className="text-g-kpi tabular-nums">{formatPrice(change)}</span>
          </Plate>
        )}

        {order.tipAmount ? (
          <p className="text-g-meta text-muted">Pourboire de {formatPrice(order.tipAmount)} inchangé.</p>
        ) : null}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Sheet>
  );
}
