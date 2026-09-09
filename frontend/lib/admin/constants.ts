import type {
  ActivityType,
  AppointmentStatus,
  AppointmentType,
  LeadStatus,
  OutreachClassification,
  OutreachEmailStatus,
  Priority,
  ProspectQualification,
  RestaurantCategory,
  TaskStatus,
  VariantStatus,
} from "./types";

/*
 * Libellés et réglages du CRM admin. Tout le vocabulaire visible vit ici
 * (convention lib/gestion/constants.ts) : les écrans n'inventent pas de
 * chaînes.
 */

export const STATUS_ORDER: readonly LeadStatus[] = [
  "new",
  "to_contact",
  "contacted",
  "interested",
  "visited",
  "appointment_scheduled",
  "proposal",
  "negotiation",
  "signed",
  "lost",
  "not_interested",
  "no_email",
];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nouveau",
  to_contact: "À contacter",
  contacted: "Contacté",
  interested: "Intéressé",
  visited: "Visité",
  appointment_scheduled: "RDV planifié",
  proposal: "Proposition",
  negotiation: "Négociation",
  signed: "Signé",
  lost: "Perdu",
  not_interested: "Pas intéressé",
  no_email: "Sans e-mail",
};

/** Statuts sortis du pipeline actif (exclus des « leads actifs »). */
export const CLOSED_STATUSES: readonly LeadStatus[] = [
  "signed",
  "lost",
  "not_interested",
  "no_email",
];

export const CATEGORY_LABELS: Record<RestaurantCategory, string> = {
  restaurant: "Restaurant",
  fast_food: "Fast-food",
  cafe: "Café",
  bar: "Bar",
  bakery: "Boulangerie",
  pizzeria: "Pizzeria",
  brasserie: "Brasserie",
  hotel_restaurant: "Hôtel-restaurant",
  other: "Autre",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
};

/** Types d'activité qui valent « contact réel » → last_contact_at du lead. */
export const CONTACT_ACTIVITY_TYPES: readonly ActivityType[] = [
  "call",
  "email",
  "visit",
  "whatsapp",
  "appointment",
  "demo",
];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  note: "Note",
  call: "Appel",
  email: "E-mail",
  visit: "Visite",
  whatsapp: "WhatsApp",
  appointment: "Rendez-vous",
  demo: "Démo",
  follow_up: "Relance",
  status_change: "Statut",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: "À faire",
  done: "Terminée",
  cancelled: "Annulée",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Prévu",
  completed: "Terminé",
  cancelled: "Annulé",
  no_show: "No-show",
};

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  visit: "Visite",
  demo: "Démo",
  signing: "Signature",
  follow_up: "Relance",
  other: "Autre",
};

/*
 * Colonnes du pipeline. « Nouveau » = découvertes brutes non enrichies ;
 * « À traiter » = enrichis et qualifiés, prêts à contacter.
 * lost / not_interested / no_email vivent dans le rail replié à droite.
 */
export interface PipelineColumn {
  id: string;
  label: string;
  statuses: readonly LeadStatus[];
  /** Statut posé quand on dépose une carte dans la colonne. */
  dropStatus: LeadStatus;
}

export const PIPELINE_COLUMNS: readonly PipelineColumn[] = [
  { id: "nouveau", label: "Nouveau", statuses: ["new"], dropStatus: "new" },
  { id: "a-traiter", label: "À traiter", statuses: ["to_contact"], dropStatus: "to_contact" },
  { id: "contacted", label: "Contacté", statuses: ["contacted"], dropStatus: "contacted" },
  {
    id: "interested",
    label: "Intéressé",
    statuses: ["interested"],
    dropStatus: "interested",
  },
  { id: "visited", label: "Visité", statuses: ["visited"], dropStatus: "visited" },
  {
    id: "appointment",
    label: "RDV",
    statuses: ["appointment_scheduled"],
    dropStatus: "appointment_scheduled",
  },
  { id: "proposal", label: "Proposition", statuses: ["proposal"], dropStatus: "proposal" },
  {
    id: "negotiation",
    label: "Négociation",
    statuses: ["negotiation"],
    dropStatus: "negotiation",
  },
  { id: "signed", label: "Signé", statuses: ["signed"], dropStatus: "signed" },
];

