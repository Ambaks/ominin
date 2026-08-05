"use client";

import { useSyncExternalStore } from "react";

// Valeur client-only (dépend de l'hôte) : pas d'abonnement, jamais notifiée.
const emptySubscribe = () => () => {};

/**
 * Résout un lien dépendant de l'hôte (sous-domaine collect ou non) côté
 * client, avec un snapshot serveur stable — aucun écart d'hydratation.
 */
export function useHostAwareHref(
  resolve: () => string,
  fallback: string
): string {
  return useSyncExternalStore(emptySubscribe, resolve, () => fallback);
}
