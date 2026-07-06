"use client";

import { useSyncExternalStore } from "react";
import { STORAGE_KEY, STORAGE_VERSION } from "./constants";
import { can, hasFeature } from "./permissions";
import { seed } from "./seed";
import type { Action, Feature, GestionState, Offre, Role } from "./types";

let state: GestionState | null = null;
const listeners = new Set<() => void>();

function load(): GestionState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GestionState;
      if (parsed.version === STORAGE_VERSION) return parsed;
    }
  } catch {
    // Stockage corrompu : on repart de la démo.
  }
  const fresh = seed();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

function getClientSnapshot(): GestionState {
  if (state === null) state = load();
  return state;
}

// Référence stable exigée par useSyncExternalStore côté serveur.
const getServerSnapshot = (): GestionState | null => null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getState(): GestionState {
  return getClientSnapshot();
}

export function commit(next: GestionState) {
  state = next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  for (const listener of listeners) listener();
}

/** État complet, ou null côté serveur / avant hydratation (⇒ squelette). */
export function useGestion(): GestionState | null {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

export interface GestionAccess {
  role: Role;
  offre: Offre;
  can: (action: Action) => boolean;
  hasFeature: (feature: Feature) => boolean;
}

export function useGestionAccess(): GestionAccess {
  const snapshot = useGestion();
  const role = snapshot?.role ?? "gerant";
  const offre = snapshot?.etablissement.offre ?? "connect";
  return {
    role,
    offre,
    can: (action) => can(role, action),
    hasFeature: (feature) => hasFeature(offre, feature),
  };
}
