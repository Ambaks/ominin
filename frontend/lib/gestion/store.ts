"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { must } from "@/lib/supabase/result";
import {
  assembleCategories,
  assembleGroups,
  rowToEtablissement,
  rowToFormule,
  rowToOrder,
  rowToTable,
} from "./mappers";
import { can, hasFeature } from "./permissions";
import type { Action, Feature, GestionState, Offre, Role } from "./types";

type Client = SupabaseClient<Database>;

let state: GestionState | null = null;
let loadStarted = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

async function fetchOrders(supabase: Client, etablissementId: string) {
  const rows = must(
    await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("etablissement_id", etablissementId)
      .order("created_at", { ascending: true })
  );
  return rows.map(rowToOrder);
}

/*
 * Refetch des commandes sur événement realtime, coalescé : un refetch en
 * vol absorbe les événements suivants au lieu d'empiler les requêtes.
 */
let refreshing = false;
let refreshQueued = false;

async function refreshOrders(supabase: Client, etablissementId: string) {
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

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("etablissement_id, role")
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
        .select("status")
        .eq("etablissement_id", etablissementId)
        .maybeSingle()
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

  state = {
    etablissement: rowToEtablissement(etablissement),
    subscriptionStatus: subscription?.status ?? null,
    role: membership.role,
    categories: assembleCategories(categories, items),
    formules: formules.map(rowToFormule),
    tables: tables.map(rowToTable),
    groups: assembleGroups(groups, tables),
    orders,
  };
  notify();

  subscribeOrders(supabase, etablissementId);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loadStarted) {
    loadStarted = true;
    load().catch((error) => {
      console.error("Chargement de l'espace de gestion impossible :", error);
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

const getClientSnapshot = (): GestionState | null => state;

// Référence stable exigée par useSyncExternalStore côté serveur.
const getServerSnapshot = (): GestionState | null => null;

/** État courant — réservé aux mutations d'api.ts, après chargement. */
export function getState(): GestionState {
  if (!state) throw new Error("Espace de gestion non chargé.");
  return state;
}

export function commit(next: GestionState) {
  state = next;
  notify();
}

/** Relit le statut d'abonnement (retour de Stripe Checkout, avant webhook). */
export async function refreshSubscription(): Promise<void> {
  if (!state) return;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("etablissement_id", state.etablissement.id)
    .maybeSingle();
  if (error) return;
  const status = data?.status ?? null;
  if (state && state.subscriptionStatus !== status) {
    state = { ...state, subscriptionStatus: status };
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
    can: (action) => can(role, action),
    hasFeature: (feature) => hasFeature(offre, feature),
  };
}
