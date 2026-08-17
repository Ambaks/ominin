"use client";

import { useMemo, useState } from "react";
import { inputClass } from "@/components/ui/field";
import { normalizeText } from "@/lib/admin/format";
import { useAdmin } from "@/lib/admin/store";
import type { LeadLite } from "@/lib/admin/types";

/** Nombre de suggestions affichées sous le champ. */
const MAX_SUGGESTIONS = 8;

/*
 * Combobox maison : filtre les lignes légères du store (nom + ville, sans
 * accents) et propose une liste cliquable. Assez pour un picker interne.
 */
export function RestaurantPicker({
  value,
  onSelect,
}: {
  value: LeadLite | null;
  onSelect: (lead: LeadLite | null) => void;
}) {
  const state = useAdmin();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const q = normalizeText(query.trim());
    if (!q) return [];
    return (state?.leads ?? [])
      .filter((lead) => lead.searchKey.includes(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [state?.leads, query]);

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
