"use client";

import { SERVICE_CLOCK_TICK_MS } from "@/lib/gestion/constants";
import { useNow } from "@/lib/gestion/use-now";

/** L'heure du service, à la seconde : le seul chiffre vivant de l'écran. */
export function ServiceTime() {
  const now = useNow(SERVICE_CLOCK_TICK_MS);
  return (
    <time
      dateTime={now.toISOString()}
      className="shrink-0 text-g-kpi whitespace-nowrap tabular-nums sm:text-g-day"
    >
      {now.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}
    </time>
  );
}
