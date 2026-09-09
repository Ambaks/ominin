"use client";

import { useSyncExternalStore } from "react";

/*
 * Verrou de la tablette. Le restaurant travaille sur une tablette connectée
 * au compte de l'établissement : l'espace y démarre en vue salle, et les
 * écrans du gérant s'ouvrent au code. Le déverrouillage vaut pour l'onglet
 * ouvert et pas au-delà — refermer la tablette la reverrouille, sans avoir à
 * compter sur une minuterie que personne ne verrait passer.
 *
 * C'est un verrou d'interface, assumé comme tel : la session porte bien les
 * droits du gérant, comme la caisse d'un restaurant qu'un code déverrouille.
 * Ce qu'il empêche, c'est qu'un écran laissé sur le comptoir donne la caisse
 * et les paiements à qui passe devant.
 */

const UNLOCK_KEY = "ominin-admin-unlocked";

const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.sessionStorage.getItem(UNLOCK_KEY) === "1";
  } catch {
    // Stockage refusé (navigation privée verrouillée) : on reste en vue salle.
    return false;
  }
}

function write(unlocked: boolean): void {
  try {
    if (unlocked) window.sessionStorage.setItem(UNLOCK_KEY, "1");
    else window.sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    // Sans stockage, le déverrouillage ne survit pas au rechargement.
  }
  for (const listener of listeners) listener();
}

export const unlockAdmin = () => write(true);
export const lockAdmin = () => write(false);

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Rendu serveur : toujours verrouillé, le stockage n'y existe pas. */
export function useAdminUnlocked(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
