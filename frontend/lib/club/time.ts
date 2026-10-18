/* Durées en ms, et le temps qui reste dit comme on le dit : « 2 j 4 h », « 3 h 12 min », « 8 min ». */

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export function untilLabel(ms: number): string {
  if (ms >= DAY) return `${Math.floor(ms / DAY)} j ${Math.floor((ms % DAY) / HOUR)} h`;
  if (ms >= HOUR) return `${Math.floor(ms / HOUR)} h ${Math.floor((ms % HOUR) / MINUTE)} min`;
  return `${Math.max(1, Math.ceil(ms / MINUTE))} min`;
}
