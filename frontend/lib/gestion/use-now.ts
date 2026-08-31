"use client";

import { useEffect, useState } from "react";

/** Heure courante, rafraîchie toutes les `tickMs` ms (horloges, temps d'attente). */
export function useNow(tickMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);
  return now;
}

/** Minutes entières écoulées depuis `iso` (jamais négatif). */
export function minutesSince(iso: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000));
}

/** "à l'instant", "5 min", "1 h 05" — temps d'attente d'une commande. */
export function formatWait(minutes: number): string {
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${String(minutes % 60).padStart(2, "0")}`;
}
