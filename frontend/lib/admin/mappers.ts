import type { Json, Tables } from "@/lib/supabase/database.types";
import { normalizeText } from "./format";
import type {
  Activity,
  AppointmentRow,
  Contact,
  Lead,
  LeadLite,
  Restaurant,
  TaskRow,
} from "./types";

/*
 * Conversions lignes Postgres → domaine (convention lib/gestion/mappers.ts).
 * Les projections partagées vivent ici pour que store, cache et api
 * construisent les mêmes lignes.
 */

/** Les colonnes jsonb veulent le type Json généré ; les objets métier
 * (coordonnées GPS…) y passent par cette conversion explicite. */
export const toJson = (value: unknown): Json => value as Json;

/** Projection de la ligne légère — voir LeadLite. */
export const LEAD_LITE_SELECT =
  "id, name, category, city, address, latitude, longitude, phone, email, website, owner_name, created_at, lead:crm_leads(id, status, priority, last_contact_at, next_follow_up_at)" as const;

interface LeadLiteJoinRow {
  id: string;
  name: string;
  category: Restaurant["category"];
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  owner_name: string | null;
  created_at: string;
  lead: {
    id: string;
    status: Lead["status"];
    priority: Lead["priority"];
    last_contact_at: string | null;
    next_follow_up_at: string | null;
  } | null;
}

export function rowToLeadLite(row: LeadLiteJoinRow): LeadLite | null {
  // Le trigger crée le lead avec le restaurant ; null = ligne incohérente,
  // ignorée plutôt que de faire tomber tout le chargement.
  if (!row.lead) return null;
  return {
    restaurantId: row.id,
    leadId: row.lead.id,
    name: row.name,
    category: row.category,
    city: row.city,
    address: row.address,
    lat: row.latitude,
    lng: row.longitude,
    status: row.lead.status,
    priority: row.lead.priority,
    phone: row.phone,
    email: row.email,
    hasWebsite: Boolean(row.website),
    ownerName: row.owner_name,
    lastContactAt: row.lead.last_contact_at,
    nextFollowUpAt: row.lead.next_follow_up_at,
    createdAt: row.created_at,
    searchKey: normalizeText(
      [row.name, row.city, row.address, row.phone, row.email, row.owner_name]
        .filter(Boolean)
        .join(" ")
    ),
  };
}

export function rowToRestaurant(row: Tables<"crm_restaurants">): Restaurant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    cuisine: row.cuisine,
    address: row.address,
    city: row.city,
    postalCode: row.postal_code,
    latitude: row.latitude,
    longitude: row.longitude,
    phone: row.phone,
    email: row.email,
    website: row.website,
    menuUrl: row.menu_url,
    googleMapsUrl: row.google_maps_url,
    instagramUrl: row.instagram_url,
    source: row.source,
    ownerName: row.owner_name,
    ownerPhone: row.owner_phone,
    ownerEmail: row.owner_email,
    importantNotes: row.important_notes,
    createdAt: row.created_at,
  };
}

export function rowToLead(row: Tables<"crm_leads">): Lead {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    status: row.status,
    priority: row.priority,
    estimatedValue: row.estimated_value,
    lastContactAt: row.last_contact_at,
    nextFollowUpAt: row.next_follow_up_at,
    lostReason: row.lost_reason,
    createdAt: row.created_at,
  };
}

export function rowToActivity(row: Tables<"crm_activities">): Activity {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export function rowToContact(row: Tables<"crm_contacts">): Contact {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    isDecisionMaker: row.is_decision_maker,
  };
}

export function rowToTask(row: Tables<"crm_tasks">): TaskRow {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    leadId: row.lead_id,
    title: row.title,
    description: row.description,
    dueAt: row.due_at,
    priority: row.priority,
    status: row.status,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export function rowToAppointment(
  row: Tables<"crm_appointments">
): AppointmentRow {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    contactId: row.contact_id,
    title: row.title,
    startAt: row.start_at,
    endAt: row.end_at,
    location: row.location,
    notes: row.notes,
    status: row.status,
    type: row.type,
  };
}
