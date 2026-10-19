"use client";

import { useSyncExternalStore } from "react";

const noSubscription = () => () => {};

/**
 * Paramètre d'URL lu dans le navigateur, nul pendant l'hydratation. Le menu
 * QR est mis en cache, le même pour toutes les tables : lire searchParams
 * côté serveur le rendrait à chaque scan, carte relue dans la base.
 */
export function useQueryParam(name: string): string | null {
  return useSyncExternalStore(
    noSubscription,
    () => new URLSearchParams(window.location.search).get(name),
    () => null
  );
}
