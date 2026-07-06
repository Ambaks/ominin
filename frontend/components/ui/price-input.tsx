"use client";

import { parsePriceInput, priceToInput } from "@/lib/gestion/format";
import { inputClass } from "./field";

export function PriceInput({
  value,
  onChange,
  placeholder,
  invalid,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        placeholder={placeholder ?? "0,00"}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => {
          const parsed = parsePriceInput(value);
          if (parsed !== null) onChange(priceToInput(parsed));
        }}
        className={`${inputClass} pr-8 ${invalid ? "border-ember-3/60" : ""}`}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-faint">
        €
      </span>
    </div>
  );
}
