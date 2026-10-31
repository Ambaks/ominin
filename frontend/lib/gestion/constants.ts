import { BOHO_DEMO_SLUG } from "@/lib/bulles/demo";
import type {
  AccordSource,
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
/**
 * Modèles proposés à la création d'une formule : ses étapes, chacune prenant
 * la catégorie de la carte qui porte son nom (« Entrées », « Nos plats »…).
 */
export const FORMULE_MODELES = [
  ["Entrée", "Plat"],
  ["Plat", "Dessert"],
  ["Entrée", "Plat", "Dessert"],
] as const;
/** L'accord du chef : accords proposés à la fois dans le panier du menu QR. */
export const CART_PAIRINGS_COUNT = 2;
/** Après le repas : le temps laissé au client, depuis le scan du retrait, avant de lui proposer la suite. */
export const AFTER_MEAL_DELAY_MS = 17 * 60_000;
/** Après le repas : passé ce temps depuis le scan du retrait, la proposition n'a plus de sens. */
export const AFTER_MEAL_EXPIRY_MS = 2 * 60 * 60_000;
/** Lignes du panier montrées d'emblée : au-delà, la liste se replie sous l'accord du chef et la fidélité. */
export const CART_LINES_SHOWN = 3;
/** Articles d'un palier de fidélité montrés d'emblée dans le panier : au-delà, « Voir les N autres ». */
export const REWARD_ITEMS_SHOWN = 3;
/** Périodes proposées par la page Analytique (en jours calendaires). */
export const ANALYTICS_PERIOD_DAYS = [7, 30] as const;
/** Petite base : sous ce nombre d'éléments, l'écart s'écrit en brut (« était 1 »), jamais en pourcentage. */
export const SMALL_BASE = 5;
/** Bascule de la journée de service. Miroir du défaut SQL de
 * etablissement_settings.day_end_hour. */
export const DEFAULT_DAY_END_HOUR = 0;
/** Onglet Paiements : encaissements affichés d'emblée, puis ajoutés à chaque « Voir plus ». */
export const PAYMENTS_PAGE_SIZE = 20;
/** Onglet Historique des commandes : commandes affichées d'emblée, puis ajoutées à chaque « Voir plus ». */
export const ORDER_HISTORY_PAGE_SIZE = 10;
/** Tailles de page au choix d'une longue liste : la première s'applique d'emblée. */
export const LIST_PAGE_SIZES = [10, 25] as const;
/** Recherche côté base : le temps de finir de taper avant d'interroger. */
export const LIST_SEARCH_DEBOUNCE_MS = 250;

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
/** Chiffres du code de badgeage d'une fiche (miroir de set_staff_code). */
export const STAFF_CODE_LENGTH = 4;


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

/**
 * Le nom de l'onglet des bulles. Un restaurant peut garder le sien : c'est le
 * mot que son équipe emploie (demande du BOHO), pas une règle du produit.
 */
const BULLES_TAB_NAME = "Réservations";
const BULLES_TAB_NAME_BY_SLUG: Record<string, string> = {
  boho: "Bulles",
  [BOHO_DEMO_SLUG]: "Bulles",
};

export function bullesTabName(slug: string): string {
  return BULLES_TAB_NAME_BY_SLUG[slug] ?? BULLES_TAB_NAME;
}

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

/**
 * Statuts relus par la page Paiements : payée sur place (servie ou non),
 * prête (une commande fast food réglée, ou à emporter payée en ligne, qui
 * attend son client), ou retirée. isPaid trie ensuite ce qui est réglé.
 */
export const PAID_ORDER_STATUSES: OrderStatus[] = ["payee", "prete", "servie", "retiree"];

/** Retrait au bar : une commande numérotée se remet réglée, prête ou pas encore. */
export const HANDOVER_STATUSES: OrderStatus[] = ["payee", "prete"];

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
/** Cadence de recalcul des écrans qui suivent l'heure (attentes, créneaux, ouvert/fermé, fermetures). */
export const WAIT_TICK_MS = 30_000;
/** Comptoir fast food : minutes de préparation au-delà desquelles une commande se signale… */
export const COUNTER_WAIT_WARN_MINUTES = 8;
/** … puis passe en retard. */
export const COUNTER_WAIT_LATE_MINUTES = 15;
/** Salle : minutes d'attente au-delà desquelles une table à servir se signale. */
export const SERVICE_LATE_MINUTES = 20;
/** À encaisser : établissements dont les additions signalent leur attente (le BOHO va encaisser à table). */
export const ENCAISSER_WAIT_ALERT_SLUGS = ["boho"];
/** Minutes d'attente au-delà desquelles une addition se signale… */
export const ENCAISSER_WAIT_WARN_MINUTES = 6;
/** … puis passe en retard. */
export const ENCAISSER_WAIT_LATE_MINUTES = 12;
/** « Le midi en semaine » sans horaires d'ouverture : la plage de repli (même forme qu'une plage d'OpeningHours). */
export const LUNCH_FALLBACK: [string, string] = ["11:30", "14:30"];
/** L'heure qu'une plage d'ouverture doit couvrir pour compter comme le midi. */
export const LUNCH_PIVOT = "12:30";

/** Carillon des nouvelles commandes : préférence par appareil (défaut : activé). */
export const CHIME_STORAGE_KEY = "ominin-gestion-chime";
/** Thème de l'espace : préférence par appareil (DESIGN.md § 15). */
export const GESTION_THEME_STORAGE_KEY = "ominin-gestion-theme";
/** Le premier est le défaut : il ne pose aucun attribut `data-g-theme`. */
export const GESTION_THEMES = [
  { value: "glass", label: "Ember glass", preview: "/gestion-themes/glass.webp" },
  { value: "neon", label: "Néon braise", preview: "/gestion-themes/neon.webp" },
  { value: "teal", label: "Ember teal", preview: "/gestion-themes/teal.webp" },
] as const;
export type GestionTheme = (typeof GESTION_THEMES)[number]["value"];
/** Invite aux notifications push écartée sur cet appareil (page Commandes). */
export const PUSH_PROMPT_DISMISSED_KEY = "ominin-push-prompt-dismissed";
/** Une commande a été saisie sur cet appareil : le bouton « Nouvelle commande » se replie en rond. */
export const STAFF_ORDER_ENTERED_KEY = "ominin-staff-order-entered";

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
  // Une commande à emporter se remet dès qu'elle est sur l'étagère.
  en_preparation: ["prete", "retiree", "annulee"],
  prete: ["retiree", "servie", "payee", "annulee"],
  payee: ["servie", "prete"],
  servie: [],
  annulee: [],
  retiree: [],
};

