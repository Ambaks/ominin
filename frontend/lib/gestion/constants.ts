import type {
  Action,
  Feature,
  Offre,
  OrderStatus,
  PaymentMode,
  Role,
} from "./types";

export const STORAGE_KEY = "ominin.gestion";
export const STORAGE_VERSION = 2;

export const SEED_TABLE_COUNT = 12;
export const TOAST_DURATION_MS = 3000;
export const TOP_VENTES_COUNT = 5;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  en_attente: "En attente",
  en_preparation: "En préparation",
  prete: "Prête",
  servie: "Servie",
  payee: "Payée",
  annulee: "Annulée",
};

/** Transitions autorisées depuis chaque statut. */
export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  en_attente: ["en_preparation", "annulee"],
  en_preparation: ["prete", "annulee"],
  prete: ["servie", "annulee"],
  servie: ["payee"],
  payee: [],
  annulee: [],
};

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
    "orders.setStatus:annulee",
    "menu.availability",
  ],
  serveur: ["orders.setStatus:servie", "tables.group"],
};
