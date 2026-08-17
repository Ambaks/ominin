"use client";

import { useMemo, useSyncExternalStore } from "react";
import { normalizeText } from "./format";
import { useAdmin } from "./store";
import type { AdminState, Filters, LeadLite } from "./types";

/*
 * État des filtres : singleton en mémoire partagé entre la carte et la liste
 * des restaurants — naviguer de l'une à l'autre garde le même sous-ensemble.
 * Pas dans l'URL : c'est de l'état de travail à fort taux de frappe ; l'URL
 * ne porte que l'identité (?lead=).
 */

export function emptyFilters(): Filters {
  return {
    statuses: new Set(),
    categories: new Set(),
    cities: new Set(),
    hasEmail: false,
    hasPhone: false,
    hasWebsite: false,
    hasAppointment: false,
    hasFollowUp: false,
    noContactDays: null,
    q: "",
  };
}

let filters: Filters = emptyFilters();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function setFilters(patch: Partial<Filters>) {
  filters = { ...filters, ...patch };
  notify();
}

export function resetFilters() {
  filters = emptyFilters();
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const serverFilters = emptyFilters();

export function useFilters(): Filters {
  return useSyncExternalStore(
    subscribe,
    () => filters,
    () => serverFilters
  );
}

/** Nombre de critères actifs hors recherche (badge du bouton « Filtres »). */
export function countActiveFilters(f: Filters): number {
  return (
    f.statuses.size +
    f.categories.size +
    f.cities.size +
    Number(f.hasEmail) +
    Number(f.hasPhone) +
    Number(f.hasWebsite) +
    Number(f.hasAppointment) +
    Number(f.hasFollowUp) +
    Number(f.noContactDays !== null)
  );
}

/** Prédicat pur — la carte et la liste consomment le même sous-ensemble. */
export function filterLeads(
  leads: LeadLite[],
  f: Filters,
  appointmentRestaurantIds: Set<string>
): LeadLite[] {
  const tokens = normalizeText(f.q.trim()).split(/\s+/).filter(Boolean);
  const contactCutoff =
    f.noContactDays !== null
      ? new Date(Date.now() - f.noContactDays * 86_400_000).toISOString()
      : null;
  return leads.filter((lead) => {
    if (f.statuses.size > 0 && !f.statuses.has(lead.status)) return false;
    if (f.categories.size > 0 && !f.categories.has(lead.category)) return false;
    if (f.cities.size > 0 && (!lead.city || !f.cities.has(lead.city))) {
      return false;
    }
    if (f.hasEmail && !lead.email) return false;
    if (f.hasPhone && !lead.phone) return false;
    if (f.hasWebsite && !lead.hasWebsite) return false;
    if (f.hasAppointment && !appointmentRestaurantIds.has(lead.restaurantId)) {
      return false;
    }
    if (f.hasFollowUp && !lead.nextFollowUpAt) return false;
    if (
      contactCutoff !== null &&
      lead.lastContactAt !== null &&
      lead.lastContactAt >= contactCutoff
    ) {
      return false;
    }
    return tokens.every((token) => lead.searchKey.includes(token));
  });
}

function appointmentIds(state: AdminState | null): Set<string> {
  return new Set(state?.appointments.map((a) => a.restaurantId) ?? []);
}

/** Sous-ensemble filtré courant — carte, liste et export lisent ici. */
export function useFilteredLeads(): LeadLite[] {
  const state = useAdmin();
  const current = useFilters();
  return useMemo(
    () =>
      state ? filterLeads(state.leads, current, appointmentIds(state)) : [],
    [state, current]
  );
}

/** Valeurs distinctes pour les sélecteurs du volet Filtres. */
export function useFilterOptions(): { cities: string[] } {
  const state = useAdmin();
  return useMemo(() => {
    const cities = new Set<string>();
    for (const lead of state?.leads ?? []) {
      if (lead.city) cities.add(lead.city);
    }
    return { cities: [...cities].sort((a, b) => a.localeCompare(b, "fr")) };
  }, [state]);
}
