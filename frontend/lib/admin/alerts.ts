import { OWNERS } from "@/lib/admin/owners";
import { notifyOwners } from "@/lib/admin/push";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Alertes de l'admin hors suivi du projet, envoyées à Marwan et Ambaka.
 * Chaque sorte a sa règle anti-répétition (admin_alert_hit) : nombre
 * d'occurrences avant d'alerter, fenêtre où on les compte, et répit avant
 * de réalerter sur la même clé. Valeurs choisies le 2026-10-15, à ajuster ici.
 */

interface Rule {
  threshold: number;
  windowMinutes: number;
  cooldownMinutes: number;
}

const HOUR = 60;
const DAY = 24 * HOUR;

export const ALERT_RULES = {
  /** Un workflow planifié en échec : une alerte, puis 6 h de répit. */
  cron: { threshold: 1, windowMinutes: HOUR, cooldownMinutes: 6 * HOUR },
  /** Une alerte du backend (réponse chaude, run en échec) : 1 h de répit par titre. */
  backend: { threshold: 1, windowMinutes: HOUR, cooldownMinutes: HOUR },
  /** Paiements refusés chez un client : 3 en 30 min, puis 2 h de répit. */
  paiement: { threshold: 3, windowMinutes: 30, cooldownMinutes: 2 * HOUR },
  /** Une inscription : une seule fois. */
  inscription: { threshold: 1, windowMinutes: HOUR, cooldownMinutes: 365 * DAY },
  /** Un client qui décroche : une fois par semaine au plus. */
  decroche: { threshold: 1, windowMinutes: DAY, cooldownMinutes: 7 * DAY },
} satisfies Record<string, Rule>;

export type AlertKind = keyof typeof ALERT_RULES;

export async function raiseAlert(
  kind: AlertKind,
  key: string,
  payload: { title: string; body: string; url: string; urgent?: boolean },
): Promise<boolean> {
  const rule = ALERT_RULES[kind];
  const { data: due } = await createAdminClient().rpc("admin_alert_hit", {
    p_key: `${kind}:${key}`,
    p_threshold: rule.threshold,
    p_window: `${rule.windowMinutes} minutes`,
    p_cooldown: `${rule.cooldownMinutes} minutes`,
  });
  if (!due) return false;
  await notifyOwners(OWNERS, { ...payload, tag: `${kind}:${key}` });
  return true;
}
