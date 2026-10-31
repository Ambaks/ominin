"use client";

import { useCallback, useEffect, useState } from "react";
import type { AnalysesData } from "./analyses";
import { loadAnalyses } from "./api";
import { ANALYSES } from "./constants";
import { dayStart } from "./selectors";
import { isoDate } from "./use-prior-days";

/**
 * Une période de jours de service complets, jusqu'à hier : une journée en cours
 * se comparerait mal à une journée finie. Le CA peut donc différer de celui de
 * l'accueil, qui compte aujourd'hui.
 */
export function useAnalyses(enabled: boolean, days: number, dayEndHour: number) {
  const to = isoDate(dayStart(0, dayEndHour));
  const from = isoDate(dayStart(days, dayEndHour));
  const previousFrom = isoDate(dayStart(days * 2, dayEndHour));
  const historyFrom = isoDate(dayStart((ANALYSES.historyWeeks + 1) * 7, dayEndHour));
  const key = `${from}/${to}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    data: AnalysesData;
    days: number;
    from: string;
    to: string;
    previousFrom: string;
  } | null>(null);
  const [error, setError] = useState<{ key: string; error: unknown } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadAnalyses({ from, to, historyFrom, dayEndHour }).then(
      (data) => {
        if (cancelled) return;
        setLoaded({ key, data, days, from, to, previousFrom });
        setError(null);
      },
      (failure: unknown) => {
        if (!cancelled) setError({ key, error: failure });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, key, days, from, to, previousFrom, historyFrom, dayEndHour, attempt]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  return {
    // Les chiffres d'avant restent à l'écran, atténués, avec la période qu'ils décrivent.
    loaded,
    stale: loaded != null && loaded.key !== key,
    error: error?.key === key ? error.error : null,
    reload,
  };
}
