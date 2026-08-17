"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Toggle } from "@/components/ui/toggle";
import { inputClass } from "@/components/ui/field";
import {
  CATEGORY_LABELS,
  NO_CONTACT_OPTIONS,
  STATUS_LABELS,
  STATUS_ORDER,
} from "@/lib/admin/constants";
import {
  countActiveFilters,
  resetFilters,
  setFilters,
  useFilterOptions,
  useFilters,
} from "@/lib/admin/filters";
import { STATUS_DOT_CLASSES } from "@/lib/admin/status";
import type { RestaurantCategory } from "@/lib/admin/types";
import { FilterIcon, SearchIcon } from "./icons";

/*
 * Barre commune carte / liste : recherche, puces de statut, volet Filtres.
 * L'état vit dans lib/admin/filters (singleton) — passer d'une page à
 * l'autre garde le même sous-ensemble.
 */

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function FilterBar({ floating = false }: { floating?: boolean }) {
  const filters = useFilters();
  const { cities } = useFilterOptions();
  const [panelOpen, setPanelOpen] = useState(false);
  const activeCount = countActiveFilters(filters);

  return (
    <div
      className={
        floating
          ? "pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-col gap-2 lg:inset-x-4 lg:top-4"
          : "flex flex-col gap-2"
      }
    >
      <div
        className={`flex items-center gap-2 ${floating ? "pointer-events-auto" : ""}`}
      >
        <div className="relative min-w-0 flex-1 lg:max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={filters.q}
            onChange={(event) => setFilters({ q: event.target.value })}
            placeholder="Nom, ville, contact…"
            aria-label="Rechercher un restaurant"
            className={`${inputClass} bg-surface-raised pl-10 shadow-sm`}
          />
        </div>
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="relative flex shrink-0 items-center gap-2 rounded-xl border border-hairline bg-surface-raised px-3.5 py-2.5 text-sm font-medium text-muted shadow-sm transition-colors hover:border-ember-2/40 hover:text-foreground"
        >
          <FilterIcon className="size-4" />
          <span className="hidden lg:inline">Filtres</span>
          {activeCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-ember-3 text-[10px] font-bold text-background">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      <div
        className={`no-scrollbar flex gap-1.5 overflow-x-auto ${
          floating ? "pointer-events-auto -mx-3 px-3 lg:mx-0 lg:px-0" : "-mx-5 px-5 lg:mx-0 lg:px-0"
        }`}
      >
        {STATUS_ORDER.map((status) => {
          const active = filters.statuses.has(status);
          return (
            <button
              key={status}
              type="button"
              onClick={() =>
                setFilters({ statuses: toggleInSet(filters.statuses, status) })
              }
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
                active
                  ? "border-ember-2/60 bg-surface-raised text-foreground"
                  : "border-hairline bg-surface-raised/90 text-muted hover:text-foreground"
              }`}
            >
              <span
                className={`size-2 rounded-full ${STATUS_DOT_CLASSES[status]}`}
              />
              {STATUS_LABELS[status]}
            </button>
          );
        })}
      </div>

      {panelOpen && (
        <Modal
          title="Filtres"
          onClose={() => setPanelOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => resetFilters()}
                className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground"
              >
                Tout effacer
              </button>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="ember-gradient rounded-full px-5 py-2 text-sm font-semibold text-background"
              >
                Appliquer
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-5">
            <section>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
                Catégorie
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(
                  Object.entries(CATEGORY_LABELS) as [
                    RestaurantCategory,
                    string,
                  ][]
                ).map(([category, label]) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      setFilters({
                        categories: toggleInSet(filters.categories, category),
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      filters.categories.has(category)
                        ? "border-ember-2/60 text-foreground"
                        : "border-hairline text-muted hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {cities.length > 0 && (
              <section>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
                  Ville
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {cities.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() =>
                        setFilters({ cities: toggleInSet(filters.cities, city) })
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        filters.cities.has(city)
                          ? "border-ember-2/60 text-foreground"
                          : "border-hairline text-muted hover:text-foreground"
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="flex flex-col gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                Coordonnées & suivi
              </p>
              {(
                [
                  ["hasEmail", "A un email"],
                  ["hasPhone", "A un téléphone"],
                  ["hasWebsite", "A un site web"],
                  ["hasAppointment", "RDV à venir"],
                  ["hasFollowUp", "Relance prévue"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm">{label}</span>
                  <Toggle
                    checked={filters[key]}
                    onChange={(checked) =>
                      setFilters({ [key]: checked } as Partial<
                        typeof filters
                      >)
                    }
                    label={label}
                  />
                </div>
              ))}
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm">Sans contact depuis</span>
                <select
                  value={filters.noContactDays ?? ""}
                  onChange={(event) =>
                    setFilters({
                      noContactDays: event.target.value
                        ? Number(event.target.value)
                        : null,
                    })
                  }
                  className={`${inputClass} w-auto`}
                >
                  <option value="">Peu importe</option>
                  {NO_CONTACT_OPTIONS.map((days) => (
                    <option key={days} value={days}>
                      {days} jours
                    </option>
                  ))}
                </select>
              </div>
            </section>
          </div>
        </Modal>
      )}
    </div>
  );
}
