"use client";

import type { ReactNode } from "react";

/**
 * Interrupteur 28 × 48, rail en dégradé de marque quand il est allumé,
 * 44 px de zone tactile. Le libellé décrit l'état allumé (« Visible sur la
 * carte »), jamais un négatif. Sans `label`, passez `aria-label`.
 */
export function Switch({
  checked,
  onChange,
  disabled = false,
  label,
  hint,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Libellé visible, à gauche ; l'interrupteur devient une ligne pleine largeur. */
  label?: ReactNode;
  hint?: string;
  "aria-label"?: string;
}) {
  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ? undefined : ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="g-switch"
    >
      <i aria-hidden />
    </button>
  );
  if (!label) return control;
  return (
    <label className="g-switch-row">
      <span>
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </span>
      {control}
    </label>
  );
}