export const PIPELINE_RAIL_COLUMNS: readonly PipelineColumn[] = [
  { id: "lost", label: "Perdu", statuses: ["lost"], dropStatus: "lost" },
  {
    id: "not_interested",
    label: "Pas intéressé",
    statuses: ["not_interested"],
    dropStatus: "not_interested",
  },
  {
    id: "no_email",
    label: "Sans e-mail",
    statuses: ["no_email"],
    dropStatus: "no_email",
  },
];

/** Au-delà, la colonne coupe le rendu (« Voir les N autres »). */
export const PIPELINE_COLUMN_CAP = 50;

// ---------------------------------------------------------------------------
// Prospection automatisée (agent « Léa »)

export const CLASSIFICATION_LABELS: Record<OutreachClassification, string> = {
  interested: "Intéressé",
  meeting_request: "Demande de RDV",
  question: "Question",
  not_interested: "Pas intéressé",
  opt_out: "Désinscription",
  bounce: "Non remis",
  other: "Autre",
};

export const OUTREACH_STATUS_LABELS: Record<OutreachEmailStatus, string> = {
  draft: "Brouillon",
  pending_approval: "À approuver",
  approved: "Approuvé",
  sending: "Envoi en cours",
  sent: "Envoyé",
  received: "Reçu",
  failed: "Échec",
  cancelled: "Annulé",
};

export const OUTREACH_JOB_LABELS: Record<string, string> = {
  discover: "Découverte",
  enrich: "Qualification",
  outreach: "Prospection",
  inbox: "Boîte de réception",
  autoresearch: "AutoResearch",
};

/** Réponses qui valent un suivi humain (miroir de services/inbox.py). */
export const POSITIVE_CLASSIFICATIONS: readonly OutreachClassification[] = [
  "interested",
  "meeting_request",
  "question",
];

export const VARIANT_STATUS_LABELS: Record<VariantStatus, string> = {
  baseline: "Référence",
  active: "Active",
  candidate: "Candidate",
  retired: "Retirée",
};

export const QUALIFICATION_LABELS: Record<ProspectQualification, string> = {
  pending: "En attente",
  qualified: "Qualifié",
  contacted: "Contacté",
  disqualified: "Écarté",
};

/** Motifs d'écartement écrits par l'agent (outreach_prospects.disqualify_reason). */
export const DISQUALIFY_REASON_LABELS: Record<string, string> = {
  no_email: "Pas d'e-mail trouvé",
  contact_form: "Formulaire de contact",
  has_digital_menu: "Déjà digitalisé",
  not_worth: "Hors cible",
  suppressed: "Désinscrit",
};

/** Fenêtre de chargement de la page Agent Léa (lignes les plus récentes). */
export const OUTREACH_EMAILS_FETCH_LIMIT = 200;
export const OUTREACH_RUNS_FETCH_LIMIT = 50;
export const OUTREACH_PROSPECTS_FETCH_LIMIT = 500;
export const OUTREACH_VARIANTS_FETCH_LIMIT = 50;

// ---------------------------------------------------------------------------
// Clients — les établissements qui tournent, pas les prospects

/**
 * Cadence de relecture du direct. On interroge au lieu de s'abonner : « en
 * cours » est une comparaison d'horodatage, pas un flux d'événements, et une
 * websocket d'admin prendrait la place de celles dont les restaurants ont
 * besoin pour leur propre tableau de bord.
 */
export const LIVE_REFRESH_MS = 10_000;

/**
 * Une visite sans battement de cœur depuis ce délai n'est plus « en cours ».
 * Environ deux battements et demi (menu/analytics/constants.ts) : de quoi en
 * perdre un sans faire disparaître un client encore attablé.
 */
