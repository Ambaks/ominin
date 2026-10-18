"use client";

import { inputClass } from "@/components/ui/field";

/*
 * Un prix de table en euros, lu comme le client le lit : « 1 500 € ». La
 * saisie accepte espaces, virgule ou point ; elle se remet en forme en
 * quittant le champ.
 */

const GROUPED = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/** « 1 500 » → 150000 centimes ; null si la saisie n'est pas un prix. */
export function parseEuros(value: string): number | null {
  const normalized = value.replace(/[\s  €]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

/** 150000 centimes → « 1 500 ». */
export const eurosToInput = (cents: number) => GROUPED.format(cents / 100);

export function EurosInput({
  value,
  onChange,
  placeholder,
  invalid,
  label,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  /** Nom accessible, quand le champ n'est pas sous un libellé. */
  label?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => {
          const cents = parseEuros(value);
          if (cents !== null) onChange(eurosToInput(cents));
        }}
        className={`${inputClass} pr-8 text-right tabular-nums ${invalid ? "border-ember-3/60" : ""}`}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
        €
      </span>
    </div>
  );
}
