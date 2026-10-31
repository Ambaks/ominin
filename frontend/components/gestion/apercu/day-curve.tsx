"use client";

import { CompareChart, niceTicks } from "@/components/gestion/ui";
import { formatPrice } from "@/lib/menu/format";
import { salesCurve, serviceMinute, type SalesCurvePoint } from "@/lib/gestion/selectors";
import type { GestionState } from "@/lib/gestion/types";

const HOUR = 60;
const LAST_WEEK = 7;
const GRID_LINES = 2;
/** Des repères ronds : l'axe garde environ quatre heures écrites, quelle que soit la journée. */
const TICK_HOURS = [1, 2, 3, 4, 6];
const MAX_TICKS = 5;

/** Le CA de la journée à marches : au début du service il part de zéro. */
const stairs = (curve: SalesCurvePoint[], from: number, until: number) => {
  const last = curve[curve.length - 1];
  if (!last) return [];
  return [
    { x: from, y: 0 },
    ...curve.map((point) => ({ x: point.minute, y: point.revenue })),
    { x: Math.max(until, last.minute), y: last.revenue },
  ];
};

/**
 * Le CA du jour, heure par heure, sur l'ombre du même jour la semaine passée :
 * on sait à tout moment où l'on en est. Rien n'a été vendu ni aujourd'hui ni
 * alors : pas de graphique, le chiffre de la tuile suffit.
 */
export function DayCurve({ state, weekday }: { state: GestionState; weekday: string }) {
  const today = salesCurve(state, 0);
  const lastWeek = salesCurve(state, LAST_WEEK);
  if (today.length === 0 && lastWeek.length === 0) return null;

  const now = serviceMinute(new Date(), state.dayEndHour);
  const minutes = [...today, ...lastWeek].map((point) => point.minute);
  const from = Math.floor(Math.min(...minutes) / HOUR) * HOUR;
  const to = Math.ceil(Math.max(...minutes, now) / HOUR) * HOUR;
  const span = (to - from) / HOUR;
  const every = TICK_HOURS.find((hours) => span / hours < MAX_TICKS) ?? TICK_HOURS[TICK_HOURS.length - 1];
  const clock = (minute: number) => {
    const total = minute + state.dayEndHour * HOUR;
    const hours = Math.floor(total / HOUR) % 24;
    return { hours, text: `${hours} h ${String(total % HOUR).padStart(2, "0")}` };
  };
  const ticks: { x: number; label: string }[] = [];
  for (let x = from; x <= to; x += every * HOUR) ticks.push({ x, label: `${clock(x).hours} h` });

  const best = Math.max(0, ...today.map((p) => p.revenue), ...lastWeek.map((p) => p.revenue));
  const total = today[today.length - 1]?.revenue ?? 0;
  const before = lastWeek[lastWeek.length - 1]?.revenue ?? 0;
  return (
    <div className="mt-4">
      <CompareChart
        step
        compact
        entity="money"
        current={{ label: "Aujourd’hui", points: stairs(today, from, now) }}
        previous={
          lastWeek.length > 0 ? { label: `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} dernier`, points: stairs(lastWeek, from, to) } : undefined
        }
        domain={[from, to]}
        ticks={ticks}
        yTicks={niceTicks(best, GRID_LINES)}
        format={formatPrice}
        tip={(x) => clock(Math.round(x)).text}
        label={`CA encaissé aujourd’hui : ${formatPrice(total)} à cette heure ; ${weekday} dernier, ${formatPrice(before)} sur la journée.`}
      />
    </div>
  );
}
