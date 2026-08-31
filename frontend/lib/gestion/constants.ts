import type {
  Action,
  Feature,
  Offre,
  OrderStatus,
  OrderType,
  PaymentMode,
  PaymentProvider,
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

/** Horloge de service des vues employés : cadence d'affichage (seconde). */
export const SERVICE_CLOCK_TICK_MS = 1000;
/** Temps d'attente affichés (en minutes) : cadence de recalcul. */
export const WAIT_TICK_MS = 30_000;

/** Carillon des nouvelles commandes : préférence par appareil (défaut : activé). */
export const CHIME_STORAGE_KEY = "ominin-gestion-chime";
/** Invite aux notifications push écartée sur cet appareil (page Commandes). */
export const PUSH_PROMPT_DISMISSED_KEY = "ominin-push-prompt-dismissed";

/**
 * Délais proposés à l'acceptation d'une commande collect « dès que
 * possible » (minutes avant que la commande soit prête).
 */
export const COLLECT_ETA_CHOICES_MIN = [5, 15, 25, 40] as const;

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

export const ROLE_TAGLINES: Record<Role, string> = {
  gerant: "Accès complet : menu, équipe, abonnements et service.",
  cuisinier: "La cuisine : préparation des commandes et disponibilité des articles.",
  serveur: "La salle : tables, service et clôture des commandes.",
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

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = {
  stripe: "Stripe",
  sumup: "SumUp",
};

/**
 * Taux de TVA de la restauration française : 5,5 % (emporter différé /
 * scellé), 10 % (sur place et emporter immédiat), 20 % (alcools).
 */
export const VAT_RATES = [5.5, 10, 20] as const;
/** Taux par défaut d'un article (miroir du défaut SQL de items.vat_rate). */
export const DEFAULT_VAT_RATE = 10;

export const OFFRE_FEATURES: Record<Offre, Feature[]> = {
  digital: ["qr"],
  smart: ["qr", "commandes", "tables", "options", "roles"],
  connect: ["qr", "commandes", "tables", "options", "roles"],
};

/**
 * Capacités du click & collect seul : vendre en ligne (suivi des commandes,
 * options des articles), sans rien de la salle — ni tables, ni Cachets, ni
 * équipe, qui restent l'apanage des offres menu & salle.
 */
export const COLLECT_FEATURES: Feature[] = ["commandes", "options"];

/** Libellés des droits, pour présenter ce qu'un rôle autorise. */
export const ACTION_LABELS: Record<Action, string> = {
  ...(Object.fromEntries(
    Object.entries(ORDER_ACTION_LABELS).map(([status, label]) => [
      `orders.setStatus:${status}`,
      label,
    ])
  ) as Record<Extract<Action, `orders.${string}`>, string>),
  "tables.group": "Grouper des tables",
  "menu.edit": "Modifier le menu",
  "menu.availability": "Gérer les disponibilités",
  "formules.edit": "Modifier les formules",
  "categories.edit": "Modifier les catégories",
  "etablissement.edit": "Modifier l'établissement",
};

/** Fonctionnalité conditionnant un droit (absente ⇒ incluse dans toute offre). */
export const ACTION_FEATURE: Partial<Record<Action, Feature>> = {
  ...(Object.fromEntries(
    Object.keys(ORDER_ACTION_LABELS).map((status) => [
      `orders.setStatus:${status}`,
      "commandes",
    ])
  ) as Record<Extract<Action, `orders.${string}`>, Feature>),
  "tables.group": "tables",
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
