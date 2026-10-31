import type { ReactNode } from "react";

export function Chip({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: "neutral" | "problem";
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className={`g-chip ${tone === "problem" ? "g-chip-problem" : ""}`}>
      {icon}
      {children}
    </span>
  );
}
