import type { Database, Json } from "@/lib/supabase/database.types";

export type LeadStatus = Database["public"]["Enums"]["crm_lead_status"];
export type RestaurantCategory =
  Database["public"]["Enums"]["crm_restaurant_category"];
export type Priority = Database["public"]["Enums"]["crm_priority"];
export type ActivityType = Database["public"]["Enums"]["crm_activity_type"];
export type TaskStatus = Database["public"]["Enums"]["crm_task_status"];
export type AppointmentStatus =
  Database["public"]["Enums"]["crm_appointment_status"];
export type AppointmentType =
  Database["public"]["Enums"]["crm_appointment_type"];

/*
 * Ligne légère : la projection restaurant + lead chargée en entier au
 * démarrage (~120 octets/ligne). Carte, listes, pipeline et recherche
 * travaillent dessus sans retour réseau ; le détail (activités, contacts…)
 * se charge à la fiche via lead-cache.
 */
export interface LeadLite {
  /** Clé de navigation partout (?lead=<restaurantId>). */
  restaurantId: string;
  leadId: string;
  name: string;
  category: RestaurantCategory;
  city: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  status: LeadStatus;
  priority: Priority;
  phone: string | null;
  email: string | null;
  hasWebsite: boolean;
  ownerName: string | null;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  /** Champ de recherche pré-normalisé (nom, ville, adresse, contact…). */
  searchKey: string;
}

export interface TaskRow {
  id: string;
  restaurantId: string | null;
  leadId: string | null;
  title: string;
  description: string | null;
  dueAt: string | null;
  priority: Priority;
  status: TaskStatus;
  completedAt: string | null;
  createdAt: string;
}

export interface AppointmentRow {
  id: string;
  restaurantId: string;
  contactId: string | null;
  title: string;
  startAt: string;
  endAt: string | null;
  location: string | null;
  notes: string | null;
  status: AppointmentStatus;
  type: AppointmentType;
}

export interface Activity {
  id: string;
  type: ActivityType;
  title: string | null;
  description: string | null;
  metadata: Json;
  createdAt: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  isDecisionMaker: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: RestaurantCategory;
  cuisine: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  menuUrl: string | null;
  googleMapsUrl: string | null;
  instagramUrl: string | null;
  source: string;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerEmail: string | null;
  importantNotes: string | null;
  createdAt: string;
}

export interface Lead {
  id: string;
  restaurantId: string;
  status: LeadStatus;
  priority: Priority;
  estimatedValue: number | null;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  lostReason: string | null;
  createdAt: string;
}

/** Détail complet d'une fiche, chargé à l'ouverture du panneau. */
export interface LeadDetail {
  restaurant: Restaurant;
  lead: Lead;
  contacts: Contact[];
  /** Antéchronologique. */
  activities: Activity[];
  tasks: TaskRow[];
  appointments: AppointmentRow[];
}

export interface AdminState {
  userId: string;
  leads: LeadLite[];
  /** Tâches ouvertes, toutes (badge de nav, tableau de bord, pipeline). */
  tasks: TaskRow[];
  /** RDV prévus dans la fenêtre à venir (tableau de bord, filtres). */
  appointments: AppointmentRow[];
  /** Brouillons de Léa en attente d'approbation (badge de nav E-mails). */
  pendingDrafts: number;
}

/** Ensembles vides = pas de filtre sur cette dimension. */
export interface Filters {
  statuses: Set<LeadStatus>;
  categories: Set<RestaurantCategory>;
  cities: Set<string>;
  hasEmail: boolean;
  hasPhone: boolean;
  hasWebsite: boolean;
  hasAppointment: boolean;
  hasFollowUp: boolean;
  /** Aucun contact depuis N jours (ou jamais) ; null = inactif. */
  noContactDays: number | null;
  q: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracy?: number;
}

// ---------------------------------------------------------------------------
// Prospection automatisée (agent « Léa »)

export type OutreachDirection =
  Database["public"]["Enums"]["outreach_email_direction"];
export type OutreachEmailStatus =
  Database["public"]["Enums"]["outreach_email_status"];
export type OutreachClassification =
  Database["public"]["Enums"]["outreach_classification"];

export interface OutreachEmail {
  id: string;
  restaurantId: string;
  leadId: string | null;
  direction: OutreachDirection;
  kind: "cold" | "reply";
  status: OutreachEmailStatus;
  toEmail: string | null;
  fromEmail: string | null;
  subject: string | null;
  bodyText: string | null;
  inReplyTo: string | null;
  classification: OutreachClassification | null;
  error: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  createdAt: string;
}

export interface OutreachRun {
  id: string;
  job: string;
  status: string;
  stats: Json;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export type ProspectQualification =
  | "pending"
  | "qualified"
  | "contacted"
  | "disqualified";

export interface OutreachProspect {
  restaurantId: string;
  name: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  qualification: ProspectQualification;
  disqualifyReason: string | null;
  hasDigitalMenu: boolean | null;
  emailSource: string | null;
  aiNotes: string | null;
  priorityScore: number | null;
  enrichedAt: string | null;
}

/** Vue de l'onglet Prospects : tout un verdict, ou les lignes récentes. */
export type ProspectFilter =
  | "all"
  | "qualified"
  | "pending"
  | "no_email"
  | "has_digital_menu"
  | "not_worth";

export type ProspectCounts = Record<Exclude<ProspectFilter, "all">, number>;

export type VariantStatus = "baseline" | "active" | "candidate" | "retired";

export interface OutreachVariant {
  id: string;
  name: string;
  hypothesis: string;
  promptRules: string;
  status: VariantStatus;
  parentVariantId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Compteurs globaux de la campagne, indépendants de la fenêtre de chargement. */
export interface OutreachStats {
  /** E-mails à froid partis. */
  sent: number;
  /** Restaurants ayant répondu (hors rebonds). */
  responded: number;
  /** Restaurants dont la réponse est intéressée, RDV ou question. */
  positive: number;
}

/** Taux de réponse d'un jeu de règles, mesuré par le run autoresearch. */
export interface VariantPerformance {
  /** null = règles par défaut codées dans le backend. */
  id: string | null;
  name: string;
  status: VariantStatus;
  sent: number;
  responded: number;
}

/** Run autoresearch abouti (stats JSON de outreach_runs, voir services/autoresearch.py). */
export interface ResearchRun {
  id: string;
  startedAt: string;
  analyzed: number;
  findings: {
    responsePatterns: string[];
    emailQualityInsights: string[];
    inputDataPatterns: string[];
    promptRecommendations: string[];
  };
  variantPerformance: VariantPerformance[];
}
