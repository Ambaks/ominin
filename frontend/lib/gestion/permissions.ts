import { EXCLUDED_STATUSES, OFFRE_FEATURES, ORDER_STATUS_FLOW, ROLE_ACTIONS } from "./constants";
import type { Action, Feature, Offre, OrderStatus, OrderType, Role } from "./types";

export function hasFeature(offre: Offre, feature: Feature): boolean {
  return OFFRE_FEATURES[offre].includes(feature);
}

export function can(role: Role, action: Action): boolean {
  const actions = ROLE_ACTIONS[role];
  return actions === "all" || actions.includes(action);
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
