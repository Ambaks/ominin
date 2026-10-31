"use client";

import { Fragment, useId, type CSSProperties } from "react";

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  glass = true,
  i,
}: {
  /** Nom du groupe pour les lecteurs d'écran (« Période »). */
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Hors budget de verre : plaque à la place. */
  glass?: boolean;
  /** Rang d'entrée : le verre lui-même monte (`g-rise`, `--g-i`). Absent, pas d'entrée. */
  i?: number;
}) {
  const id = useId();
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  return (
    <fieldset
      aria-label={label}
      className={`g-seg${i == null ? "" : " g-rise"} ${glass ? "g-glass g-glass-pill" : "g-plate rounded-full"}`}
      style={
        { "--g-seg-n": options.length, "--g-seg-i": index, ...(i == null ? {} : { "--g-i": i }) } as CSSProperties
      }
    >
      {options.map((option) => (
        <Fragment key={option.value}>
          <input
            type="radio"
            id={`${id}-${option.value}`}
            name={id}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          <label htmlFor={`${id}-${option.value}`}>{option.label}</label>
        </Fragment>
      ))}
      <span className="g-seg-thumb" aria-hidden />
    </fieldset>
  );
}
