"use client";

import { useEffect, useState } from "react";
import { loadDailySales } from "./api";
import { ANALYTICS_PERIOD_DAYS } from "./constants";
import { dayStart, emptyDayPoint, revenueByDay, type DayPoint } from "./selectors";
import type { GestionState } from "./types";

/** La date du jour de service, telle que la base la range. */
export function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Les jours de la période d'avant, du plus ancien au plus récent. Dans la
 * fenêtre chargée, ils se lisent sur les commandes ; au-delà, la base envoie
 * ses totaux par jour plutôt que des semaines de commandes. Null tant qu'ils
 * manquent.
 */
export function usePriorDays(state: GestionState | null, days: number, enabled: boolean) {
  const local = days * 2 <= Math.max(...ANALYTICS_PERIOD_DAYS);
  const dayEndHour = state?.dayEndHour ?? 0;
  const from = isoDate(dayStart(days * 2 - 1, dayEndHour));
  const to = isoDate(dayStart(days - 1, dayEndHour));
  const key = `${state?.etablissement.id}/${from}/${to}`;
  const [loaded, setLoaded] = useState<{ key: string; points: DayPoint[] | null } | null>(null);
  const fetches = enabled && !local && state != null;

  useEffect(() => {
    if (!fetches) return;
    let cancelled = false;
    loadDailySales(from, to, dayEndHour).then(
      (rows) => {
        if (cancelled) return;
        const byDate = new Map(rows.map((row) => [row.day, row]));
        const points = Array.from({ length: days }, (_, index) => {
          const date = dayStart(days * 2 - 1 - index, dayEndHour);
          const row = byDate.get(isoDate(date));
          return { ...emptyDayPoint(date), revenue: Number(row?.revenue ?? 0), orders: row?.orders ?? 0 };
        });
        setLoaded({ key, points });
      },
      () => {
        if (!cancelled) setLoaded({ key, points: null });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [fetches, key, from, to, days, dayEndHour]);

  if (!state || !enabled) return { days: null, failed: false };
  if (local) return { days: revenueByDay(state, days * 2).slice(0, days), failed: false };
  const current = loaded?.key === key ? loaded : null;
  return { days: current?.points ?? null, failed: current != null && current.points == null };
}
