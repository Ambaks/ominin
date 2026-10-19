"use client";

import { useSyncExternalStore } from "react";
import { CLIENT_PERIOD_DAYS } from "@/lib/admin/constants";
import {
  fetchOverview,
  fetchShopClients,
  periodOf,
  type Period,
} from "@/lib/admin/metrics";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { check, must } from "@/lib/supabase/result";
import type { Product } from "./products";

/*
 * Section Projet : les clients à interfacer, un par un, et les chantiers qui
 * restent pour finir chaque offre. Tables projet_* (admins seuls) ; la
 * pipeline type d'un client est définie en base (projet_add_client).
 * Chargé une fois à l'ouverture de la section ; chaque modification est
 * appliquée tout de suite à l'écran puis écrite, et défaite si l'écriture
 * échoue.
 */

type Tables = Database["public"]["Tables"];
export type ProjetClient = Tables["projet_clients"]["Row"];
export type Chantier = Tables["projet_chantiers"]["Row"];
export type Step = Tables["projet_steps"]["Row"];
export type StepStatus = Database["public"]["Enums"]["projet_step_status"];
export {
  ASSIGNEE_LABELS,
  ASSIGNEES,
  isAssignedTo,
  isAssignee,
  OWNER_LABELS,
  OWNERS,
  ownersOf,
  type Owner,
} from "./owners";

export const STATUS_LABELS: Record<StepStatus, string> = {
  todo: "À faire",
  doing: "En cours",
  done: "Fait",
  blocked: "Bloqué",
};
/** Un clic sur une étape la fait avancer ; « bloqué » se pose à part. */
export const NEXT_STATUS: Record<StepStatus, StepStatus> = {
  todo: "doing",
  doing: "done",
  done: "todo",
  blocked: "doing",
};

/** Ce qu'un client en service rapporte : depuis toujours, et sur 30 jours. */
export interface ClientFigures {
  revenue: number;
  commission: number;
  orders: number;
  revenue30: number;
  commission30: number;
  orders30: number;
}

export interface ProjetData {
  clients: ProjetClient[];
  chantiers: Chantier[];
  steps: Step[];
  /** Par client lié à un établissement ou une boutique. */
  figures: Map<string, ClientFigures>;
  places: Place[];
}

/** Ce qu'on relie à un client pour lire ses chiffres. */
export interface Place {
  kind: "etablissement" | "shop";
  id: string;
  name: string;
}

async function loadFigures(
  clients: ProjetClient[],
): Promise<Pick<ProjetData, "figures" | "places">> {
  const allTime: Period = {
    from: new Date(0).toISOString(),
    to: new Date().toISOString(),
  };
  // La période par défaut des synthèses Clients.
  const recent = periodOf(CLIENT_PERIOD_DAYS[1]);
  const [menuAll, menu30, shopAll, shop30] = await Promise.all([
    fetchOverview(allTime),
    fetchOverview(recent),
    fetchShopClients(allTime),
    fetchShopClients(recent),
  ]);
  const figures = new Map<string, ClientFigures>();
  for (const client of clients) {
    if (client.etablissement_id) {
      const all = menuAll.find((row) => row.etablissement_id === client.etablissement_id);
      const last = menu30.find((row) => row.etablissement_id === client.etablissement_id);
      if (all) {
        figures.set(client.id, {
          revenue: all.revenue,
          commission: all.commission,
          orders: all.orders_count,
          revenue30: last?.revenue ?? 0,
          commission30: last?.commission ?? 0,
          orders30: last?.orders_count ?? 0,
        });
      }
    } else if (client.shop_id) {
      const all = shopAll.find((row) => row.shop_id === client.shop_id);
      const last = shop30.find((row) => row.shop_id === client.shop_id);
      if (all) {
        figures.set(client.id, {
          revenue: all.revenue_cents / 100,
          commission: all.fee_cents / 100,
          orders: all.paid_orders,
          revenue30: (last?.revenue_cents ?? 0) / 100,
          commission30: (last?.fee_cents ?? 0) / 100,
          orders30: last?.paid_orders ?? 0,
        });
      }
    }
  }
  const places: Place[] = [
    ...menuAll.map((row) => ({
      kind: "etablissement" as const,
      id: row.etablissement_id,
      name: row.name,
    })),
    ...shopAll.map((row) => ({ kind: "shop" as const, id: row.shop_id, name: row.name })),
  ];
  return { figures, places };
}

async function fetchProjet(): Promise<ProjetData> {
  const sb = createClient();
  const [clients, chantiers, steps] = await Promise.all([
    sb.from("projet_clients").select("*").order("created_at").then(must),
    sb.from("projet_chantiers").select("*").order("position").then(must),
    sb.from("projet_steps").select("*").order("position").then(must),
  ]);
  return { clients, chantiers, steps, ...(await loadFigures(clients)) };
}

// ---------------------------------------------------------------------------
// Lectures

export function clientSteps(data: ProjetData, clientId: string): Step[] {
  return data.steps.filter((step) => step.client_id === clientId);
}

export function chantierSteps(data: ProjetData, chantierId: string): Step[] {
  return data.steps.filter((step) => step.chantier_id === chantierId);
}

/** L'étape où en est le client : la première qui n'est pas faite. */
export function currentStep(steps: Step[]): Step | null {
  return steps.find((step) => step.status !== "done") ?? null;
}