/**
 * Statuts exclus pour un type de commande donné (l'autre flux). Une commande
 * à emporter, payée en ligne, ne se refuse ni ne s'annule depuis l'espace :
 * aucun remboursement n'en partirait.
 */
export const EXCLUDED_STATUSES: Record<OrderType, OrderStatus[]> = {
  sur_place: ["en_preparation", "prete", "retiree"],
  collect: ["payee", "servie", "annulee"],
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

/** Boutique à emporter seule : Commandes reprend les verbes de Retraits. */
export const PICKUP_ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  en_preparation: "Prendre en charge",
  prete: "Prête",
  retiree: "Remettre",
};

/** Les mots de la boutique pour chaque étape d'un retrait, dans Retraits comme dans Commandes. */
export const PICKUP_STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  en_attente: "Nouvelle",
  en_preparation: "À préparer",
  prete: "Prête",
  retiree: "Remise",
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

/** Boutique à emporter seule : ni salle ni cuisine, un comptoir et une préparation. */
export const PICKUP_ROLE_LABELS: Record<Role, string> = {
  gerant: "Gérant",
  cuisinier: "Préparation",
  serveur: "Comptoir",
};

export const PICKUP_ROLE_TAGLINES: Record<Role, string> = {
  gerant: ROLE_TAGLINES.gerant,
  cuisinier: "La préparation : disponibilité des articles et quantités à produire, jour par jour.",
  serveur: "Le comptoir : commandes, encaissement et retraits.",
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
  caisse: "Caisse",
};

/** Origines d'une vente de l'accord du chef, dans l'ordre de la page Analytique. */
export const ACCORD_SOURCE_LABELS: Record<AccordSource, string> = {
  panier: "Suggérés dans le panier",
  fiche: "Cochés sur une fiche plat",
  formule: "Formules proposées",
};

/**
 * Taux de TVA de la restauration française : 5,5 % (emporter différé /
 * scellé), 10 % (sur place et emporter immédiat), 20 % (alcools).
 */
export const VAT_RATES = [5.5, 10, 20] as const;
/** Taux par défaut d'un article (miroir du défaut SQL de items.vat_rate). */
export const DEFAULT_VAT_RATE = 10;

/** Durée d'un créneau de retrait (miroir du défaut SQL de etablissements.collect_slot_minutes). */
export const DEFAULT_COLLECT_SLOT_MINUTES = 15;

