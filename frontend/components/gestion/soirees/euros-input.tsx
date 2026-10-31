"use client";

import { Input } from "@/components/gestion/ui";

/*
 * Un prix de table en euros, lu comme le client le lit : « 1 500 € ». La
 * saisie accepte espaces, virgule ou point ; elle se remet en forme en
 * quittant le champ. Dans un Field, l'id et l'erreur viennent du champ.
 */

const GROUPED = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/** « 1 500 » → 150000 centimes ; null si la saisie n'est pas un prix. */
export function parseEuros(value: string): number | null {
  const normalized = value.replace(/[\s  €]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

/** 150000 centimes → « 1 500 ». */
export const eurosToInput = (cents: number) => GROUPED.format(cents / 100);

export function EurosInput({
  value,
  onChange,
  placeholder,
  label,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Nom accessible, quand le champ n'est pas sous un libellé. */
  label?: string;
  className?: string;
}) {
  return (
    <Input
      numeric
      unit="€"
      type="text"
      value={value}
      placeholder={placeholder}
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => {
        const cents = parseEuros(value);
        if (cents !== null) onChange(eurosToInput(cents));
      }}
      className={className}
    />
  );
}
