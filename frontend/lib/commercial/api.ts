"use client";

import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import type {
  ActivityType,
  DeclarationStatus,
  EndReason,
  Product,
  RefusalReason,
  Retained,
} from "./labels";

/*
 * Appels de l'espace commercial : uniquement les fonctions commercial_* de la
 * base (security definer), qui vérifient l'accès et ne servent que ce que le
 * commercial a le droit de voir. Les fonctions qui rendent du jsonb sont
 * typées ici, d'après leur définition SQL (migration 20261026000003).
 */

/** commercial_account() : ce que l'espace affiche du compte. */
export interface CommercialAccount {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  siret: string | null;
  address: string | null;
  phone: string | null;
  signed: boolean;
  signed_in_force: boolean;
  contract_end: string | null;
  ended: boolean;
  notice_given_at: string | null;
  option_exercised_at: string | null;
  kit_demo_slugs: string[];
  note_max: number | null;
}

export interface RestaurantState {
  kind: "free" | "reserved" | "client" | "opted_out";
  in_talks: boolean;
  mine: boolean;
  pending: boolean;
  step: number | null;
  since: string | null;
}

export interface PublicRestaurant {
  id: string;
  name: string;
  category: string;
  cuisine: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  menu_url: string | null;
  google_maps_url: string | null;
  instagram_url: string | null;
  email?: string | null;
  owner_name?: string | null;
  owner_phone?: string | null;
  owner_email?: string | null;
}

export interface MyDeclaration {
  id: string;
  status: DeclarationStatus;
  declared_at: string;
  confirm_deadline: string;
  confirmed_at: string | null;
  reserved_until: string | null;
  step_done_at: Record<string, string>;
  retained: Retained;
  retained_updated_at: string | null;
}

export interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
  is_decision_maker: boolean;
}

export interface Activity {
  id: string;
  type: ActivityType;
  description: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  due_at: string | null;
  status: "open" | "done" | "cancelled";
}

export interface Appointment {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  type: string;
  status: string;
  contact_id: string | null;
}

export interface HistoryEntry {
  declared_at: string;
  ended_at: string | null;
  status: DeclarationStatus;
  end_reason: EndReason | null;
  step: number;
  mine: boolean;
  retained: Retained;
}

export interface RestaurantSheet {
  restaurant: PublicRestaurant;
  state: RestaurantState;
  products: Product[] | null;
  mine: MyDeclaration | null;
  history: HistoryEntry[];
  contacts: Contact[];
  activities: Activity[];
  tasks: Task[];
  appointments: Appointment[];
  lea: { at: string; direction: "inbound" | "outbound"; classification: string | null }[];
  steps: { position: number; title: string; detail: string }[];
  note_max: number | null;
}

export interface MyRestaurant {
  id: string;
  restaurant_id: string;
  name: string;
  address: string | null;
  city: string | null;
  status: DeclarationStatus;
  step: number;
  confirm_deadline: string;
  reserved_until: string | null;
  next_task_at: string | null;
}

export interface Today {
  appointments: {
    id: string;
    declaration_id: string;
    restaurant_id: string;
    name: string;
    title: string;
    start_at: string;
    location: string | null;
    latitude: number | null;
    longitude: number | null;
  }[];
  tasks: {
    id: string;
    declaration_id: string;
    restaurant_id: string;
    name: string;
    title: string;
    due_at: string;
    phone: string | null;
  }[];
  expiring: { declaration_id: string; restaurant_id: string; name: string; reserved_until: string }[];
  news: {
    kind: "confirmed" | "refused" | "signed" | "abandoned" | "demo_ready" | "statement";
    restaurant_id?: string;
    name?: string;
    at: string;
    tacit?: boolean;
    reason?: RefusalReason | EndReason | null;
  }[];
}

export interface SearchResult {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  category: string;
  state: RestaurantState;
  reason?: string;
}

