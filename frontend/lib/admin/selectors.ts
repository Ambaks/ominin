import { CLOSED_STATUSES, STATUS_ORDER } from "./constants";
import type { Product } from "./products";
import type { AdminState, LeadStatus, TaskRow } from "./types";

/*
 * Dérivations pures sur le snapshot (convention lib/gestion/selectors.ts) :
 * le tableau de bord, les badges de nav et les cartes du pipeline lisent ici.
 */

/**
 * Ce qu'une vue produit montre du snapshot : les prospects qui visent ce
 * produit, avec leurs tâches et leurs RDV. Une tâche sans fiche n'appartient
 * à aucun produit : seule la vue d'ensemble la montre.
 */
export function selectForProduct(
  state: AdminState,
  product: Product | null
): AdminState {
  if (!product) return state;
  return {
    ...state,
    tasks: state.tasks.filter((task) => task.targetProducts?.includes(product)),
    appointments: state.appointments.filter((rdv) => rdv.targetProducts?.includes(product)),
  };
}

/** Les chiffres de l'aperçu, par statut, comptés par la base. */
export type LeadSummary = {
  status: LeadStatus;
  leads: number;
  overdue: number;
  dueToday: number;
  upcoming: number;
}[];

export function selectStatusCounts(
  summary: LeadSummary
): Record<LeadStatus, number> {
  const counts = Object.fromEntries(
    STATUS_ORDER.map((status) => [status, 0])
  ) as Record<LeadStatus, number>;
  for (const row of summary) counts[row.status] = row.leads;
  return counts;
}

/** Leads encore en jeu (ni signés, ni perdus, ni pas intéressés). */
export function selectActiveLeadCount(summary: LeadSummary): number {
  return summary
    .filter((row) => !CLOSED_STATUSES.includes(row.status))
    .reduce((sum, row) => sum + row.leads, 0);
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
export function selectFunnel(summary: LeadSummary): FunnelStage[] {
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
    count: summary
      .filter(
        (row) =>
          !abandoned.includes(row.status) &&
          indexOf(row.status) >= indexOf(threshold)
      )
      .reduce((sum, row) => sum + row.leads, 0),
  }));
  const base = Math.max(counts[0].count, 1);
  return counts.map(({ label, count }) => ({
    label,
    count,
    pct: Math.round((count / base) * 100),
  }));
}

export function selectFollowUps(summary: LeadSummary) {
  return summary.reduce(
    (sums, row) => ({
      overdue: sums.overdue + row.overdue,
      today: sums.today + row.dueToday,
      upcoming7: sums.upcoming7 + row.upcoming,
    }),
    { overdue: 0, today: 0, upcoming7: 0 }
  );
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
