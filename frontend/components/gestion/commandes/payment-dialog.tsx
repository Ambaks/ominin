"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { PAYMENT_MODE_LABELS } from "@/lib/gestion/constants";
import type { CashDetails, EncaissementMode } from "@/lib/gestion/types";
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

/** Une addition, deux moyens : la pièce à gauche de la coupure, la bande magnétique à droite. */
function SplitIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M12 5v14" />
      <circle cx="7" cy="12" r="2" />
      <path d="M15 10h5" />
    </svg>
  );
}

function parseAmount(raw: string): number | null {
  const value = parseFloat(raw.replace(",", "."));
  return Number.isNaN(value) ? null : Math.round(value * 100) / 100;
}

function amountField(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

const FIELD_CLASS =
  "flex items-center gap-2 rounded-xl border border-hairline bg-surface px-4 py-3 focus-within:border-ember-2/60";

/**
 * Choix du mode, puis ce que le mode demande : le rendu de monnaie en espèces,
 * la répartition quand le client partage son addition entre liquide et carte.
 * Le pourboire, lui, s'ajoute au total quel que soit le chemin.
 */
export function PaymentDialog({
  total,
  onSelect,
  onClose,
}: {
  total: number;
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
      ? amountField(Math.round((due - value) * 100) / 100)
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
    <div className="flex items-baseline justify-between">
      <span className="text-sm text-muted">
        Total à régler{tip > 0 && " (pourboire inclus)"}
      </span>
      <span className="font-display text-2xl text-ember-1">
        {formatPrice(due)}
      </span>
    </div>
  );

  const footer = (submit: () => void, enabled: boolean) => (
    <>
      <button
        type="button"
        onClick={backToMode}
        className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold transition-colors hover:border-ember-2/40"
      >
        Retour
      </button>
      <button
        type="button"
        disabled={!enabled}
        onClick={submit}
        className="ember-gradient rounded-full px-5 py-2 text-sm font-semibold text-background disabled:opacity-40"
      >
        Encaisser
      </button>
    </>
  );

  if (step === "cash") {
    return (
      <Modal
        title="Paiement en espèces"
        onClose={onClose}
        footer={footer(settleCash, Boolean(givenRaw) && validGiven)}
      >
        <div className="flex flex-col gap-5">
          {dueRow}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Montant reçu</span>
            <div className={FIELD_CLASS}>
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                value={givenRaw}
                onChange={(e) => setGivenRaw(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") settleCash();
                }}
                placeholder={amountField(due)}
                className="flex-1 bg-transparent text-lg tabular-nums outline-none placeholder:text-faint"
              />
              <span className="text-sm text-muted">€</span>
            </div>
            {givenRaw && given != null && given < due && (
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

  if (step === "split") {
    return (
      <Modal
        title="Paiement espèces + carte"
        onClose={onClose}
        footer={footer(settleSplit, validSplit && validSplitGiven)}
      >
        <div className="flex flex-col gap-5">
          {dueRow}

          <div className="flex flex-col gap-2">
            {(
              [
                ["Espèces", cashRaw, setCashRaw, setCardRaw],
                ["Carte", cardRaw, setCardRaw, setCashRaw],
              ] as const
            ).map(([label, value, setSelf, setOther], index) => (
              <label key={label} className={FIELD_CLASS}>
                <span className="w-20 shrink-0 text-sm font-medium">{label}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoFocus={index === 0}
                  value={value}
                  onChange={(e) => {
                    setSelf(e.target.value);
                    setOther(mirror(e.target.value));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") settleSplit();
                  }}
                  placeholder="0,00"
                  className="flex-1 bg-transparent text-right text-lg tabular-nums outline-none placeholder:text-faint"
                />
                <span className="text-sm text-muted">€</span>
              </label>
            ))}
            <span className="text-xs text-faint">
              {cashRaw && !validSplit
                ? "Chaque part doit être supérieure à 0 et inférieure au total."
                : "Saisissez une part, l'autre se complète."}
            </span>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              Reçu en espèces{" "}
              <span className="font-normal text-faint">(si monnaie à rendre)</span>
            </span>
            <div className={FIELD_CLASS}>
              <input
                type="text"
                inputMode="decimal"
                value={givenRaw}
                onChange={(e) => setGivenRaw(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") settleSplit();
                }}
                placeholder={validSplit ? amountField(cashPart) : "0,00"}
                className="flex-1 bg-transparent text-lg tabular-nums outline-none placeholder:text-faint"
              />
              <span className="text-sm text-muted">€</span>
            </div>
            {validSplit && !validSplitGiven && (
              <span className="text-xs text-ember-3">
                Le montant reçu doit couvrir la part en espèces.
              </span>
            )}
          </label>

          {validSplit && validSplitGiven && (
            <div className="flex flex-col gap-1.5 rounded-xl border border-ember-2/25 bg-ember-2/5 px-4 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">Espèces en caisse</span>
                <span className="text-sm font-medium tabular-nums">
                  {formatPrice(cashPart)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">À passer en carte</span>
                <span className="text-sm font-medium tabular-nums">
                  {formatPrice(cardPart)}
                </span>
              </div>
              {splitChange > 0 && (
                <div className="flex items-baseline justify-between border-t border-ember-2/20 pt-1.5">
                  <span className="text-sm font-medium">Monnaie à rendre</span>
                  <span className="font-display text-xl tabular-nums text-ember-1">
                    {formatPrice(splitChange)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Mode de paiement" onClose={onClose}>
      <div className="mb-4 flex items-baseline justify-between">
        <span className="text-sm text-muted">
          À encaisser{tip > 0 && " (pourboire inclus)"}
        </span>
        <span className="font-display text-2xl text-ember-1">
          {formatPrice(due)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(["especes", "carte"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              if (mode === "especes") setStep("cash");
              else onSelect(mode, undefined, tip || undefined);
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
      <button
        type="button"
        onClick={() => setStep("split")}
        className="mt-3 flex w-full items-center justify-center gap-2.5 rounded-2xl border border-hairline bg-surface px-4 py-4 text-sm font-semibold transition-colors hover:border-ember-2/40"
      >
        <span className="text-ember-1">
          <SplitIcon />
        </span>
        {PAYMENT_MODE_LABELS.mixte}
      </button>
      <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface px-4 py-3">
        <span className="text-sm text-muted">Pourboire (optionnel)</span>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            inputMode="decimal"
            value={tipRaw}
            onChange={(e) => setTipRaw(e.target.value)}
            placeholder="0"
            aria-label="Pourboire en euros"
            className="w-20 bg-transparent text-right text-sm tabular-nums outline-none placeholder:text-faint"
          />
          <span className="text-sm text-muted">€</span>
        </div>
      </label>
    </Modal>
  );
}