export interface DeclareResult {
  id: string;
  status: "pending" | "refused";
  refusal_reason?: RefusalReason;
  confirm_deadline?: string;
  client_alert?: boolean;
}

export interface ContactInput {
  id?: string;
  role: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  is_decision_maker?: boolean;
}

const db = () => createClient();

async function call<T>(promise: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data as T;
}

/** Envoie les e-mails du contrat que le geste vient de mettre en file. */
export function flushEmails() {
  void fetch("/api/commercial/envois", { method: "POST" }).catch(() => undefined);
}

export const today = (since: string | null) =>
  call<Today>(db().rpc("commercial_today", { p_since: since as string }));

export const myRestaurants = () => call<MyRestaurant[]>(db().rpc("commercial_my_restaurants"));

export const search = (query: string) =>
  call<SearchResult[]>(db().rpc("commercial_search", { p_query: query }));

export const restaurant = (id: string) =>
  call<RestaurantSheet>(db().rpc("commercial_restaurant", { p_restaurant: id }));

export const findDuplicates = (input: {
  name: string;
  city?: string;
  phone?: string;
  lat?: number;
  lng?: number;
}) =>
  call<SearchResult[]>(
    db().rpc("commercial_find_duplicates", {
      p_name: input.name,
      p_city: input.city,
      p_phone: input.phone,
      p_lat: input.lat,
      p_lng: input.lng,
    })
  );

export const createRestaurant = (input: Record<string, string | number | undefined>) =>
  call<string>(db().rpc("commercial_create_restaurant", { p: input as Json }));

export async function declare(restaurantId: string, products: Product[], contact: ContactInput) {
  const result = await call<DeclareResult>(
    db().rpc("commercial_declare", {
      p_restaurant: restaurantId,
      p_products: products,
      p_contact: contact as unknown as Json,
    })
  );
  flushEmails();
  return result;
}

export const passage = (restaurantId: string, retained: Retained, reason: EndReason) =>
  call<string>(
    db().rpc("commercial_passage", {
      p_restaurant: restaurantId,
      p_retained: retained as Json,
      p_reason: reason,
    })
  );

export const abandon = (declarationId: string, reason: EndReason) =>
  call<null>(db().rpc("commercial_abandon", { p_declaration: declarationId, p_reason: reason }));

export const setStep = (declarationId: string, position: number, done: boolean) =>
  call<Record<string, string>>(
    db().rpc("commercial_set_step", { p_declaration: declarationId, p_position: position, p_done: done })
  );

export const saveRetained = (declarationId: string, retained: Retained) =>
  call<null>(
    db().rpc("commercial_save_retained", { p_declaration: declarationId, p_retained: retained as Json })
  );

export async function optOut(restaurantId: string) {
  await call<null>(db().rpc("commercial_opt_out", { p_restaurant: restaurantId }));
  flushEmails();
}

export const log = (declarationId: string, type: ActivityType, text: string) =>
  call<string>(db().rpc("commercial_log", { p_declaration: declarationId, p_type: type, p_text: text }));

export const upsertContact = (declarationId: string, contact: ContactInput) =>
  call<string>(
    db().rpc("commercial_contact_upsert", {
      p_declaration: declarationId,
      p_contact: contact as unknown as Json,
    })
  );

export const upsertTask = (
  declarationId: string,
  task: { id?: string; title?: string; due_at?: string | null; status?: Task["status"] }
) =>
  call<string>(
    db().rpc("commercial_task_upsert", { p_declaration: declarationId, p_task: task as Json })
  );

export const upsertAppointment = (
  declarationId: string,
  appointment: { id?: string; title?: string; start_at?: string; location?: string; status?: string }
) =>
  call<string>(
    db().rpc("commercial_appointment_upsert", {
      p_declaration: declarationId,
      p_appointment: appointment as Json,
    })
  );

export const resign = () => call<string>(db().rpc("commercial_resign"));
