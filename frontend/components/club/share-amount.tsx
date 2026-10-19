"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { RollingAmount } from "@/components/club/rolling-amount";
import { CLUB_TIMING, rollEase } from "@/components/club/timing";
import { formatCents } from "@/lib/club/format";
import { prefersReducedMotion } from "@/lib/club/media";

/*
 * Choisir le montant d'une part : un curseur entre le minimum et le
 * maximum, des raccourcis (une part, deux parts, tout), et ± une part. Le
 * montant suit en grand ; dessous, ce que la page veut en dire (frais,
 * ce qu'il restera aux autres). Les bornes viennent du serveur ; le curseur
 * avance à l'euro, les raccourcis tombent juste sur les bornes. Un
 * raccourci ou ± : le curseur glisse jusqu'à sa place au rythme du montant
 * qui défile, au lieu d'y sauter.
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
  visual,
  onChange,
  onScrub,
}: {
  value: number;
  min: number;
  max: number;
  /** Une part égale (centimes) : le pas de ± et des raccourcis. */
  part: number;
  presets: { label: string; cents: number }[];
  /** Sous le montant : frais, part des autres. */
  note: ReactNode;
  /** Entre le montant et le curseur : l'anneau de la table. */
  visual?: ReactNode;
  onChange: (cents: number) => void;
  /** Le curseur est tenu (true) puis relâché (false). */
  onScrub?: (scrubbing: boolean) => void;
}) {
  const id = useId();
  const [held, setHeld] = useState(false);
  const hold = (next: boolean) => {
    setHeld(next);
    onScrub?.(next);
  };
  const clampValue = (cents: number) => Math.min(max, Math.max(min, cents));
  const ratio = (cents: number) => (max > min ? (cents - min) / (max - min) : 1);
  const fillRatio = ratio(value);
  const range = useRef<HTMLInputElement>(null);
  const shown = useRef(value);
  useEffect(() => {
    const input = range.current;
    const from = shown.current;
    shown.current = value;
    if (!input || from === value || held || prefersReducedMotion()) return;
    let start: number | null = null;
    let raf = 0;
    const step = (now: number) => {
      start ??= now;
      const progress = Math.min((now - start) / CLUB_TIMING.roll, 1);
      const at = from + (value - from) * rollEase(progress);
      input.value = String(at);
      input.style.setProperty("--fill", String(ratio(at)));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // ratio ne dépend que des bornes : relancer à leur changement ferait glisser sans raison.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className="club-share-amount">
      <div className="club-share-figure">
        <label htmlFor={id} className="club-label">
          Votre part
        </label>
        <p className="club-share-value">
          <RollingAmount cents={value} instant={held} className="club-mono" />
        </p>
        <p className="club-share-sub">{note}</p>
      </div>
      {visual}
      <div className="club-share-control" data-no-sheet-drag>
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
          ref={range}
          id={id}
          type="range"
          className="club-range"
          min={min}
          max={max}
          step={SLIDER_STEP}
          value={value}
          style={{ "--fill": fillRatio } as CSSProperties}
          onPointerDown={(pointer) => {
            hold(true);
            // Le doigt garde le curseur jusqu'au bout, même sorti de la piste : la fin du geste arrive toujours ici.
            try {
              pointer.currentTarget.setPointerCapture(pointer.pointerId);
            } catch {}
          }}
          onPointerUp={() => hold(false)}
          onPointerCancel={() => hold(false)}
          onLostPointerCapture={() => hold(false)}
          onTouchEnd={() => hold(false)}
          onBlur={() => hold(false)}
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
      <div className="club-presets" role="group" aria-label="Raccourcis" data-no-sheet-drag>
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
