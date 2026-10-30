/*
 * Calculs des échéances, sans dépendance : lus par l'écran et par la tâche
 * quotidienne. Les dates sont des jours civils (AAAA-MM-JJ).
 */

export type Recurrence = "none" | "monthly" | "quarterly" | "yearly";

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: "Une seule fois",
  monthly: "Chaque mois",
  quarterly: "Chaque trimestre",
  yearly: "Chaque année",
};

const RECURRENCE_MONTHS: Record<Exclude<Recurrence, "none">, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

/** L'échéance suivante ; le 31 tombe le dernier jour des mois plus courts. */
export function nextDue(dueOn: string, recurrence: Exclude<Recurrence, "none">): string {
  const [year, month, day] = dueOn.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + RECURRENCE_MONTHS[recurrence], 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return target.toISOString().slice(0, 10);
}

export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000);
}

export const formatDueDate = (date: string): string =>
  `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
