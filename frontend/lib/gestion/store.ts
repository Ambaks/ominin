"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { must } from "@/lib/supabase/result";
import {
  ACTIVE_ORDER_STATUSES,
  ANALYTICS_PERIOD_DAYS,
  HISTORY_ORDER_STATUSES,
  HISTORY_PAGE_SIZE,
} from "./constants";
import {
  assembleCategories,
  assembleGroups,
  rowToEtablissement,
  rowToFormule,
  rowToOrder,
  rowToTable,
} from "./mappers";
import { can, hasFeature } from "./permissions";
import { dayStart } from "./selectors";
import type {
  Action,
  Feature,
  GestionState,
  Offre,
  Order,
  Role,
} from "./types";

type Client = SupabaseClient<Database>;

let state: GestionState | null = null;
let loadStarted = false;
let loadError: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/*
 * Fetch initial borné : commandes actives + celles du jour (le tableau de bord
 * ne calcule le CA et le top ventes que sur aujourd'hui). L'historique plus
 * ancien se charge à la demande via fetchOrderHistory — sinon toute l'histoire
 * serait retéléchargée à chaque montage et à chaque événement realtime.
 */
async function fetchOrders(supabase: Client, etablissementId: string) {
  // Sans borne, tout l'historique repasserait sur le réseau à chaque refetch.
  // On charge la fenêtre couvrant la plus longue période d'analytique, plus
  // les commandes encore ouvertes quel que soit leur âge.
  const since = dayStart(Math.max(...ANALYTICS_PERIOD_DAYS) - 1).toISOString();
  const rows = must(
    await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("etablissement_id", etablissementId)
      .or(
        `created_at.gte.${since},status.in.(${ACTIVE_ORDER_STATUSES.join(",")})`
      )
      .order("created_at", { ascending: true })
  );
  return rows.map(rowToOrder);
}

/** Page d'historique (commandes clôturées), curseur = created_at décroissant. */
export async function fetchOrderHistory(
  before: string | null
): Promise<{ orders: Order[]; nextCursor: string | null }> {
  const supabase = createClient();
  const etablissementId = getState().etablissement.id;
  let query = supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("etablissement_id", etablissementId)
    .in("status", HISTORY_ORDER_STATUSES)
    .order("created_at", { ascending: false })
    .limit(HISTORY_PAGE_SIZE);
  if (before) query = query.lt("created_at", before);
  const orders = must(await query).map(rowToOrder);
  const nextCursor =
    orders.length === HISTORY_PAGE_SIZE
      ? orders[orders.length - 1].createdAt
      : null;
  return { orders, nextCursor };
}

/*
 * Refetch des commandes sur événement realtime, coalescé : un refetch en
 * vol absorbe les événements suivants au lieu d'empiler les requêtes.
 */
let refreshing = false;
let refreshQueued = false;

async function refreshOrders(supabase: Client, etablissementId: string) {
  // Tant que l'état n'est pas prêt, le fetch initial fait foi.
  if (!state) return;
  if (refreshing) {
    refreshQueued = true;
    return;
  }
  refreshing = true;
  try {
    do {
      refreshQueued = false;
      const orders = await fetchOrders(supabase, etablissementId);
      if (state) {
        state = { ...state, orders };
        notify();
      }
    } while (refreshQueued);
  } catch (error) {
    console.error("Rafraîchissement des commandes impossible :", error);
  } finally {
    refreshing = false;
  }
}

function subscribeOrders(supabase: Client, etablissementId: string) {
  const onChange = () => void refreshOrders(supabase, etablissementId);
  supabase
    .channel("gestion-commandes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `etablissement_id=eq.${etablissementId}`,
      },
      onChange
    )
    // order_items n'a pas de colonne etablissement_id : RLS limite déjà les
    // événements reçus aux commandes de l'établissement du membre.
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "order_items" },
      onChange
    )
    .subscribe();
}

