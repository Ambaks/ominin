import type {
  Action,
  Feature,
  Offre,
  OrderStatus,
  OrderType,
  OrderTab,
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

/** Onglet Terminaux : cadence de relecture de l'état des appareils et imprimantes. */
export const TERMINAUX_REFRESH_MS = 5000;
/** Un appareil ou une imprimante sans nouvelle depuis ce délai est hors ligne. */
export const TERMINAL_ONLINE_WINDOW_MS = 60_000;
/** Port d'une imprimante ESC/POS (miroir du défaut SQL de printers.port). */
export const DEFAULT_PRINTER_PORT = 9100;
/** Modale « Ajouter un boîtier » : cadence de relecture des boîtiers à rattacher. */
export const UNCLAIMED_POLL_MS = 3000;
/** Derniers caractères du numéro de série, imprimés sur l'étiquette du boîtier. */
export const SERIAL_CODE_LENGTH = 6;


/**
 * Toutes les étapes du service, dans leur ordre naturel — et, telles quelles,
 * ce que voit un restaurant qu'Ominin n'a pas réglé. Retirer une étape est une
 * demande de client (le BOHO n'a que l'addition et l'historique, ses tickets
 * sortant à l'imprimante), pas une règle du produit. Miroir du défaut SQL de
 * etablissement_settings.order_tabs.
 */
export const ORDER_TABS: OrderTab[] = [
  "a_encaisser",
  "a_servir",
  "historique",
];

export const ORDER_TAB_LABELS: Record<OrderTab, string> = {
  a_encaisser: "À encaisser",
  a_servir: "À servir",
  historique: "Historique",
};

export const ORDER_TAB_HINTS: Record<OrderTab, string> = {
  a_encaisser: "Les additions à régler, article par article.",
  a_servir: "Les plats partis en cuisine, à porter à table.",
  historique: "Les commandes closes, servies, retirées ou annulées.",
};

/** Statuts d'historique : commandes closes. */
export const HISTORY_ORDER_STATUSES: OrderStatus[] = ["servie", "annulee", "retiree"];

/** Statuts encaissés : payée sur place (servie ou non), ou retirée (collect, payée en ligne). */
export const PAID_ORDER_STATUSES: OrderStatus[] = ["payee", "servie", "retiree"];

/**
 * Statuts encore ouverts, quel que soit leur âge : à encaisser (en_attente),
 * à servir (payee) ou en cours côté collect.
 */
export const OPEN_ORDER_STATUSES: OrderStatus[] = [
  "en_attente",
  "en_preparation",
  "prete",
  "payee",
];

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

/**
 * Transitions proposées à l'écran depuis chaque statut (union des deux
 * flux). Sur place, l'encaissement et le service passent par les RPC par
 * article ; l'annulation d'un encaissement (page Paiements) ne passe pas
 * par ici.
 */
export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  en_attente: ["payee", "en_preparation", "annulee"],
  en_preparation: ["prete", "annulee"],
  prete: ["retiree", "annulee"],
  payee: ["servie"],
  servie: [],
  annulee: [],
  retiree: [],
};

/** Statuts exclus pour un type de commande donné (l'autre flux). */
export const EXCLUDED_STATUSES: Record<OrderType, OrderStatus[]> = {
  sur_place: ["en_preparation", "prete", "retiree"],
  collect: ["payee", "servie"],
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
  retiree: "Marquer retirée",
};

export const ROLE_LABELS: Record<Role, string> = {
  gerant: "Gérant",
  cuisinier: "Cuisinier",
  serveur: "Serveur",
};

export const ROLE_TAGLINES: Record<Role, string> = {
  gerant: "Accès complet : menu, équipe, abonnements et service.",
  cuisinier: "La cuisine : disponibilité des articles, commandes en cuisine — les tickets sortent sur l'imprimante.",
  serveur: "La salle : encaissement et service des tables.",
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
  mixte: "Espèces + carte",
};

/**
 * Taux de TVA de la restauration française : 5,5 % (emporter différé /
 * scellé), 10 % (sur place et emporter immédiat), 20 % (alcools).
 */
export const VAT_RATES = [5.5, 10, 20] as const;
/** Taux par défaut d'un article (miroir du défaut SQL de items.vat_rate). */
export const DEFAULT_VAT_RATE = 10;

/**
 * L'arborescence qu'Ominin coche pour chaque restaurant : une vue de l'espace
 * de gestion, puis les réglages qu'elle contient. Fermer une vue emporte ce
 * qu'elle porte ; la carte, elle, n'a pas de case — sans menu, aucune offre ne
 * tient debout.
 */
export interface FeatureSpec {
  id: Feature;
  label: string;
  hint: string;
}

export interface ViewSpec {
  /** Capacité qui ouvre la vue ; null quand la vue ne se retire pas. */
  id: Feature | null;
  label: string;
  hint: string;
  features: FeatureSpec[];
}

