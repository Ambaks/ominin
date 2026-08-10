import {
  ACTION_FEATURE,
  ACTION_LABELS,
  EXCLUDED_STATUSES,
  OFFRE_FEATURES,
  ORDER_STATUS_FLOW,
  ROLE_ACTIONS,
} from "./constants";
import type { Action, Feature, Offre, OrderStatus, OrderType, Role } from "./types";

export function hasFeature(offre: Offre, feature: Feature): boolean {
  return OFFRE_FEATURES[offre].includes(feature);
}

export function can(role: Role, action: Action): boolean {
  const actions = ROLE_ACTIONS[role];
  return actions === "all" || actions.includes(action);
}

/**
 * Droits effectifs d'un membre : le raccourci "all" du gérant est développé,
 * et les actions dont la fonctionnalité n'est pas comprise dans l'offre sont
 * retirées — sinon la page Produits promettrait des droits inaccessibles.
 */
export function allowedActions(role: Role, offre: Offre): Action[] {
  const actions = ROLE_ACTIONS[role];
  const granted =
    actions === "all" ? (Object.keys(ACTION_LABELS) as Action[]) : actions;
  return granted.filter((action) => {
    const feature = ACTION_FEATURE[action];
    return !feature || hasFeature(offre, feature);
  });
}

/** Statuts atteignables depuis `status` pour ce rôle et ce type de commande. */
export function nextStatuses(status: OrderStatus, role: Role, type: OrderType = "sur_place"): OrderStatus[] {
  const excluded = EXCLUDED_STATUSES[type];
  return ORDER_STATUS_FLOW[status].filter(
    (target) =>
      target !== "en_attente" &&
      !excluded.includes(target) &&
      can(role, `orders.setStatus:${target}`)
  );
}
