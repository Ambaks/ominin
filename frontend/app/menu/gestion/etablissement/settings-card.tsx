import type { ReactNode } from "react";
import { Plate } from "@/components/gestion/ui";

/**
 * Un panneau de réglages : une plaque, un titre en sans, une phrase qui dit
 * ce que le réglage change, puis les champs. Les quatre sections de la page
 * gardent Fraunces pour elles seules.
 */
export function SettingsCard({
  title,
  text,
  right,
  className = "",
  children,
  ...props
}: {
  title: string;
  text?: ReactNode;
  /** Un état ou une action, à droite du titre. */
  right?: ReactNode;
  className?: string;
  children?: ReactNode;
  id?: string;
  "data-visite"?: string;
}) {
  return (
    <Plate {...props} className={`flex flex-col gap-4 p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-g-body font-semibold">{title}</h3>
          {text && <p className="mt-1 text-g-meta text-muted">{text}</p>}
        </div>
        {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
      </div>
      {children}
    </Plate>
  );
}
