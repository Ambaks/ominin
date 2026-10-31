import type { CSSProperties, ReactNode } from "react";

const TONE_CLASS = {
  problem: "g-glass-problem",
  info: "g-orders",
} as const;

export function Notice({
  tone = "problem",
  icon,
  title,
  text,
  action,
  i,
}: {
  tone?: keyof typeof TONE_CLASS;
  icon?: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
  /** Rang d'entrée : le verre lui-même monte (`g-rise`, `--g-i`). Absent, pas d'entrée. */
  i?: number;
}) {
  return (
    <div
      role="status"
      className={`g-glass ${TONE_CLASS[tone]}${i == null ? "" : " g-rise"} flex flex-wrap items-center gap-3.5 py-2.75 pr-2.75 pl-4.5 max-sm:p-3.5 max-sm:pl-4.5`}
      style={i == null ? undefined : ({ "--g-i": i } as CSSProperties)}
    >
      {icon && <span className="flex shrink-0 text-g-entity *:size-5.5">{icon}</span>}
      <b className="min-w-0 font-semibold [overflow-wrap:anywhere]">{title}</b>
      {text && <span className="min-w-0 flex-1 text-muted max-sm:order-3 max-sm:basis-full">{text}</span>}
      {action && <span className="ml-auto flex shrink-0">{action}</span>}
    </div>
  );
}
