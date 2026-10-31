"use client";

import { useEffect, useState } from "react";
import { inputClass } from "@/components/ui/field";
import { emptyFilters } from "@/lib/admin/filters";
import { fetchLeadsPage } from "@/lib/admin/leads-page";
import { LIST_SEARCH_DEBOUNCE_MS } from "@/lib/gestion/constants";
import type { LeadLite } from "@/lib/admin/types";

/** Nombre de suggestions affichées sous le champ. */
const MAX_SUGGESTIONS = 8;

/*
 * Combobox maison : la base cherche (nom, ville, contact, sans accents) et
 * le champ propose une liste cliquable. Assez pour un picker interne.
 */
export function RestaurantPicker({
  value,
  onSelect,
}: {
  value: LeadLite | null;
  onSelect: (lead: LeadLite | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const [suggestions, setSuggestions] = useState<LeadLite[]>([]);

  useEffect(() => {
    const q = query.trim();
    let current = true;
    const timer = setTimeout(() => {
      if (!q) {
        setSuggestions([]);
        return;
      }
      fetchLeadsPage(
        {
          filters: { ...emptyFilters(), q },
          product: null,
          appointmentIds: [],
          sort: "name",
          descending: false,
        },
        MAX_SUGGESTIONS,
        0
      )
        .then((page) => {
          if (current) setSuggestions(page.rows);
        })
        .catch(console.error);
    }, LIST_SEARCH_DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-background px-4 py-2.5">
        <span className="min-w-0 truncate text-sm">
          {value.name}
          {value.city && (
            <span className="text-faint"> · {value.city}</span>
          )}
        </span>
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setQuery("");
          }}
          className="shrink-0 text-xs font-semibold text-muted transition-colors hover:text-foreground"
        >
          Changer
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // blur ferme la liste ; la sélection passe par mousedown, qui part
        // avant le blur — sinon la liste resterait ouverte sur le pied de
        // modale et intercepterait « Enregistrer ».
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        placeholder="Chercher un restaurant…"
        className={inputClass}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-xl border border-hairline bg-surface-raised py-1 shadow-lg">
          {suggestions.map((lead) => (
            <li key={lead.restaurantId}>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(lead);
                  setOpen(false);
                }}
                className="flex w-full items-baseline justify-between gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-surface"
              >
                <span className="min-w-0 truncate">{lead.name}</span>
                {lead.city && (
                  <span className="shrink-0 text-xs text-faint">
                    {lead.city}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
