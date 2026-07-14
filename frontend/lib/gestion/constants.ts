import type {
  Action,
  Feature,
  Offre,
  OrderStatus,
  OrderType,
  PaymentMode,
  Role,
} from "./types";

export const SEED_TABLE_COUNT = 12;
export const TOAST_DURATION_MS = 3000;
/** Relecture du statut d'abonnement au retour de Stripe Checkout. */
export const SUBSCRIPTION_POLL_MS = 3000;
export const TOP_VENTES_COUNT = 5;
/** Périodes proposées par la page Analytique (en jours calendaires). */
export const ANALYTICS_PERIOD_DAYS = [7, 30] as const;
/** Nombre de commandes par page dans l'historique (chargement à la demande). */
export const HISTORY_PAGE_SIZE = 50;

/** Statuts d'historique : commandes clôturées. */
export const HISTORY_ORDER_STATUSES: OrderStatus[] = ["payee", "annulee", "retiree"];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  en_attente: "En attente",
  en_preparation: "En préparation",
  prete: "Prête",
  servie: "Servie",
  payee: "Payée",
  annulee: "Annulée",
  retiree: "Retirée",
};

/** Transitions autorisées depuis chaque statut (union des deux flux). */
export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  en_attente: ["en_preparation", "annulee"],
  en_preparation: ["prete", "annulee"],
  prete: ["servie", "retiree", "annulee"],
  servie: ["payee"],
  payee: [],
  annulee: [],
  retiree: [],
};

/** Statuts exclus pour un type de commande donné (l'autre flux). */
export const EXCLUDED_STATUSES: Record<OrderType, OrderStatus[]> = {
  sur_place: ["retiree"],
  collect: ["servie", "payee"],
};

/** Statuts encore ouverts (ceux dont le flux autorise une transition). */
export const ACTIVE_ORDER_STATUSES = (
  Object.keys(ORDER_STATUS_FLOW) as OrderStatus[]
).filter((status) => ORDER_STATUS_FLOW[status].length > 0);

/** Libellé du bouton menant vers chaque statut cible. */
export const ORDER_ACTION_LABELS: Record<
  Exclude<OrderStatus, "en_attente">,
  string
> = {
  en_preparation: "Commencer la préparation",
  prete: "Marquer prête",
  servie: "Marquer servie",
  payee: "Encaisser",
  annulee: "Annuler",
  retiree: "Marquer retirée",
};

export const ROLE_LABELS: Record<Role, string> = {
  gerant: "Gérant",
  cuisinier: "Cuisinier",
  serveur: "Serveur",
};

export const OFFRE_LABELS: Record<Offre, string> = {
  digital: "Digital",
  smart: "Smart",
  connect: "Connect",
};

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  especes: "Espèces",
  carte: "Carte",
  en_ligne: "En ligne",
};

export const OFFRE_FEATURES: Record<Offre, Feature[]> = {
  digital: [],
  smart: ["commandes", "tables", "options", "roles"],
  connect: ["commandes", "tables", "options", "roles"],
};

export const ROLE_ACTIONS: Record<Role, Action[] | "all"> = {
  gerant: "all",
  cuisinier: [
    "orders.setStatus:en_preparation",
    "orders.setStatus:prete",
    "orders.setStatus:servie",
    "orders.setStatus:retiree",
    "orders.setStatus:annulee",
    "menu.availability",
  ],
  serveur: ["orders.setStatus:servie", "orders.setStatus:retiree", "tables.group"],
};
