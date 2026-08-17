import { CATEGORY_LABELS, CLOSED_STATUSES, STATUS_ORDER } from "./constants";
import { addDays, dayStart } from "./format";
import type { LeadLite, LeadStatus, TaskRow } from "./types";

/*
 * Dérivations pures sur le snapshot (convention lib/gestion/selectors.ts) :
 * le tableau de bord, les badges de nav et les cartes du pipeline lisent ici.
 */

export function selectStatusCounts(
  leads: LeadLite[]
): Record<LeadStatus, number> {
  const counts = Object.fromEntries(
    STATUS_ORDER.map((status) => [status, 0])
  ) as Record<LeadStatus, number>;
  for (const lead of leads) counts[lead.status] += 1;
  return counts;
}

/** Leads encore en jeu (ni signés, ni perdus, ni pas intéressés). */
export function selectActiveLeadCount(leads: LeadLite[]): number {
  return leads.filter((lead) => !CLOSED_STATUSES.includes(lead.status)).length;
}

export interface FunnelStage {
  label: string;
  count: number;
  /** Part de la première étape (0-100). */
  pct: number;
}

/*
 * Entonnoir « étape atteinte » : un lead compte pour chaque étape que son
 * statut courant égale ou dépasse (un signé compte donc partout). Limite
 * assumée : les lignes légères ne portent pas l'historique, donc un lead
 * passé « perdu » ou « pas intéressé » ne compte plus les étapes franchies.
 */
export function selectFunnel(leads: LeadLite[]): FunnelStage[] {
  const stages: { label: string; threshold: LeadStatus }[] = [
    { label: "Leads", threshold: "new" },
    { label: "Contactés", threshold: "contacted" },
    { label: "Visités", threshold: "visited" },
    { label: "RDV", threshold: "appointment_scheduled" },
    { label: "Signés", threshold: "signed" },
  ];
  const indexOf = (status: LeadStatus) => STATUS_ORDER.indexOf(status);
  const abandoned: LeadStatus[] = ["lost", "not_interested"];
  const counts = stages.map(({ label, threshold }) => ({
    label,
    count: leads.filter(
      (lead) =>
        !abandoned.includes(lead.status) &&
        indexOf(lead.status) >= indexOf(threshold)
    ).length,
  }));
  const base = Math.max(counts[0].count, 1);
  return counts.map(({ label, count }) => ({
    label,
    count,
    pct: Math.round((count / base) * 100),
  }));
}

export interface FollowUpBuckets {
  overdue: LeadLite[];
  today: LeadLite[];
  upcoming7: LeadLite[];
}

export function selectFollowUpBuckets(
  leads: LeadLite[],
  now = new Date()
): FollowUpBuckets {
  const todayStart = dayStart(now).toISOString();
  const tomorrowStart = addDays(dayStart(now), 1).toISOString();
  const weekEnd = addDays(dayStart(now), 8).toISOString();
  const withFollowUp = leads.filter((lead) => lead.nextFollowUpAt !== null);
  return {
    overdue: withFollowUp.filter(
      (lead) => (lead.nextFollowUpAt as string) < todayStart
    ),
    today: withFollowUp.filter(
      (lead) =>
        (lead.nextFollowUpAt as string) >= todayStart &&
        (lead.nextFollowUpAt as string) < tomorrowStart
    ),
    upcoming7: withFollowUp.filter(
      (lead) =>
        (lead.nextFollowUpAt as string) >= tomorrowStart &&
        (lead.nextFollowUpAt as string) < weekEnd
    ),
  };
}

/** Badge de nav Tâches : ouvertes, échues aujourd'hui ou en retard. */
export function selectTasksDueBadge(tasks: TaskRow[], now = new Date()): number {
  const endOfToday = addDays(dayStart(now), 1).toISOString();
  return tasks.filter(
    (task) =>
      task.status === "open" && task.dueAt !== null && task.dueAt < endOfToday
  ).length;
}

/** Prochaine tâche ouverte par restaurant (cartes du pipeline). */
export function selectNextTaskByLead(tasks: TaskRow[]): Map<string, TaskRow> {
  const next = new Map<string, TaskRow>();
  // tasks est trié par échéance croissante (byDue) : la première gagne.
  for (const task of tasks) {
    if (task.status !== "open" || !task.restaurantId) continue;
    if (!next.has(task.restaurantId)) next.set(task.restaurantId, task);
  }
  return next;
}

export type LeadSortKey =
  | "name"
  | "city"
  | "category"
  | "status"
  | "lastContactAt"
  | "nextFollowUpAt";

export function sortLeads(
  leads: LeadLite[],
  key: LeadSortKey,
  dir: 1 | -1
): LeadLite[] {
  const value = (lead: LeadLite): string => {
    switch (key) {
      case "status":
        // Ordre du pipeline, pas alphabétique.
        return String(STATUS_ORDER.indexOf(lead.status)).padStart(2, "0");
      case "category":
        // Trier ce que l'écran affiche, pas la clé interne de l'enum.
        return CATEGORY_LABELS[lead.category];
      case "lastContactAt":
        return lead.lastContactAt ?? "";
      case "nextFollowUpAt":
        return lead.nextFollowUpAt ?? "9999";
      default:
        return lead[key] ?? "";
    }
  };
  return [...leads].sort(
    (a, b) => value(a).localeCompare(value(b), "fr") * dir
  );
}
