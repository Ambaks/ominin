import type { HTMLAttributes } from "react";

/** Plaque claire : la surface de tout ce qui porte des chiffres. */
export function Plate({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`g-plate ${className}`} />;
}
