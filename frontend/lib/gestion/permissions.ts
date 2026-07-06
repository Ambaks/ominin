import { OFFRE_FEATURES, ORDER_STATUS_FLOW, ROLE_ACTIONS } from "./constants";
import type { Action, Feature, Offre, OrderStatus, Role } from "./types";

export function hasFeature(offre: Offre, feature: Feature): boolean {
  return OFFRE_FEATURES[offre].includes(feature);
}

export function can(role: Role, action: Action): boolean {
  const actions = ROLE_ACTIONS[role];
  return actions === "all" || actions.includes(action);
}

/** Statuts atteignables depuis `status` pour ce rôle (flux ∩ permissions). */
export function nextStatuses(status: OrderStatus, role: Role): OrderStatus[] {
  return ORDER_STATUS_FLOW[status].filter(
    (target) => target !== "en_attente" && can(role, `orders.setStatus:${target}`)
  );
}
