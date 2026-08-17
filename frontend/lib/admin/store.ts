"use client";

import { useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { adminLoginPath } from "./base-path";
import { APPOINTMENTS_WINDOW_DAYS } from "./constants";
import { addDays, dayStart } from "./format";
import {
  LEAD_LITE_SELECT,
  rowToAppointment,
  rowToLeadLite,
  rowToTask,
} from "./mappers";
import type { AdminState } from "./types";

/*
 * Store du CRM (pattern lib/gestion/store.ts) : snapshot global des lignes
 * légères — tous les restaurants+leads, les tâches ouvertes et les RDV à
 * venir. Carte, listes et pipeline filtrent en mémoire ; le détail d'une
 * fiche vit dans lead-cache. Pas de realtime : 1-2 utilisateurs internes,
 * les mutations d'api.ts répercutent leurs écritures sur le snapshot.
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
function fetchLeads() {
  const supabase = createClient();
  return fetchAll((from, to) =>
    supabase
      .from("crm_restaurants")
      .select(LEAD_LITE_SELECT)
      .is("deleted_at", null)
      .order("name")
      .order("id")
      .range(from, to)
  ).then((rows) => rows.map(rowToLeadLite).filter((row) => row !== null));
}

function fetchOpenTasks() {
  const supabase = createClient();
  return fetchAll((from, to) =>
    supabase
      .from("crm_tasks")
      .select("*")
      .eq("status", "open")
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("id")
      .range(from, to)
  ).then((rows) => rows.map(rowToTask));
}

function fetchUpcomingAppointments() {
  const supabase = createClient();
  const today = dayStart();
  return fetchAll((from, to) =>
    supabase
      .from("crm_appointments")
      .select("*")
      .eq("status", "scheduled")
      .gte("start_at", today.toISOString())
      .lte("start_at", addDays(today, APPOINTMENTS_WINDOW_DAYS).toISOString())
      .order("start_at", { ascending: true })
      .order("id")
      .range(from, to)
  ).then((rows) => rows.map(rowToAppointment));
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

  const [leads, tasks, appointments] = await Promise.all([
    fetchLeads(),
    fetchOpenTasks(),
    fetchUpcomingAppointments(),
  ]);

  state = { userId: user.id, leads, tasks, appointments };
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
  state = next;
  notify();
}

/** État complet, ou null côté serveur / avant chargement (⇒ squelette). */
export function useAdmin(): AdminState | null {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

/** Recharge les lignes légères (après un import CSV en masse). */
export async function reloadLeads(): Promise<void> {
  if (!state) return;
  const leads = await fetchLeads();
  if (state) {
    state = { ...state, leads };
    notify();
  }
}