export const VIEWS: ViewSpec[] = [
  {
    id: null,
    label: "Menu",
    hint: "La carte : catégories, articles et formules.",
    features: [
      {
        id: "qr",
        label: "Menu QR",
        hint: "La carte publique que le client scanne à table.",
      },
      {
        id: "options",
        label: "Options d'article",
        hint: "Les choix et suppléments posés sur un article.",
      },
      {
        id: "appel_serveur",
        label: "Appeler un serveur",
        hint: "Le bouton du menu QR qui sonne sur les téléphones de l'équipe.",
      },
    ],
  },
  {
    id: "apercu",
    label: "Aperçu",
    hint: "Le tableau de bord d'accueil et son analytique.",
    features: [
      {
        id: "apercu_serveur",
        label: "Aperçu du serveur",
        hint: "La salle a son tableau de bord ; sinon elle ouvre sur le service.",
      },
    ],
  },
  {
    id: "commandes",
    label: "Commandes",
    hint: "Le suivi du service, de l'encaissement au plat servi.",
    features: [
      {
        id: "prise_commande",
        label: "Prise de commande en salle",
        hint: "Le bouton + : la salle saisit la commande pour le client.",
      },
    ],
  },
  {
    id: "tables",
    label: "Tables",
    hint: "Les tables en service et leur addition.",
    features: [
      {
        id: "assignation",
        label: "Affectation d'un serveur",
        hint: "Chaque table est confiée à un serveur, nommé sur sa tuile.",
      },
      {
        id: "groupes_tables",
        label: "Réunir des tables",
        hint: "Plusieurs tables sous une même addition, pour un grand groupe.",
      },
    ],
  },
  {
    id: "paiements",
    label: "Paiements",
    hint: "Le journal des encaissements, réservé au gérant.",
    features: [
      {
        id: "pourboires",
        label: "Pourboires par serveur",
        hint: "Le partage des pourboires, suivant la table encaissée.",
      },
    ],
  },
  {
    id: "badgeage",
    label: "Badgeage",
    hint: "La badgeuse signée et le planning de l'équipe.",
    features: [],
  },
  {
    id: "roles",
    label: "Équipe",
    hint: "Les comptes de l'équipe, leurs rôles et leurs fiches.",
    features: [
      {
        id: "equipe_sans_comptes",
        label: "Équipe sans comptes",
        hint: "Le gérant crée ses serveurs au prénom, sans email ni invitation.",
      },
    ],
  },
  {
    id: "terminaux",
    label: "Terminaux",
    hint: "Les boîtiers Omilink et leurs imprimantes.",
    features: [],
  },
];

/** Toutes les capacités, vues comprises, dans l'ordre de l'arborescence. */
export const FEATURES: Feature[] = VIEWS.flatMap((view) => [
  ...(view.id ? [view.id] : []),
  ...view.features.map((feature) => feature.id),
]);

/**
 * Ce que chaque offre ouvre par défaut. L'aperçu et le menu QR accompagnent
 * toute offre : ce sont la porte d'entrée de l'espace et la vitrine.
 *
 * Les gestes de salle qui ne conviennent pas à tous — affecter un serveur à
 * une table, réunir des tables, partager les pourboires, donner son tableau
 * de bord à la salle — n'y figurent pas : ils existent, et Ominin les coche
 * pour qui les demande.
 */
export const OFFRE_FEATURES: Record<Offre, Feature[]> = {
  digital: ["qr", "apercu"],
  smart: [
    "qr",
    "apercu",
    "commandes",
    "prise_commande",
    "appel_serveur",
    "tables",
    "paiements",
    "badgeage",
    "terminaux",
    "options",
    "roles",
  ],
  connect: [
    "qr",
    "apercu",
    "commandes",
    "prise_commande",
    "appel_serveur",
    "tables",
    "paiements",
    "badgeage",
    "terminaux",
    "options",
    "roles",
  ],
};

/**
 * Capacités du click & collect seul : vendre en ligne — suivre les commandes,
 * les encaisser, poser des options sur un article, et sortir les tickets sur
 * un boîtier Omilink — sans rien de la salle : ni tables, ni badgeuse, ni
 * équipe, qui restent l'apanage des offres menu & salle.
 */
export const COLLECT_FEATURES: Feature[] = [
  "apercu",
  "commandes",
  "paiements",
  "options",
  "terminaux",
];

/** Libellés des droits, pour présenter ce qu'un rôle autorise. */
export const ACTION_LABELS: Record<Action, string> = {
  ...(Object.fromEntries(
    Object.entries(ORDER_ACTION_LABELS).map(([status, label]) => [
      `orders.setStatus:${status}`,
      label,
    ])
  ) as Record<Extract<Action, `orders.${string}`>, string>),
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
};

export const ROLE_ACTIONS: Record<Role, Action[] | "all"> = {
  gerant: "all",
  cuisinier: ["menu.availability"],
  serveur: [
    "orders.setStatus:payee",
    "orders.setStatus:servie",
    "orders.setStatus:en_preparation",
    "orders.setStatus:prete",
    "orders.setStatus:retiree",
    // Commandes non réglées seulement (voir nextStatuses et le trigger SQL).
    "orders.setStatus:annulee",
  ],
};

/**
 * Les jours de la semaine tels que Postgres les numérote (isodow : 1 = lundi
 * … 7 = dimanche), dans l'ordre où un Français lit un calendrier.
 */
export const WEEK_DAYS: { iso: number; short: string; long: string }[] = [
  { iso: 1, short: "L", long: "lundi" },
  { iso: 2, short: "M", long: "mardi" },
  { iso: 3, short: "M", long: "mercredi" },
  { iso: 4, short: "J", long: "jeudi" },
  { iso: 5, short: "V", long: "vendredi" },
  { iso: 6, short: "S", long: "samedi" },
  { iso: 7, short: "D", long: "dimanche" },
];
