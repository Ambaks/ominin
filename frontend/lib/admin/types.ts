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