/**
 * Bornes des saisies d'Ominin Club, miroirs des contraintes SQL de
 * club_events, club_zones, club_bookings et des conditions d'entrée
 * d'etablissements (20261020000001) : le formulaire
 * refuse ce que la base refuserait.
 */
export const CLUB_LIMITS = {
  title: 80,
  tag: 30,
  description: 2000,
  inclus: 120,
  guestMaxParty: 20,
  name: 80,
  phoneMin: 6,
  phoneMax: 30,
  note: 300,
  minAgeFrom: 16,
  minAgeTo: 25,
  dressCode: 80,
  refused: 120,
} as const;

/** Jours proposés d'un geste dans Retraits, aujourd'hui compris ; au-delà, le champ date. */
export const RETRAITS_DAYS_SHOWN = 14;

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
      {
        id: "site",
        label: "Site web",
        hint: "Le site de l'établissement, géré par Ominin, sous menu.ominin.com/w/. Hors offre : Ominin l'ouvre une fois son site créé.",
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
    id: "retraits",
    label: "Retraits",
    hint: "Le click & collect jour par jour : les retraits, les commandes prises au comptoir ou au téléphone, et ce qu'il reste à préparer.",
    features: [],
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
    features: [
      {
        id: "lien_heures",
        label: "Heures sur le lien planning",
        hint: "Le lien du serveur montre aussi son total prévu et ses badgeages ; sinon, ses créneaux seulement.",
      },
    ],
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
  {
    id: "fidelite",
    label: "Fidélité",
    hint: "Les points gagnés à chaque commande du menu QR et les paliers qu'ils offrent. Hors offre : Ominin l'ouvre à la demande, le gérant l'allume ensuite.",
    features: [],
  },
  {
    id: "soirees",
    label: "Soirées",
    hint: "Ominin Club : les soirées du club, les tables à vendre et leurs prix, le plan du soir en direct à la porte et la liste d'invités. Hors offre : Ominin l'ouvre pour un club.",
    features: [],
  },
  {
    id: "bulles",
    label: "Réservations",
    hint: "La réservation en ligne depuis le site (les bulles du Boho) : créneaux, prix par personne, réservations du soir et arrivées. Hors offre : Ominin l'ouvre une fois le site de l'établissement créé.",
    features: [],
  },
  {
    id: "produits",
    label: "Produits",
    hint: "L'onglet compte : l'offre souscrite, le rôle et le catalogue Ominin. Fermé au serveur quoi qu'il arrive.",
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
  digital: ["qr", "apercu", "produits"],
  smart: [
    "qr",
    "apercu",
    "commandes",
    "prise_commande",
    "appel_serveur",
    "tables",
    "paiements",
    "badgeage",
    "lien_heures",
    "terminaux",
    "options",
    "roles",
    "produits",
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
    "lien_heures",
    "terminaux",
    "options",
    "roles",
    "produits",
  ],
};

/**
 * Ce qui suppose des tables : en fast food, le client commande sans table et
 * repart avec un numéro — ces capacités n'ont rien sur quoi porter, quels que
 * soient l'offre et les réglages d'Ominin.
 */
export const TABLE_FEATURES: Feature[] = [
  "tables",
  "appel_serveur",
  "apercu_serveur",
  "assignation",
  "groupes_tables",
];

/**
 * Capacités du click & collect seul : vendre en ligne — suivre les commandes,
 * les encaisser, poser des options sur un article, et sortir les tickets sur
 * un boîtier Omilink — sans rien de la salle : ni tables, ni badgeuse, ni
 * équipe, qui restent l'apanage des offres menu & salle.
 */
export const COLLECT_FEATURES: Feature[] = [
  "apercu",
  "commandes",
  "retraits",
  "paiements",
  "options",
  "terminaux",
  "produits",
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
  "fermetures.basculer": "Fermer ou rouvrir la cuisine",
  "soirees.edit": "Préparer les soirées, saisir et rembourser les tables",
};

/** Fonctionnalité conditionnant un droit (absente ⇒ incluse dans toute offre). */
export const ACTION_FEATURE: Partial<Record<Action, Feature>> = {
  ...(Object.fromEntries(
    Object.keys(ORDER_ACTION_LABELS).map((status) => [
      `orders.setStatus:${status}`,
      "commandes",
    ])
  ) as Record<Extract<Action, `orders.${string}`>, Feature>),
  "fermetures.basculer": "commandes",
  "soirees.edit": "soirees",
};

export const ROLE_ACTIONS: Record<Role, Action[] | "all"> = {
  gerant: "all",
  cuisinier: ["menu.availability", "fermetures.basculer"],
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
