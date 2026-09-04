"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { CHIME_STORAGE_KEY } from "./constants";
import { useGestion } from "./store";

/*
 * Carillon des nouvelles commandes : tant qu'un onglet de l'espace de gestion
 * est ouvert (tablette de cuisine, caisse), l'arrivée d'une commande sonne —
 * complément immédiat des notifications push, qui couvrent l'appareil en
 * veille. Préférence par appareil, synthétisée en Web Audio (aucun fichier).
 * Le navigateur n'ouvre le son qu'après un geste : tant que le contexte audio
 * n'est pas « armé », l'espace le dit (useChimeArmed) au lieu de rester muet.
 */

/** Deux notes (ding-dong) : fréquences en Hz, départs et tenues en secondes. */
const CHIME_NOTES: readonly { frequency: number; at: number; hold: number }[] = [
  { frequency: 880, at: 0, hold: 0.35 },
  { frequency: 1174.66, at: 0.18, hold: 0.5 },
];
/** Volume de crête du carillon (0–1) : audible en salle sans agresser. */
const CHIME_GAIN = 0.14;

let audioContext: AudioContext | null = null;
let armed = false;
const armedListeners = new Set<() => void>();

function syncArmed() {
  const next = audioContext?.state === "running";
  if (armed === next) return;
  armed = next;
  for (const listener of armedListeners) listener();
}

function context(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
    audioContext.addEventListener("statechange", syncArmed);
    syncArmed();
  }
  return audioContext;
}

export function chimeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CHIME_STORAGE_KEY) !== "off";
}

const chimeListeners = new Set<() => void>();

export function setChimeEnabled(enabled: boolean): void {
  window.localStorage.setItem(CHIME_STORAGE_KEY, enabled ? "on" : "off");
  for (const listener of chimeListeners) listener();
}

/** Préférence carillon, réactive (rendu serveur : activé, le défaut). */
export function useChimeEnabled(): boolean {
  return useSyncExternalStore(
    (listener) => {
      chimeListeners.add(listener);
      return () => chimeListeners.delete(listener);
    },
    chimeEnabled,
    () => true
  );
}

/** Contexte audio démarré : le carillon peut sonner (rendu serveur : oui). */
export function useChimeArmed(): boolean {
  return useSyncExternalStore(
    (listener) => {
      armedListeners.add(listener);
      return () => armedListeners.delete(listener);
    },
    () => armed,
    () => true
  );
}

/** Joue le carillon (aussi utilisé par « Écouter » sur la page Notifications). */
export async function playChime(): Promise<void> {
  const ctx = context();
  if (ctx.state === "suspended") await ctx.resume();
  if (ctx.state !== "running") return;
  for (const note of CHIME_NOTES) {
    const start = ctx.currentTime + note.at;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = note.frequency;
    gain.gain.setValueAtTime(CHIME_GAIN, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + note.hold);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + note.hold);
  }
}

/**
 * Sonne à chaque commande « en attente » qui apparaît dans le store (flux
 * realtime). Le premier instantané initialise sans sonner — recharger la
 * page ne rejoue pas les commandes déjà là.
 */
export function useOrderChime(): void {
  const state = useGestion();
  const known = useRef<Set<string> | null>(null);

  // Le contexte audio ne démarre qu'après un geste : on le débloque au
  // premier toucher venu, et l'on retient s'il l'est (bandeau sinon).
  useEffect(() => {
    context();
    const unlock = () => {
      const ctx = context();
      if (ctx.state === "suspended") void ctx.resume();
    };
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    if (!state) return;
    const previous = known.current;
    known.current = new Set(state.orders.map((order) => order.id));
    if (!previous) return;
    const arrived = state.orders.some(
      (order) => order.status === "en_attente" && !previous.has(order.id)
    );
    if (arrived && chimeEnabled()) playChime();
  }, [state]);
}