export const LIVE_SESSION_WINDOW_S = 120;

/** Périodes proposées sur la fiche d'un client (jours calendaires). */
export const CLIENT_PERIOD_DAYS = [7, 30, 90] as const;

/** Dernières commandes affichées dans le fil d'activité. */
export const ACTIVITY_FEED_LIMIT = 30;

/** Longueur du palmarès des plats (vus contre vendus). */
export const ITEM_RANKING_COUNT = 10;

/** Sous-onglets de la fiche client, portés par ?vue= pour rester liables. */
export const CLIENT_VIEWS = [
  { id: "revenus", label: "Revenus" },
  { id: "analytique", label: "Analytique" },
  { id: "activite", label: "Activité" },
  { id: "reglages", label: "Réglages" },
] as const;

export type ClientView = (typeof CLIENT_VIEWS)[number]["id"];

// ---------------------------------------------------------------------------
// Carte

/** Montpellier, place de la Comédie — cadre par défaut avant persistance. */
export const MAP_DEFAULT_CENTER: [number, number] = [3.877, 43.611];
export const MAP_DEFAULT_ZOOM = 12;
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
export const MAP_CLUSTER_RADIUS = 40;
export const MAP_CLUSTER_MAX_ZOOM = 14;
export const MAP_VIEWPORT_STORAGE_KEY = "ominin-admin-map-viewport";

// ---------------------------------------------------------------------------
// Terrain

/** La capture de position ne bloque jamais la saisie au-delà de ce délai. */
export const GEOLOCATION_TIMEOUT_MS = 3000;

/** Raccourcis de relance du flux « Visité ». */
export const FOLLOW_UP_QUICK_OPTIONS: readonly { label: string; days: number }[] =
  [
    { label: "Demain", days: 1 },
    { label: "Dans 3 j", days: 3 },
    { label: "Semaine proch.", days: 7 },
  ];

// ---------------------------------------------------------------------------
// Tâches & RDV

export const APPOINTMENT_DURATIONS_MIN: readonly number[] = [30, 60, 90, 120];
export const APPOINTMENT_DEFAULT_DURATION_MIN = 60;
/** Fenêtre des RDV chargés au démarrage et sur la page RDV (jours). */
export const APPOINTMENTS_WINDOW_DAYS = 30;
/** Fenêtre des tâches terminées chargées à la demande (jours). */
export const COMPLETED_TASKS_WINDOW_DAYS = 30;

// ---------------------------------------------------------------------------
// Filtres & import

/** Options « aucun contact depuis N jours ». */
export const NO_CONTACT_OPTIONS: readonly number[] = [7, 14, 30, 90];

/** Taille des lots d'insertion de l'import CSV. */
export const CSV_IMPORT_CHUNK_SIZE = 100;

/** En-têtes attendus du CSV d'import (ordre indifférent). */
export const IMPORT_HEADERS = [
  "name",
  "address",
  "city",
  "postal_code",
  "latitude",
  "longitude",
  "phone",
  "email",
  "website",
  "menu_url",
  "category",
] as const;

/** Tolérance de saisie sur la colonne category de l'import (clés normalisées). */
export const CATEGORY_ALIASES: Record<string, RestaurantCategory> = {
  restaurant: "restaurant",
  "fast-food": "fast_food",
  "fast food": "fast_food",
  fastfood: "fast_food",
  snack: "fast_food",
  cafe: "cafe",
  coffee: "cafe",
  bar: "bar",
  boulangerie: "bakery",
  bakery: "bakery",
  pizzeria: "pizzeria",
  pizza: "pizzeria",
  brasserie: "brasserie",
  "hotel-restaurant": "hotel_restaurant",
  "hotel restaurant": "hotel_restaurant",
  hotel: "hotel_restaurant",
  autre: "other",
  other: "other",
};
