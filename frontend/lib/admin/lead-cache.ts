"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { must } from "@/lib/supabase/result";
import {
  rowToActivity,
  rowToAppointment,
  rowToContact,
  rowToLead,
  rowToRestaurant,
  rowToTask,
} from "./mappers";
import type { LeadDetail } from "./types";

/*
 * Cache des fiches : le détail d'un restaurant (activités, contacts, tâches,
 * RDV) se charge à l'ouverture du panneau et reste en mémoire. Les mutations
 * d'api.ts le corrigent en place (patchDetail) ou déclenchent un
 * rafraîchissement de fond (refreshDetail) quand le serveur a écrit des
 * choses qu'on ne connaît pas, comme l'activité posée par le trigger de
 * changement de statut.
 */

const cache = new Map<string, LeadDetail>();
const pending = new Set<string>();
const errors = new Map<string, string>();
const listeners = new Set<() => void>();
/*
 * Jeton de fraîcheur par fiche : un refreshDetail dont la réponse arrive
 * après un patchDetail (ou un refresh plus récent) est périmé et jeté —
 * sinon dernier-arrivé-gagne écraserait des données plus fraîches.
 */
const freshness = new Map<string, number>();

function notify() {
  for (const listener of listeners) listener();
}

async function fetchDetail(restaurantId: string): Promise<LeadDetail> {
  const supabase = createClient();
  const row = must(
    await supabase
      .from("crm_restaurants")
      .select(
        "*, lead:crm_leads(*), contacts:crm_contacts(*), activities:crm_activities(*), tasks:crm_tasks(*), appointments:crm_appointments(*)"
      )
      .eq("id", restaurantId)
      .single()
  );
  if (!row.lead) throw new Error("Fiche sans lead associé.");
  return {
    restaurant: rowToRestaurant(row),
    lead: rowToLead(row.lead),
    contacts: row.contacts
      .map(rowToContact)
      .sort((a, b) => Number(b.isDecisionMaker) - Number(a.isDecisionMaker)),
    activities: row.activities
      .map(rowToActivity)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    tasks: row.tasks
      .map(rowToTask)
      .sort(
        (a, b) =>
          Number(a.status !== "open") - Number(b.status !== "open") ||
          (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999")
      ),
    appointments: row.appointments
      .map(rowToAppointment)
      .sort((a, b) => b.startAt.localeCompare(a.startAt)),
  };
}

function startFetch(restaurantId: string) {
  if (pending.has(restaurantId)) return;
  pending.add(restaurantId);
  errors.delete(restaurantId);
  notify();
  fetchDetail(restaurantId)
    .then((detail) => {
      cache.set(restaurantId, detail);
    })
    .catch((error) => {
      console.error("Chargement de la fiche impossible :", error);
      errors.set(
        restaurantId,
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    })
    .finally(() => {
      pending.delete(restaurantId);
      notify();
    });
}

/** Corrige une fiche en cache (mutations dont on connaît l'effet exact). */
export function patchDetail(
  restaurantId: string,
  recipe: (draft: LeadDetail) => void
): void {
  const current = cache.get(restaurantId);
  if (!current) return;
  freshness.set(restaurantId, (freshness.get(restaurantId) ?? 0) + 1);
  const draft = structuredClone(current);
  recipe(draft);
  cache.set(restaurantId, draft);
  notify();
}

/**
 * Rafraîchit une fiche en arrière-plan (l'ancienne reste affichée) — pour les
 * mutations qui déclenchent des écritures serveur invisibles d'ici.
 */
export function refreshDetail(restaurantId: string): void {
  if (!cache.has(restaurantId)) return;
  const token = (freshness.get(restaurantId) ?? 0) + 1;
  freshness.set(restaurantId, token);
  fetchDetail(restaurantId)
    .then((detail) => {
      if (freshness.get(restaurantId) !== token) return;
      cache.set(restaurantId, detail);
      notify();
    })
    .catch((error) => {
      console.error("Rafraîchissement de la fiche impossible :", error);
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface LeadDetailState {
  detail: LeadDetail | null;
  error: string | null;
  retry: () => void;
}

export function useLeadDetail(restaurantId: string | null): LeadDetailState {
  const detail = useSyncExternalStore(
    subscribe,
    () => (restaurantId ? (cache.get(restaurantId) ?? null) : null),
    () => null
  );
  const error = useSyncExternalStore(
    subscribe,
    () => (restaurantId ? (errors.get(restaurantId) ?? null) : null),
    () => null
  );

  useEffect(() => {
    if (restaurantId && !cache.has(restaurantId) && !errors.has(restaurantId)) {
      startFetch(restaurantId);
    }
  }, [restaurantId]);

  return {
    detail,
    error,
    retry: () => {
      if (restaurantId) startFetch(restaurantId);
    },
  };
}
