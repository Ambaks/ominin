"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addDays,
  loadOpenEntries,
  loadWeek,
  type TimeEntry,
  type WeekData,
} from "./temps";

/**
 * Planning et badgeages de la semaine ouverte, relus à la demande (après un
 * badgeage, une correction, un changement de semaine). Pas de temps réel : la
 * badgeuse est un geste local, l'écran qui l'a déclenché sait quand relire.
 */
export function useWeek(
  etablissementId: string,
  start: Date
): { data: WeekData; loading: boolean; reload: () => void } {
  const [data, setData] = useState<WeekData>({ shifts: [], entries: [] });
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const from = start.getTime();

  useEffect(() => {
    if (!etablissementId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const week = await loadWeek(
          etablissementId,
          new Date(from),
          addDays(new Date(from), 7)
        );
        if (!cancelled) setData(week);
      } catch {
        // L'écran garde la semaine précédente plutôt que de se vider.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [etablissementId, from, tick]);

  return { data, loading, reload: useCallback(() => setTick((t) => t + 1), []) };
}

/** Périodes de travail encore ouvertes : qui est en service, maintenant. */
export function useOpenEntries(
  etablissementId: string
): { entries: TimeEntry[]; reload: () => void } {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!etablissementId) return;
    let cancelled = false;
    void loadOpenEntries(etablissementId)
      .then((open) => {
        if (!cancelled) setEntries(open);
      })
      .catch(() => {
        // L'écran garde ce qu'il affichait plutôt que de vider la salle.
      });
    return () => {
      cancelled = true;
    };
  }, [etablissementId, tick]);

  return { entries, reload: useCallback(() => setTick((t) => t + 1), []) };
}
