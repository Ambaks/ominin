import type { createAdminClient } from "@/lib/supabase/admin";
import { CHURN_DROP_RATIO, CHURN_MIN_PREVIOUS_SESSIONS, CLIENT_PERIOD_DAYS } from "./constants";

type Admin = ReturnType<typeof createAdminClient>;
type Figures = Awaited<ReturnType<typeof serviceFigures>>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Période du décrochage hors Synthèse (point du matin, Clients du commercial) : celle que la fiche client montre d'abord. */
export const CHURN_PERIOD_DAYS = CLIENT_PERIOD_DAYS[1];

/** Règle de la Synthèse des clients : visites du menu en baisse d'au moins CHURN_DROP_RATIO face à la période précédente. */
export function isDropping(previous: number, current: number): boolean {
  return previous >= CHURN_MIN_PREVIOUS_SESSIONS && current <= previous * (1 - CHURN_DROP_RATIO);
}

export async function serviceFigures(db: Admin, from: number, to: number) {
  const { data, error } = await db.rpc("admin_service_figures", {
    p_from: new Date(from).toISOString(),
    p_to: new Date(to).toISOString(),
  });
  if (error) throw new Error(error.message);
  return data;
}

/** Chiffres des CHURN_PERIOD_DAYS derniers jours et des précédents, par établissement ou boutique. */
export async function churnWindows(db: Admin, now: number): Promise<{ current: Figures; previous: Figures }> {
  const period = CHURN_PERIOD_DAYS * DAY_MS;
  const [current, previous] = await Promise.all([
    serviceFigures(db, now - period, now),
    serviceFigures(db, now - 2 * period, now - period),
  ]);
  return { current, previous };
}

/** Sessions d'un établissement dans des chiffres (0 sans ligne). */
export const sessionsOf = (rows: Figures, id: string) => rows.find((row) => row.id === id)?.sessions ?? 0;
