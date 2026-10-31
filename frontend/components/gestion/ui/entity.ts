/** Ce que mesure un bloc : la couleur suit l'entité (DESIGN.md). */
export type Entity = "none" | "money" | "orders" | "problem";

/** Verre teinté à l'entité. */
export const GLASS_ENTITY: Record<Entity, string> = {
  none: "",
  money: "g-glass-money",
  orders: "g-glass-orders",
  problem: "g-glass-problem",
};

/** Couleur d'entité seule, sans verre (listes, barres, pastilles). */
export const ENTITY: Record<Entity, string> = {
  none: "",
  money: "g-money",
  orders: "g-orders",
  problem: "g-problem",
};
