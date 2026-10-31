"use client";

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useField } from "./field";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Un nombre : chiffres tabulaires alignés à droite, clavier décimal. */
  numeric?: boolean;
  /** Unité posée dans le champ, à droite (« € », « min »). */
  unit?: string;
};

/*
 * Saisie sur --background, anneau filet, focus braise ; 16 px au doigt (iOS
 * ne zoome pas), 14 px à la souris. Dans un Field, l'id, la description et
 * aria-invalid viennent du champ.
 */
export function Input({ numeric = false, unit, className = "", ...props }: InputProps) {
  const field = useField();
  const input = (
    <input
      id={field?.id}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      inputMode={numeric ? "decimal" : undefined}
      {...props}
      className={`g-input ${numeric ? "g-input-num" : ""} ${unit ? "" : className}`}
    />
  );
  return unit ? (
    <span className={`g-input-wrap ${className}`}>
      {input}
      <span className="g-input-unit" aria-hidden>
        {unit}
      </span>
    </span>
  ) : (
    input
  );
}

export function Textarea({ className = "", rows = 3, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const field = useField();
  return (
    <textarea
      id={field?.id}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      rows={rows}
      {...props}
      className={`g-input ${className}`}
    />
  );
}
