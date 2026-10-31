"use client";

import { useState } from "react";
import { Field, GlassButton, Input, Plate, Sheet } from "@/components/gestion/ui";
import { PAYMENT_MODE_LABELS } from "@/lib/gestion/constants";
import { amountToInput, parseAmount } from "@/lib/gestion/format";
import type { CashDetails, EncaissementMode } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";
import { PaymentsIcon, type IconProps } from "../icons";

function CashIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

/** Une addition, deux moyens : la pièce à gauche de la coupure, la bande magnétique à droite. */
function SplitIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M12 5v14" />
      <circle cx="7" cy="12" r="2" />
      <path d="M15 10h5" />
    </svg>
  );
}

/**
 * Choix du mode, puis ce que le mode demande : le rendu de monnaie en espèces,
 * la répartition quand le client partage son addition entre liquide et carte.
 * Le pourboire, lui, s'ajoute au total quel que soit le chemin.
 */
export function PaymentDialog({
  total,
  tips = true,
  onSelect,
  onClose,
}: {
  total: number;
  /** Le champ pourboire : pas au comptoir d'une boutique qui remet un retrait. */
  tips?: boolean;
  onSelect: (mode: EncaissementMode, cashDetails?: CashDetails, tip?: number) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"mode" | "cash" | "split">("mode");
  const [givenRaw, setGivenRaw] = useState("");
  const [tipRaw, setTipRaw] = useState("");
  // Les deux parts d'un règlement mixte : saisir l'une remplit l'autre.
  const [cashRaw, setCashRaw] = useState("");
  const [cardRaw, setCardRaw] = useState("");

  const parsedTip = parseAmount(tipRaw);
  // Le pourboire s'ajoute à l'addition : le client le règle avec elle.
  const tip = parsedTip != null && parsedTip > 0 ? parsedTip : 0;
  const due = Math.round((total + tip) * 100) / 100;

  const given = parseAmount(givenRaw);
  const validGiven = given != null && given >= due;
  const change = validGiven ? Math.round((given - due) * 100) / 100 : 0;

  const cashPart = parseAmount(cashRaw);
  const validSplit = cashPart != null && cashPart > 0 && cashPart < due;
  const cardPart = validSplit ? Math.round((due - cashPart) * 100) / 100 : 0;
  // Montant reçu facultatif : sans saisie, le client a tendu sa part au centime.
  const splitGiven = given != null && given > 0 ? given : cashPart;
  const validSplitGiven = !validSplit || (splitGiven ?? 0) >= cashPart;
  const splitChange =
    validSplit && validSplitGiven
      ? Math.round(((splitGiven ?? cashPart) - cashPart) * 100) / 100
      : 0;

  /** Une part saisie fixe l'autre : ce qui reste du total à régler. */
  const mirror = (raw: string): string => {
    const value = parseAmount(raw);
    return value != null && value > 0 && value < due
      ? amountToInput(Math.round((due - value) * 100) / 100)
      : "";
  };

  const backToMode = () => {
    setStep("mode");
    setCashRaw("");
    setCardRaw("");
  };

  const settleCash = () => {
    if (!validGiven || given == null) return;
    onSelect("especes", { cashGiven: given, cashChange: change }, tip || undefined);
  };

  const settleSplit = () => {
    if (!validSplit || !validSplitGiven || cashPart == null) return;
    onSelect(
      "mixte",
      {
        cashAmount: cashPart,
        cashGiven: splitGiven ?? cashPart,
        cashChange: splitChange,
      },
      tip || undefined
    );
  };

  const dueRow = (
    <div className="g-money flex items-baseline justify-between gap-3">
      <span className="text-g-body text-muted">
        Total à régler{tip > 0 && " (pourboire inclus)"}
      </span>
      <span className="text-g-kpi tabular-nums text-g-entity">{formatPrice(due)}</span>
    </div>
  );

  const footer = (submit: () => void, enabled: boolean, help: string) => (
    <>
      {!enabled && <p>{help}</p>}
      <GlassButton onClick={backToMode}>Retour</GlassButton>
      <GlassButton variant="primary" disabled={!enabled} onClick={submit}>
        Encaisser
      </GlassButton>
    </>
  );

  const changeRow = (label: string, amount: number) => (
    <div className="g-money flex items-baseline justify-between border-t border-hairline pt-2.5">
      <span className="text-g-body font-medium">{label}</span>
      <span className="text-g-name tabular-nums text-g-entity">{formatPrice(amount)}</span>
    </div>
  );

  const onEnter = (submit: () => void) => (event: React.KeyboardEvent) => {
    if (event.key === "Enter") submit();
  };

  if (step === "cash") {
    return (
      <Sheet
        title="Paiement en espèces"
        onClose={onClose}
        footer={footer(settleCash, Boolean(givenRaw) && validGiven, "Indiquez le montant reçu pour encaisser.")}
      >
        <div className="flex flex-col gap-5">
          {dueRow}
          <Field
            label="Montant reçu"
            hint="Au moins le total ; la monnaie se calcule."
            error={givenRaw && given != null && given < due ? "Le montant doit couvrir le total à régler." : undefined}
          >
            <Input
              numeric
              unit="€"
              data-autofocus
              value={givenRaw}
              onChange={(e) => setGivenRaw(e.target.value)}
              onKeyDown={onEnter(settleCash)}
              placeholder={amountToInput(due)}
            />
          </Field>
          {validGiven && <Plate className="px-4 py-3">{changeRow("Monnaie à rendre", change)}</Plate>}
        </div>
      </Sheet>
    );
  }

  if (step === "split") {
    return (
      <Sheet
        title="Paiement espèces + carte"
        onClose={onClose}
        footer={footer(settleSplit, validSplit && validSplitGiven, "Indiquez la part en espèces ou en carte pour encaisser.")}
      >
        <div className="flex flex-col gap-5">
          {dueRow}
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["Espèces", cashRaw, setCashRaw, setCardRaw],
                ["Carte", cardRaw, setCardRaw, setCashRaw],
              ] as const
            ).map(([label, value, setSelf, setOther], index) => (
              <Field
                key={label}
                label={label}
                hint={index === 0 ? "Saisissez une part, l’autre se complète." : undefined}
                error={index === 0 && cashRaw && !validSplit ? "Chaque part doit être entre 0 et le total." : undefined}
              >
                <Input
                  numeric
                  unit="€"
                  data-autofocus={index === 0 || undefined}
                  value={value}
                  onChange={(e) => {
                    setSelf(e.target.value);
                    setOther(mirror(e.target.value));
                  }}
                  onKeyDown={onEnter(settleSplit)}
                  placeholder="0,00"
                />
              </Field>
            ))}
          </div>
          <Field
            label="Reçu en espèces"
            hint="Seulement si vous rendez la monnaie."
            error={validSplit && !validSplitGiven ? "Le montant reçu doit couvrir la part en espèces." : undefined}
          >
            <Input
              numeric
              unit="€"
              value={givenRaw}
              onChange={(e) => setGivenRaw(e.target.value)}
              onKeyDown={onEnter(settleSplit)}
              placeholder={validSplit ? amountToInput(cashPart) : "0,00"}
            />
          </Field>
          {validSplit && validSplitGiven && (
            <Plate className="flex flex-col gap-1.5 px-4 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-g-body text-muted">Espèces en caisse</span>
                <span className="text-g-body font-medium tabular-nums">{formatPrice(cashPart)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-g-body text-muted">À passer en carte</span>
                <span className="text-g-body font-medium tabular-nums">{formatPrice(cardPart)}</span>
              </div>
              {splitChange > 0 && changeRow("Monnaie à rendre", splitChange)}
            </Plate>
          )}
        </div>
      </Sheet>
    );
  }

  const modeButton = (label: string, icon: React.ReactNode, onClick: () => void, className = "") => (
    <button
      type="button"
      onClick={onClick}
      className={`g-plate g-press flex min-h-g-control items-center justify-center gap-2.5 px-4 py-4 text-g-label font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1 ${className}`}
    >
      <span className="flex text-ember-1 *:size-6">{icon}</span>
      {label}
    </button>
  );

  return (
    <Sheet title="Mode de paiement" onClose={onClose}>
      <div className="g-money mb-4 flex items-baseline justify-between gap-3">
        <span className="text-g-body text-muted">
          À encaisser{tip > 0 && " (pourboire inclus)"}
        </span>
        <span className="text-g-kpi tabular-nums text-g-entity">{formatPrice(due)}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {modeButton(PAYMENT_MODE_LABELS.especes, <CashIcon />, () => setStep("cash"), "flex-col py-5")}
        {modeButton(PAYMENT_MODE_LABELS.carte, <PaymentsIcon />, () => onSelect("carte", undefined, tip || undefined), "flex-col py-5")}
      </div>
      <div className="mt-3">
        {modeButton(PAYMENT_MODE_LABELS.mixte, <SplitIcon />, () => setStep("split"), "w-full")}
      </div>
      {tips && (
        <Field label="Pourboire" hint="Facultatif, s’ajoute au total." className="mt-5">
          <Input numeric unit="€" value={tipRaw} onChange={(e) => setTipRaw(e.target.value)} placeholder="0,00" />
        </Field>
      )}
    </Sheet>
  );
}
