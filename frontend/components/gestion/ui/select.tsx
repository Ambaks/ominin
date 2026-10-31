"use client";

import type { SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@/components/gestion/icons";
import { useField } from "./field";

/** Liste native (clavier, lecteur d'écran, roue iOS), habillée comme une saisie. */
export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const field = useField();
  return (
    <span className={`g-select ${className}`}>
      <select id={field?.id} aria-describedby={field?.describedBy} aria-invalid={field?.invalid || undefined} {...props}>
        {children}
      </select>
      <ChevronDownIcon />
    </span>
  );
}
