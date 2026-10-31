"use client";

import { useEffect, useState } from "react";
import type { StaffingData } from "./analyses";
import { loadStaffing } from "./api";
import { ANALYSES } from "./constants";
import { dayStart } from "./selectors";
import { isoDate } from "./use-prior-days";

/** Les 4 dernières semaines jusqu'à hier, quelle que soit la période affichée. */
export function useStaffing(enabled: boolean, dayEndHour: number) {
  const to = isoDate(dayStart(0, dayEndHour));
  const from = isoDate(dayStart(ANALYSES.forecastWeeks * 7, dayEndHour));
  const [loaded, setLoaded] = useState<{ from: string; to: string; data: StaffingData } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadStaffing(from, to, dayEndHour).then(
      (data) => {
        if (!cancelled) setLoaded({ from, to, data });
      },
      (error: unknown) => {
        console.error("Données de planning indisponibles :", error);
        if (!cancelled) setFailed(true);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, from, to, dayEndHour]);

  return { loaded, failed };
}
