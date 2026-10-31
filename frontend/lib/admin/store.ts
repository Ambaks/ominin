"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { must } from "@/lib/supabase/result";
import { adminLoginPath } from "./base-path";
import { APPOINTMENTS_WINDOW_DAYS } from "./constants";
import { addDays, dayStart } from "./format";
import {
  LEAD_LITE_SELECT,
  rowToAppointment,
  rowToLeadLite,
  rowToTask,
} from "./mappers";
import type { Product } from "./products";
import type { AdminState, LeadLite } from "./types";

/*
 * Store du CRM (pattern lib/gestion/store.ts) : les tâches ouvertes, les RDV à
 * venir, et les fiches déjà rencontrées (ensureLead). Les listes et le pipeline
 * lisent la base page par page (leads-page) et se relisent quand `revision`
 * change ; le détail d'une fiche vit dans lead-cache. Pas de realtime : 1-2
 * utilisateurs internes, les mutations d'api.ts répercutent leurs écritures.
 */

let state: AdminState | null = null;
let loadStarted = false;
let loadError: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/** Plafond max-rows de PostgREST chez Supabase : au-delà, paginer. */
const FETCH_PAGE_SIZE = 1000;

async function fetchAll<Row>(
  page: (
    from: number,
    to: number
  ) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += FETCH_PAGE_SIZE) {
    const { data, error } = await page(from, from + FETCH_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < FETCH_PAGE_SIZE) return rows;
  }
}

/*
 * Chaque tri de pagination se termine par .order("id") : sans clé unique,
 * l'ordre des ex æquo n'est pas garanti entre deux requêtes .range() et une
 * ligne peut apparaître sur deux pages — ou sur aucune.
 */
const WITH_RESTAURANT = "*, crm_restaurants(name, lead:crm_leads(target_products))" as const;

function restaurantOf(row: {
  crm_restaurants: { name: string; lead: { target_products: Product[] } | null } | null;
}) {
  return {
    restaurantName: row.crm_restaurants?.name,
    targetProducts: row.crm_restaurants?.lead?.target_products,
  };
}

function fetchOpenTasks() {
  const supabase = createClient();
  return fetchAll((from, to) =>
    supabase
      .from("crm_tasks")
      .select(WITH_RESTAURANT)
      .eq("status", "open")
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("id")
      .range(from, to)
  ).then((rows) => rows.map((row) => ({ ...rowToTask(row), ...restaurantOf(row) })));
}

function fetchUpcomingAppointments() {
  const supabase = createClient();
  const today = dayStart();
  return fetchAll((from, to) =>
    supabase
      .from("crm_appointments")
      .select(WITH_RESTAURANT)
      .eq("status", "scheduled")
      .gte("start_at", today.toISOString())
      .lte("start_at", addDays(today, APPOINTMENTS_WINDOW_DAYS).toISOString())
      .order("start_at", { ascending: true })
      .order("id")
      .range(from, to)
  ).then((rows) => rows.map((row) => ({ ...rowToAppointment(row), ...restaurantOf(row) })));
}

async function fetchPendingDraftCount(): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("outreach_emails")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_approval");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function load(): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!user) {
    window.location.assign(adminLoginPath());
    return;
  }

  // Hors allowlist, RLS renverrait des listes vides : un refus explicite vaut
  // mieux qu'un CRM qui paraît simplement désert.
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError) throw new Error(adminError.message);
  if (!isAdmin) {
    throw new Error(
      "Ce compte n'est pas dans l'allowlist admin. Ajoutez-le à admin_users (dashboard Supabase) puis réessayez."
    );
  }

  const [tasks, appointments, pendingDrafts] = await Promise.all([
    fetchOpenTasks(),
    fetchUpcomingAppointments(),
    fetchPendingDraftCount(),
  ]);

  state = { userId: user.id, leads: [], revision: 0, tasks, appointments, pendingDrafts };
  notify();
}

function startLoad() {
  loadStarted = true;
  loadError = null;
  notify();
  load().catch((error) => {
    console.error("Chargement du CRM impossible :", error);
    loadError =
      error instanceof Error ? error.message : "Une erreur est survenue.";
    // Autorise un nouvel essai via retryLoad().
    loadStarted = false;
    notify();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loadStarted && !state) startLoad();
  return () => {
    listeners.delete(listener);
  };
}

export function retryLoad() {
  if (loadStarted || state) return;
  startLoad();
  notify();
}

const getClientSnapshot = (): AdminState | null => state;

// Référence stable exigée par useSyncExternalStore côté serveur.
const getServerSnapshot = (): AdminState | null => null;

const getErrorSnapshot = (): string | null => loadError;

/** Message d'échec du chargement initial, ou null. */
export function useAdminLoadError(): string | null {
  return useSyncExternalStore(subscribe, getErrorSnapshot, () => null);
}

/** État courant — réservé aux mutations d'api.ts, après chargement. */
export function getState(): AdminState {
  if (!state) throw new Error("CRM non chargé.");
  return state;
}

export function commit(next: AdminState) {
  state = { ...next, revision: next.revision + 1 };
  notify();
}

/** État complet, ou null côté serveur / avant chargement (⇒ squelette). */
export function useAdmin(): AdminState | null {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

/** Les listes se relisent (après un import CSV en masse). */
export function reloadLeads() {
  if (state) commit(state);
}

const leadsOnTheWay = new Map<string, Promise<LeadLite>>();

/** La fiche légère d'un restaurant : celle du store, sinon lue une fois. */
export function ensureLead(restaurantId: string): Promise<LeadLite> {
  const known = state?.leads.find((lead) => lead.restaurantId === restaurantId);
  if (known) return Promise.resolve(known);
  const onTheWay = leadsOnTheWay.get(restaurantId);
  if (onTheWay) return onTheWay;
  const request = (async () => {
    const lite = rowToLeadLite(
      must(
        await createClient()
          .from("crm_restaurants")
          .select(LEAD_LITE_SELECT)
          .eq("id", restaurantId)
          .single()
      )
    );
    if (!lite) throw new Error("Restaurant introuvable.");
    if (state) {
      state = { ...state, leads: [...state.leads, lite] };
      notify();
    }
    return lite;
  })().finally(() => leadsOnTheWay.delete(restaurantId));
  leadsOnTheWay.set(restaurantId, request);
  return request;
}

/** La fiche d'un restaurant pour un écran, chargée au besoin (null d'ici là). */
export function useLeadLite(restaurantId: string | null | undefined): LeadLite | null {
  const current = useAdmin();
  const lead = current?.leads.find((row) => row.restaurantId === restaurantId) ?? null;
  const ready = current !== null;
  useEffect(() => {
    if (ready && restaurantId && !lead) void ensureLead(restaurantId).catch(console.error);
  }, [ready, restaurantId, lead]);
  return lead;
}

/** Recompte les brouillons en attente (badge Prospection) — appelé par la
 * page Prospection à son chargement et après chaque approbation/rejet. */
export async function refreshPendingDrafts(): Promise<void> {
  if (!state) return;
  const pendingDrafts = await fetchPendingDraftCount();
  if (state) {
    state = { ...state, pendingDrafts };
    notify();
  }
}
