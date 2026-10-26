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
import type { AppointmentRow, LeadDetail, TaskRow } from "./types";

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

/** Étape la plus haute cochée d'une déclaration (step_done_at). */
const topStep = (steps: unknown) =>
  Math.max(0, ...Object.keys((steps ?? {}) as Record<string, string>).map(Number));

async function fetchDetail(restaurantId: string): Promise<LeadDetail> {
  const supabase = createClient();
  const row = must(
    await supabase
      .from("crm_restaurants")
      .select(
        "*, lead:crm_leads(*), contacts:crm_contacts(*), activities:crm_activities(*), tasks:crm_tasks(*), appointments:crm_appointments(*), etablissement:etablissements!crm_restaurants_etablissement_id_fkey(name), shop:shops!crm_restaurants_shop_id_fkey(name), declarations:commercial_declarations(id, status, declared_at, confirm_deadline, reserved_until, step_done_at, commerciaux(email, first_name, last_name))"
      )
      .eq("id", restaurantId)
      .single()
  );
  if (!row.lead) throw new Error("Fiche sans lead associé.");
  // Le travail des commerciaux (declaration_id) reste à part : l'admin ne le
  // consulte qu'en cas de litige, d'opposition ou de conflit (art. 2.3).
  const own = <T extends { declaration_id: string | null }>(rows: T[]) => rows.filter((r) => !r.declaration_id);
  const theirs = <T extends { declaration_id: string | null }>(rows: T[]) => rows.filter((r) => r.declaration_id);
  const byDate = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);
  const byDue = (a: TaskRow, b: TaskRow) =>
    Number(a.status !== "open") - Number(b.status !== "open") ||
    (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999");
  const byStart = (a: AppointmentRow, b: AppointmentRow) => b.startAt.localeCompare(a.startAt);
  const clientName = row.etablissement?.name ?? row.shop?.name;
  return {
    restaurant: rowToRestaurant(row),
    lead: rowToLead(row.lead),
    contacts: row.contacts
      .map(rowToContact)
      .sort((a, b) => Number(b.isDecisionMaker) - Number(a.isDecisionMaker)),
    activities: own(row.activities).map(rowToActivity).sort(byDate),
    tasks: own(row.tasks).map(rowToTask).sort(byDue),
    appointments: own(row.appointments).map(rowToAppointment).sort(byStart),
    client:
      clientName && (row.etablissement_id || row.shop_id)
        ? {
            kind: row.etablissement_id ? "etablissement" : "shop",
            id: (row.etablissement_id ?? row.shop_id)!,
            name: clientName,
            endedAt: row.client_ended_at,
          }
        : null,
    inTalksOverride: row.in_talks_override,
    declarations: row.declarations
      .filter((d) => d.status !== "passage")
      .map((d) => ({
        id: d.id,
        status: d.status,
        declaredAt: d.declared_at,
        confirmDeadline: d.confirm_deadline,
        reservedUntil: d.reserved_until,
        step: topStep(d.step_done_at),
        commercial:
          [d.commerciaux?.first_name, d.commerciaux?.last_name].filter(Boolean).join(" ") ||
          (d.commerciaux?.email ?? ""),
      }))
      .sort((a, b) => b.declaredAt.localeCompare(a.declaredAt)),
    commercialWork: {
      activities: theirs(row.activities).map(rowToActivity).sort(byDate),
      tasks: theirs(row.tasks).map(rowToTask).sort(byDue),
      appointments: theirs(row.appointments).map(rowToAppointment).sort(byStart),
    },
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
