"use client";

import { useSyncExternalStore } from "react";
import { isOpenAt, type OpeningHours } from "@/lib/collect/hours";
import { WAIT_TICK_MS } from "@/lib/gestion/constants";

/** Relu à la cadence du formulaire de retrait : la boutique ferme sous les yeux. */
function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, WAIT_TICK_MS);
  return () => window.clearInterval(timer);
}

/*
 * Ouvert ou fermé, lu chez le client : la page sort du cache (ISR), une
 * heure jugée au rendu serveur pourrait dater d'avant la fermeture. Rien au
 * rendu serveur, la ligne apparaît à l'hydratation.
 */
export function OpenStatus({ hours }: { hours: OpeningHours }) {
  const openNow = useSyncExternalStore(
    subscribe,
    () => isOpenAt(hours, new Date()),
    () => null
  );
  if (openNow === null) return null;
  return (
    <span className="cy-order-open inline-flex items-center gap-2 font-semibold text-foreground">
      <span
        aria-hidden
        data-open={openNow || undefined}
        className={`cy-order-dot size-2 rounded-full ${openNow ? "bg-ember-1" : "border border-current"}`}
      />
      {openNow ? "Ouvert : retrait possible dès maintenant" : "Fermé : commandez pour plus tard"}
    </span>
  );
}