export function progress(steps: Step[]): { done: number; total: number } {
  return {
    done: steps.filter((step) => step.status === "done").length,
    total: steps.length,
  };
}

/** Ce que montre la vue d'un produit ; les chantiers transverses partout. */
export function selectProjetFor(
  data: ProjetData,
  product: Product | null,
): Pick<ProjetData, "clients" | "chantiers"> {
  if (!product) return data;
  return {
    clients: data.clients.filter((client) => client.product === product),
    chantiers: data.chantiers.filter(
      (chantier) => chantier.product === null || chantier.product === product,
    ),
  };
}

// ---------------------------------------------------------------------------
// Store

interface ProjetState {
  data: ProjetData | null;
  error: string | null;
  loading: boolean;
}

let state: ProjetState = { data: null, error: null, loading: false };
const listeners = new Set<() => void>();

function set(next: Partial<ProjetState>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Une erreur est survenue.";

export async function reloadProjet(): Promise<void> {
  if (state.loading) return;
  set({ loading: true, error: null });
  try {
    set({ data: await fetchProjet(), loading: false });
  } catch (error) {
    set({ loading: false, error: message(error) });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!state.data && !state.loading && !state.error) void reloadProjet();
  return () => {
    listeners.delete(listener);
  };
}

const serverState: ProjetState = { data: null, error: null, loading: false };

export function useProjet(): ProjetState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => serverState,
  );
}

/** Applique un changement à l'écran, l'écrit, et le défait s'il échoue. */
async function optimistic(
  apply: (data: ProjetData) => ProjetData,
  write: () => Promise<void>,
): Promise<void> {
  const before = state.data;
  if (!before) return;
  set({ data: apply(before) });
  try {
    await write();
  } catch (error) {
    set({ data: before });
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Écritures

/** Fait sonner ce que le changement mérite (best effort : jamais bloquant). */
function notify(stepId: string, event: "assigned" | "blocked" | "done") {
  void fetch("/api/admin/push/projet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stepId, event }),
  }).catch(() => {});
}

export async function updateStep(
  id: string,
  patch: Partial<Pick<Step, "status" | "owner" | "title" | "detail">>,
): Promise<void> {
  await optimistic(
    (data) => ({
      ...data,
      steps: data.steps.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    }),
    async () =>
      check(await createClient().from("projet_steps").update(patch).eq("id", id)),
  );
  if (patch.owner) notify(id, "assigned");
  if (patch.status === "blocked") notify(id, "blocked");
  if (patch.status === "done") notify(id, "done");
}

export async function addStep(
  owner: { client_id: string; phase: string } | { chantier_id: string },
  title: string,
): Promise<void> {
  if (!state.data) return;
  const siblings = state.data.steps.filter((step) =>
    "client_id" in owner
      ? step.client_id === owner.client_id
      : step.chantier_id === owner.chantier_id,
  );
  const position = Math.max(0, ...siblings.map((step) => step.position)) + 1;
  const step = await createClient()
    .from("projet_steps")
    .insert({ ...owner, title, position })
    .select("*")
    .single()
    .then(must);
  if (state.data) set({ data: { ...state.data, steps: [...state.data.steps, step] } });
}

export function deleteStep(id: string): Promise<void> {
  return optimistic(
    (data) => ({ ...data, steps: data.steps.filter((step) => step.id !== id) }),
    async () => check(await createClient().from("projet_steps").delete().eq("id", id)),
  );
}

export function updateClientNotes(id: string, notes: string): Promise<void> {
  return optimistic(
    (data) => ({
      ...data,
      clients: data.clients.map((client) =>
        client.id === id ? { ...client, notes } : client,
      ),
    }),
    async () =>
      check(await createClient().from("projet_clients").update({ notes }).eq("id", id)),
  );
}

export async function addClient(input: {
  name: string;
  product: Product;
  etablissementId: string | null;
  shopId: string | null;
}): Promise<string> {
  const id = await createClient()
    .rpc("projet_add_client", {
      p_name: input.name,
      p_product: input.product,
      p_etablissement: input.etablissementId ?? undefined,
      p_shop: input.shopId ?? undefined,
    })
    .then(must);
  await reloadProjet();
  return id;
}

export async function deleteClient(id: string): Promise<void> {
  await optimistic(
    (data) => ({
      ...data,
      clients: data.clients.filter((client) => client.id !== id),
      steps: data.steps.filter((step) => step.client_id !== id),
    }),
    async () => check(await createClient().from("projet_clients").delete().eq("id", id)),
  );
}

export async function addChantier(
  title: string,
  product: Product | null,
): Promise<void> {
  if (!state.data) return;
  const position =
    Math.max(0, ...state.data.chantiers.map((chantier) => chantier.position)) + 1;
  const chantier = await createClient()
    .from("projet_chantiers")
    .insert({ title, product, position })
    .select("*")
    .single()
    .then(must);
  if (state.data) {
    set({ data: { ...state.data, chantiers: [...state.data.chantiers, chantier] } });
  }
}

export function deleteChantier(id: string): Promise<void> {
  return optimistic(
    (data) => ({
      ...data,
      chantiers: data.chantiers.filter((chantier) => chantier.id !== id),
      steps: data.steps.filter((step) => step.chantier_id !== id),
    }),
    async () => check(await createClient().from("projet_chantiers").delete().eq("id", id)),
  );
}
