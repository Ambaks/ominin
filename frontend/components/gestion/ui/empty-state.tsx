import type { ReactNode } from "react";
import { Plate } from "./plate";

/** Vide : une phrase, une action. */
export function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <Plate className="flex flex-col items-center gap-3 px-5 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
      <p className="text-muted">{text}</p>
      {action}
    </Plate>
  );
}
