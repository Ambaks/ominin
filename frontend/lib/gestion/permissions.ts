import {
  ACTION_FEATURE,
  ACTION_LABELS,
  COLLECT_FEATURES,
  EXCLUDED_STATUSES,
  OFFRE_FEATURES,
  ORDER_STATUS_FLOW,
  ROLE_ACTIONS,
} from "./constants";
import type {
  Action,
  ActiveProducts,
  Feature,
  OrderStatus,
  OrderType,
  Role,
} from "./types";

/** Une capacité est ouverte dès qu'un des produits souscrits la porte. */
export function hasFeature(
  products: ActiveProducts,
  feature: Feature
): boolean {
  return (
    (products.offre != null && OFFRE_FEATURES[products.offre].includes(feature)) ||
    (products.collect && COLLECT_FEATURES.includes(feature))
  );
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
export function allowedActions(
  role: Role,
  products: ActiveProducts
): Action[] {
  const actions = ROLE_ACTIONS[role];
  const granted =
    actions === "all" ? (Object.keys(ACTION_LABELS) as Action[]) : actions;
  return granted.filter((action) => {
    const feature = ACTION_FEATURE[action];
    return !feature || hasFeature(products, feature);
  });
}

/**
 * Statuts atteignables depuis `status` pour ce rôle et ce type de commande.
 * Le serveur n'annule qu'une commande encore à encaisser — aucun règlement à
 * défaire ; au-delà, c'est le gérant (miroir de enforce_order_update_rights).
 */
export function nextStatuses(status: OrderStatus, role: Role, type: OrderType = "sur_place"): OrderStatus[] {
  const excluded = EXCLUDED_STATUSES[type];
  return ORDER_STATUS_FLOW[status].filter(
    (target) =>
      target !== "en_attente" &&
      !excluded.includes(target) &&
      can(role, `orders.setStatus:${target}`) &&
      !(target === "annulee" && role === "serveur" && status !== "en_attente")
  );
}
