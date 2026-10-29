"use client";

import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";

/*
 * Appels de l'espace commercial : uniquement les fonctions commercial_* de la
 * base (security definer), qui vérifient l'accès et ne servent que ce que le
 * commercial a le droit de voir. Les fonctions qui rendent du jsonb sont
 * typées ici, d'après leur définition SQL (migration 20261028000003).
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
  declaration_cap: number | null;
  cooldown_days: number | null;
  note_max: number | null;
}

const db = () => createClient();

async function call<T>(promise: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data as T;
}

/** Envoie les e-mails du contrat que le geste vient de mettre en file (espace et admin). */
export const flushEmails = (): Promise<void> =>
  fetch("/api/commercial/envois", { method: "POST" }).then(
    () => undefined,
    () => undefined
  );

export const createRestaurant = (input: Record<string, string | number | undefined>) =>
  call<string>(db().rpc("commercial_create_restaurant", { p: input as Json }));

export const resign = () => call<string>(db().rpc("commercial_resign"));

/** commercial_map() : un restaurant de la carte et son état (migration 20261029000002). */
export interface MapRestaurant {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  state: "free" | "visited" | "client";
  /** Prénom du commercial qui l'a visité. */
  holder: string | null;
  mine: boolean;
  contacted_by_lea: boolean;
  /** Sa demande de visite sur ce restaurant : en attente, ou refusée jusqu'à request_ends. */
  request: "pending" | "refused" | null;
  request_ends: string | null;
}

export const mapRestaurants = () => call<MapRestaurant[]>(db().rpc("commercial_map"));

/** commercial_dashboard() : un restaurant visité ou inscrit par le commercial (migration 20261029000008). */
export interface DashboardRestaurant {
  id: string;
  name: string;
  at: string;
  status: "signed" | "waiting" | "not_interested" | "absent";
  /** En attente : ce qui manque pour qu'il soit client. */
  missing: ("account" | "stripe" | "hubrise")[] | null;
  commission_from: string | null;
  commission_until: string | null;
  earned_cents: number | null;
  month_cents: number | null;
}

export interface Dashboard {
  percent: number;
  term_months: number;
  restaurants: DashboardRestaurant[];
}

export const dashboard = () => call<Dashboard>(db().rpc("commercial_dashboard"));

/** commercial_restaurant_recap() : ce que le commercial a récupéré sur un restaurant (migration 20261029000015). */
export interface RestaurantRecap {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  visits: {
    at: string;
    outcome: "not_interested" | "absent";
    reason: "price" | "tool" | "time" | "other" | null;
    note: string | null;
    contact_name: string | null;
    contact_phone: string | null;
    contact_email: string | null;
  }[];
  signup: {
    id: string;
    at: string;
    kind: string | null;
    account: boolean;
    manager_name: string | null;
    manager_phone: string | null;
    manager_email: string | null;
    photos: number;
    finished_at: string | null;
    stripe: boolean;
    hubrise: boolean;
    stripe_later: boolean;
    hubrise_later: boolean;
  } | null;
  client: { commission_from: string; commission_until: string } | null;
}

export type PushEventKey = "relance" | "demo" | "inscription" | "expiration" | "releve" | "opposition";

export const setPushPrefs = (prefs: Partial<Record<PushEventKey, boolean>>) =>
  call<null>(db().rpc("commercial_set_push_prefs", { p_prefs: prefs as Json }));

export interface MonthLine {
  client_id: string;
  restaurant_id: string;
  name: string;
  menu_cents: number;
  shop_cents: number;
  club_cents: number;
  invoice_cents: number;
  base_cents: number;
  commission_cents: number;
}

export interface Statement {
  id: string;
  month: string;
  lines: MonthLine[];
  adjustments: { label: string; cents: number; month?: string; auto: boolean }[];
  total_cents: number;
  status: "sent" | "invoiced" | "paid";
  sent_at: string;
  invoice_path: string | null;
  invoice_received_at: string | null;
  payment_due: string | null;
  paid_at: string | null;
  detail_requested_at: string | null;
  detail_due: string | null;
  detail_sent_at: string | null;
  contested_at: string | null;
  contest_note: string | null;
  contest_resolved_at: string | null;
  contest_resolution: string | null;
  contest_until: string;
}

export interface Money {
  estimate: { month: string; percent: number; lines: MonthLine[] };
  statements: Statement[];
  next_detail_at: string | null;
  urssaf_due: boolean;
  documents: { kind: "sirene" | "urssaf"; uploaded_at: string }[];
}

export const money = () => call<Money>(db().rpc("commercial_money"));

/**
 * Fichier déposé dans commercial-docs/<commercial>/<dossier>/ (lecture :
 * titulaire et admins), sous un nom propre à ce dépôt : une pièce reçue ne
 * se remplace jamais (aucune réécriture dans le stockage).
 */
async function upload(commercialId: string, folder: "factures" | "pieces", name: string, file: File) {
  const path = `${commercialId}/${folder}/${name}-${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const { error } = await db().storage.from("commercial-docs").upload(path, file);
  if (error) throw new Error(error.message);
  return path;
}

export async function sendInvoice(commercialId: string, statementId: string, file: File) {
  const path = await upload(commercialId, "factures", statementId, file);
  await call<null>(db().rpc("commercial_statement_invoice", { p_statement: statementId, p_path: path }));
}

export const requestDetail = (statementId: string) =>
  call<string>(db().rpc("commercial_request_detail", { p_statement: statementId }));

export const contest = (statementId: string, note: string) =>
  call<null>(db().rpc("commercial_contest", { p_statement: statementId, p_note: note }));

export async function addDocument(commercialId: string, kind: "sirene" | "urssaf", file: File) {
  const path = await upload(commercialId, "pieces", kind, file);
  await call<null>(db().rpc("commercial_add_document", { p_kind: kind, p_path: path }));
}
