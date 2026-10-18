"use client";

import { useState } from "react";
import type { TableState } from "@/components/club/floor-plan";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { ClubBooking, ClubTable } from "@/lib/club/types";
import * as clubApi from "@/lib/gestion/club-api";
import { formatPhone, matchesSearch, people, staffTableState } from "@/lib/gestion/club-selectors";
import { StatusChip } from "./night-plan";

/*
 * Les tables du soir en liste, pour qui cherche un nom à la porte : filtrées
 * par état, cherchées par nom, numéro ou table, et l'arrivée d'une table
 * réglée pointée d'un geste, sans ouvrir sa fiche.
 */

type Filter = "toutes" | "attente" | "payee" | "arrivee";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "toutes", label: "Toutes" },
  { id: "attente", label: "À régler" },
  { id: "payee", label: "Payées" },
  { id: "arrivee", label: "Arrivées" },
];

export type HeldTable = { booking: ClubBooking; table: ClubTable; zoneName: string };

export function BookingsList({ held, onOpen }: { held: HeldTable[]; onOpen: (tableId: string) => void }) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("toutes");
  const [busy, setBusy] = useState<string | null>(null);

  const withState = held.map((entry) => ({ ...entry, state: staffTableState(entry.booking, true) }));
  const counts = Object.fromEntries(
    FILTERS.map(({ id }) => [id, id === "toutes" ? withState.length : withState.filter((e) => e.state === id).length])
  ) as Record<Filter, number>;
  const listed = withState.filter(
    ({ booking, table, state }) =>
      (filter === "toutes" || state === filter) &&
      matchesSearch(query, [booking.name, booking.phone, table.label])
  );

  const arrive = async (booking: ClubBooking, label: string) => {
    setBusy(booking.id);
    try {
      await clubApi.markArrival(booking, true);
      toast.success(`Table ${label} : arrivée.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setBusy(null);
    }
  };

  if (held.length === 0) {
    return (
      <EmptyState
        title="Aucune table réservée"
        body="Les tables réservées en ligne, au téléphone ou à la porte s'affichent ici en direct."
      />
    );
  }

  const quick = (booking: ClubBooking, table: ClubTable, state: TableState) => {
    if (state === "payee") {
      return (
        <button
          type="button"
          disabled={busy === booking.id}
          onClick={() => void arrive(booking, table.label)}
          aria-label={`Table ${table.label}, ${booking.name} : marquer arrivé(e)`}
          className="ember-gradient min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold text-background disabled:opacity-50"
        >
          Arrivé(e)
        </button>
      );
    }
    if (state === "attente") {
      return (
        <button
          type="button"
          onClick={() => onOpen(table.id)}
          aria-label={`Table ${table.label}, ${booking.name} : encaisser`}
          className="min-h-11 shrink-0 rounded-full border border-hairline px-4 text-sm font-semibold transition-colors hover:border-ember-2/40"
        >
          Encaisser
        </button>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Chercher un nom, un numéro, une table…"
        aria-label="Chercher une réservation"
        className={inputClass}
      />
      <div role="group" aria-label="Filtrer par état" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:px-0">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors lg:pointer-fine:min-h-9 ${
              filter === id
                ? "border-foreground bg-foreground text-background"
                : "border-hairline text-muted hover:text-foreground"
            }`}
          >
            {label} <span className="tabular-nums opacity-70">{counts[id]}</span>
          </button>
        ))}
      </div>

      {listed.length === 0 ? (
        <p className="px-1 text-sm text-muted">Aucune réservation ne correspond.</p>
      ) : (
        <ul className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
          {listed.map(({ booking, table, zoneName, state }) => (
            <li key={booking.id} className="soirees-entree flex items-center gap-2 pr-3">
              <button
                type="button"
                onClick={() => onOpen(table.id)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl py-3 pl-4 text-left transition-colors hover:bg-surface-raised"
              >
                <span className="w-12 shrink-0 text-center font-display text-lg font-medium tabular-nums">
                  {table.label}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm font-medium">{booking.name}</span>
                  <span className="text-xs text-muted">
                    {zoneName} · {people(booking.partySize)}
                    {booking.phone ? ` · ${formatPhone(booking.phone)}` : ""}
                  </span>
                  <span>
                    <StatusChip key={state} state={state} />
                  </span>
                </span>
              </button>
              {quick(booking, table, state)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
