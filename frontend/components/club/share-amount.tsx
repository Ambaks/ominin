"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import { RollingAmount } from "@/components/club/rolling-amount";
import { formatCents } from "@/lib/club/format";

/*
 * Choisir le montant d'une part : un curseur entre le minimum et le
 * maximum, des raccourcis (une part, deux parts, tout), et ± une part. Le
 * montant suit en grand ; dessous, ce que la page veut en dire (frais,
 * ce qu'il restera aux autres). Les bornes viennent du serveur ; le curseur
 * avance à l'euro, les raccourcis tombent juste sur les bornes.
 */

/* Pas du curseur (centimes) : à l'euro. */
const SLIDER_STEP = 100;

export function ShareAmount({
  value,
  min,
  max,
  part,
  presets,
  note,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  /** Une part égale (centimes) : le pas de ± et des raccourcis. */
  part: number;
  presets: { label: string; cents: number }[];
  /** Sous le montant : frais, part des autres. */
  note: ReactNode;
  onChange: (cents: number) => void;
}) {
  const id = useId();
  const clampValue = (cents: number) => Math.min(max, Math.max(min, cents));
  const fillRatio = max > min ? (value - min) / (max - min) : 1;
  return (
    <div className="club-share-amount">
      <div className="club-share-figure">
        <label htmlFor={id} className="club-label">
          Votre part
        </label>
        <p className="club-share-value">
          <RollingAmount cents={value} className="club-mono" />
        </p>
        <p className="club-share-sub">{note}</p>
      </div>
      <div className="club-share-control">
        <button
          type="button"
          className="club-icon-button"
          onClick={() => onChange(clampValue(value - part))}
          disabled={value <= min}
          aria-label="Une part de moins"
        >
          −
        </button>
        <input
          id={id}
          type="range"
          className="club-range"
          min={min}
          max={max}
          step={SLIDER_STEP}
          value={value}
          style={{ "--fill": fillRatio } as CSSProperties}
          aria-valuetext={`${formatCents(value)}, entre ${formatCents(min)} et ${formatCents(max)}`}
          onChange={(input) => {
            const next = Number(input.target.value);
            // Le dernier pas rejoint le maximum exact, même s'il n'est pas un multiple du pas.
            onChange(clampValue(max - next < SLIDER_STEP ? max : next));
          }}
        />
        <button
          type="button"
          className="club-icon-button"
          onClick={() => onChange(clampValue(value + part))}
          disabled={value >= max}
          aria-label="Une part de plus"
        >
          +
        </button>
      </div>
      <p className="club-share-bounds">
        <span className="club-mono">{formatCents(min)}</span>
        <span className="club-mono">{formatCents(max)}</span>
      </p>
      <div className="club-presets" role="group" aria-label="Raccourcis">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            aria-pressed={value === clampValue(preset.cents)}
            onClick={() => onChange(clampValue(preset.cents))}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