async function load(): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!user) {
    window.location.assign("/login");
    return;
  }

  // Filtré par user_id : la policy RLS laisse un membre lire toute l'équipe,
  // donc sans ce filtre on récupérait le plus ancien membership (le gérant)
  // au lieu de celui de l'utilisateur courant.
  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("etablissement_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (membershipError) throw new Error(membershipError.message);
  if (!membership) {
    // Connecté mais sans établissement : premier passage → onboarding.
    window.location.assign("/onboarding");
    return;
  }
  const etablissementId = membership.etablissement_id;

  // S'abonner avant le fetch initial pour réduire la fenêtre où un événement
  // realtime passerait inaperçu entre le fetch et l'abonnement.
  subscribeOrders(supabase, etablissementId);

  const [
    etablissement,
    subscription,
    categories,
    items,
    formules,
    tables,
    groups,
    orders,
  ] = await Promise.all([
      supabase
        .from("etablissements")
        .select("*")
        .eq("id", etablissementId)
        .single()
        .then(must),
      supabase
        .from("subscriptions")
        .select("product, status")
        .eq("etablissement_id", etablissementId)
        .then((result) => {
          if (result.error) throw new Error(result.error.message);
          return result.data;
        }),
      supabase
        .from("categories")
        .select("*")
        .eq("etablissement_id", etablissementId)
        .order("position", { ascending: true })
        .then(must),
      supabase
        .from("items")
        .select("*")
        .eq("etablissement_id", etablissementId)
        .order("created_at", { ascending: true })
        .then(must),
      supabase
        .from("formules")
        .select("*")
        .eq("etablissement_id", etablissementId)
        .order("created_at", { ascending: true })
        .then(must),
      supabase
        .from("tables")
        .select("*")
        .eq("etablissement_id", etablissementId)
        .order("number", { ascending: true })
        .then(must),
      supabase
        .from("table_groups")
        .select("*")
        .eq("etablissement_id", etablissementId)
        .then(must),
      fetchOrders(supabase, etablissementId),
    ]);

  const offreSub = subscription?.find((s) => s.product === "offre");
  const collectSub = subscription?.find((s) => s.product === "collect");

  state = {
    etablissement: rowToEtablissement(etablissement),
    subscriptionStatus: offreSub?.status ?? null,
    collectSubscriptionStatus: collectSub?.status ?? null,
    role: membership.role,
    categories: assembleCategories(categories, items),
    formules: formules.map(rowToFormule),
    tables: tables.map(rowToTable),
    groups: assembleGroups(groups, tables),
    orders,
  };
  notify();
}

function startLoad() {
  loadStarted = true;
  loadError = null;
  notify();
  load().catch((error) => {
    console.error("Chargement de l'espace de gestion impossible :", error);
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

const getClientSnapshot = (): GestionState | null => state;

// Référence stable exigée par useSyncExternalStore côté serveur.
const getServerSnapshot = (): GestionState | null => null;

const getErrorSnapshot = (): string | null => loadError;

/** Message d'échec du chargement initial, ou null. */
export function useGestionLoadError(): string | null {
  return useSyncExternalStore(subscribe, getErrorSnapshot, () => null);
}

/** État courant — réservé aux mutations d'api.ts, après chargement. */
export function getState(): GestionState {
  if (!state) throw new Error("Espace de gestion non chargé.");
  return state;
}

export function commit(next: GestionState) {
  state = next;
  notify();
}

/** Relit les statuts d'abonnement (retour de Stripe Checkout, avant webhook). */
export async function refreshSubscription(): Promise<void> {
  if (!state) return;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("product, status")
    .eq("etablissement_id", state.etablissement.id);
  if (error) return;
  const offreStatus = data?.find((s) => s.product === "offre")?.status ?? null;
  const collectStatus = data?.find((s) => s.product === "collect")?.status ?? null;
  if (
    state &&
    (state.subscriptionStatus !== offreStatus ||
      state.collectSubscriptionStatus !== collectStatus)
  ) {
    state = {
      ...state,
      subscriptionStatus: offreStatus,
      collectSubscriptionStatus: collectStatus,
    };
    notify();
  }
}

/** État complet, ou null côté serveur / avant chargement (⇒ squelette). */
export function useGestion(): GestionState | null {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

export interface GestionAccess {
  role: Role;
  offre: Offre;
  can: (action: Action) => boolean;
  hasFeature: (feature: Feature) => boolean;
}

export function useGestionAccess(): GestionAccess {
  const snapshot = useGestion();
  const role = snapshot?.role ?? "gerant";
  const offre = snapshot?.etablissement.offre ?? "connect";
  return {
    role,
    offre,
    // Fermé par défaut avant chargement : pas de droits tant que l'état
    // (donc le rôle réel) n'est pas connu.
    can: (action) => snapshot != null && can(role, action),
    hasFeature: (feature) => snapshot != null && hasFeature(offre, feature),
  };
}
