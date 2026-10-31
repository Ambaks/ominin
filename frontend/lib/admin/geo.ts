"use client";

import { GEOLOCATION_TIMEOUT_MS } from "./constants";
import type { GeoPoint } from "./types";

/*
 * Géolocalisation entièrement optionnelle : refusée ou indisponible, tout le
 * CRM fonctionne. capturePosition() : lecture unique, meilleure-effort, jamais
 * bloquante (flux « Visité » — les coordonnées partent dans metadata de
 * l'activité).
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
