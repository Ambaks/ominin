"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAdminBasePath } from "./base-path";
import { LIST_SEARCH_DEBOUNCE_MS } from "@/lib/gestion/constants";
import { fetchLeadCities } from "./leads-page";
import { selectForProduct } from "./selectors";
import { useAdmin } from "./store";
import type { AdminState, Filters } from "./types";

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

/** Le snapshot vu depuis le produit affiché (l'URL), ou entier en vue
 * d'ensemble. Les mutations, elles, passent toujours par le store complet. */
export function useProductAdmin(): AdminState | null {
  const state = useAdmin();
  const { product } = useAdminBasePath();
  return useMemo(
    () => (state ? selectForProduct(state, product) : null),
    [state, product]
  );
}

/** Les filtres une fois la frappe retombée : ce que la base doit recevoir. */
export function useSettledFilters(): Filters {
  const current = useFilters();
  const [settled, setSettled] = useState(current);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(current), LIST_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [current]);
  return settled;
}

/** Valeurs distinctes pour les sélecteurs du volet Filtres. */
export function useFilterOptions(): { cities: string[] } {
  const { product } = useAdminBasePath();
  const [cities, setCities] = useState<string[]>([]);
  useEffect(() => {
    fetchLeadCities(product).then(setCities).catch(console.error);
  }, [product]);
  return { cities };
}
