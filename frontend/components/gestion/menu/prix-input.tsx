"use client";

import { Input } from "@/components/gestion/ui";
import { parsePriceInput, priceToInput } from "@/lib/gestion/format";

/** Un prix en euros sur le kit : texte « 7,90 » remis au format à la sortie du champ. */
export function PrixInput({
  value,
  onChange,
  placeholder = "0,00",
  className,
  autoFocus = false,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Le champ vient d'apparaître sous le doigt : le clavier s'ouvre dessus. */
  autoFocus?: boolean;
  "aria-label"?: string;
}) {
  return (
    <Input
      numeric
      unit="€"
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      autoFocus={autoFocus}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => {
        const parsed = parsePriceInput(value);
        if (parsed !== null) onChange(priceToInput(parsed));
      }}
      className={className}
    />
  );
}
