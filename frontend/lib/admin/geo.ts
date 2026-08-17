"use client";

import { useSyncExternalStore } from "react";
import { GEOLOCATION_TIMEOUT_MS } from "./constants";
import type { GeoPoint } from "./types";

/*
 * Géolocalisation entièrement optionnelle : refusée ou indisponible, tout le
 * CRM fonctionne — pas de point sur la carte, pas de tri par distance, c'est
 * tout. Deux usages :
 *  - capturePosition() : lecture unique, meilleure-effort, jamais bloquante
 *    (flux « Visité » — les coordonnées partent dans metadata de l'activité) ;
 *  - le mini-store watch : suivi continu pour le point « ma position » de la
 *    carte et le tri par distance.
 */

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Position unique, ou null (refus, indisponible, délai dépassé). */
export function capturePosition(): Promise<GeoPoint | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy,
        }),
      () => resolve(null),
      { timeout: GEOLOCATION_TIMEOUT_MS, enableHighAccuracy: false }
    );
  });
}

let position: GeoPoint | null = null;
let watchId: number | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function startWatch(): void {
  if (watchId !== null || !navigator.geolocation) return;
  watchId = navigator.geolocation.watchPosition(
    ({ coords }) => {
      position = {
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy,
      };
      notify();
    },
    () => {
      // Permission refusée ou position indisponible : le suivi s'arrête et
      // les abonnés (bouton « Ma position ») repassent à l'état éteint.
      stopWatch();
    },
    { enableHighAccuracy: true }
  );
  notify();
}

export function stopWatch(): void {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  position = null;
  notify();
}

export function isWatching(): boolean {
  return watchId !== null;
}

const getSnapshot = (): GeoPoint | null => position;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Position suivie, ou null (pas de suivi actif / refus). */
export function usePosition(): GeoPoint | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

/** Suivi actif ? Se met à jour aussi quand le suivi s'arrête de lui-même. */
export function useWatching(): boolean {
  return useSyncExternalStore(subscribe, isWatching, () => false);
}
