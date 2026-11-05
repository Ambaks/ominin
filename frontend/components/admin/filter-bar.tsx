"use client";

import { useState } from "react";
import { GlassButton, Select, Sheet, Switch } from "@/components/gestion/ui";
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
 * Barre commune aux listes : recherche, puces de statut, feuille Filtres.
 * L'état vit dans lib/admin/filters (singleton) — passer d'une page à
 * l'autre garde le même sous-ensemble.
 */

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

const CHIP = "g-btn g-press";
const chipClass = (active: boolean) => `${CHIP} ${active ? "g-btn-primary" : "g-btn-secondary"}`;

export function FilterBar() {
  const filters = useFilters();
  const { cities } = useFilterOptions();
  const [panelOpen, setPanelOpen] = useState(false);
  const activeCount = countActiveFilters(filters);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="g-input-wrap min-w-0 flex-1 lg:max-w-sm">
          <input
            type="search"
            value={filters.q}
            onChange={(event) => setFilters({ q: event.target.value })}
            placeholder="Nom, ville, contact…"
            aria-label="Rechercher un restaurant"
            className="g-input"
          />
          <span className="g-input-unit flex" aria-hidden>
            <SearchIcon />
          </span>
        </span>
        <GlassButton onClick={() => setPanelOpen(true)} badge={activeCount} className="shrink-0">
          <FilterIcon />
          <span className="hidden lg:inline">Filtres</span>
        </GlassButton>
      </div>

      <div className="no-scrollbar -mx-[var(--g-topbar-mx-sm)] flex gap-1.5 overflow-x-auto px-[var(--g-topbar-mx-sm)] lg:mx-0 lg:px-0">
        {STATUS_ORDER.map((status) => {
          const active = filters.statuses.has(status);
          return (
            <button
              key={status}
              type="button"
              aria-pressed={active}
              onClick={() =>
                setFilters({ statuses: toggleInSet(filters.statuses, status) })
              }
              className={`${chipClass(active)} shrink-0`}
            >
              <span
                className={`size-2 rounded-full ${active ? "bg-background" : STATUS_DOT_CLASSES[status]}`}
              />
              {STATUS_LABELS[status]}
            </button>
          );
        })}
      </div>

      {panelOpen && (
        <Sheet
          title="Filtres"
          onClose={() => setPanelOpen(false)}
          footer={
            <>
              <GlassButton onClick={() => resetFilters()}>Tout effacer</GlassButton>
              <GlassButton variant="primary" onClick={() => setPanelOpen(false)}>
                Appliquer
              </GlassButton>
            </>
          }
        >
          <div className="flex flex-col gap-5">
            <section>
              <p className="g-eyebrow mb-2">Catégorie</p>
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
                    aria-pressed={filters.categories.has(category)}
                    onClick={() =>
                      setFilters({
                        categories: toggleInSet(filters.categories, category),
                      })
                    }
                    className={chipClass(filters.categories.has(category))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {cities.length > 0 && (
              <section>
                <p className="g-eyebrow mb-2">Ville</p>
                <div className="flex flex-wrap gap-1.5">
                  {cities.map((city) => (
                    <button
                      key={city}
                      type="button"
                      aria-pressed={filters.cities.has(city)}
                      onClick={() =>
                        setFilters({ cities: toggleInSet(filters.cities, city) })
                      }
                      className={chipClass(filters.cities.has(city))}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="flex flex-col gap-1">
              <p className="g-eyebrow mb-2">Coordonnées & suivi</p>
              {(
                [
                  ["hasEmail", "A un email"],
                  ["hasPhone", "A un téléphone"],
                  ["hasWebsite", "A un site web"],
                  ["hasAppointment", "RDV à venir"],
                  ["hasFollowUp", "Relance prévue"],
                ] as const
              ).map(([key, label]) => (
                <Switch
                  key={key}
                  checked={filters[key]}
                  onChange={(checked) =>
                    setFilters({ [key]: checked } as Partial<typeof filters>)
                  }
                  label={label}
                />
              ))}
              <label className="g-switch-row">
                <span>
                  <span>Sans contact depuis</span>
                </span>
                <Select
                  value={filters.noContactDays ?? ""}
                  onChange={(event) =>
                    setFilters({
                      noContactDays: event.target.value
                        ? Number(event.target.value)
                        : null,
                    })
                  }
                  className="w-40"
                >
                  <option value="">Peu importe</option>
                  {NO_CONTACT_OPTIONS.map((days) => (
                    <option key={days} value={days}>
                      {days} jours
                    </option>
                  ))}
                </Select>
              </label>
            </section>
          </div>
        </Sheet>
      )}
    </div>
  );
}
