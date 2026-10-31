"use client";

import type { ReactNode } from "react";
import { CheckIcon } from "@/components/gestion/icons";

/** Case native invisible sous une boîte dessinée ; libellé et case ne font qu'une cible. */
export function Checkbox({
  checked,
  onChange,
  disabled = false,
  label,
  hint,
  name,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: ReactNode;
  hint?: string;
  name?: string;
}) {
  return (
    <label className="g-checkbox">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="g-checkbox-box" aria-hidden>
        <CheckIcon />
      </span>
      <span className="g-checkbox-text">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}
