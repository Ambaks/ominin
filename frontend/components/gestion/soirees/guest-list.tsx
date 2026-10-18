"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/gestion/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { ClubEvent, ClubGuest } from "@/lib/club/types";
import * as clubApi from "@/lib/gestion/club-api";
import { formatPhone, matchesSearch, people } from "@/lib/gestion/club-selectors";

/*
 * La liste d'invités à la porte : on cherche un nom, on coche l'arrivée.
 * Les places se comptent en personnes, comme le plafond de la soirée.
 */
export function GuestList({ event, guests }: { event: ClubEvent; guests: ClubGuest[] }) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const registered = guests.reduce((sum, guest) => sum + guest.partySize, 0);
  const arrived = guests.reduce((sum, guest) => sum + (guest.arrivedAt ? guest.partySize : 0), 0);
  const shown = guests
    .filter((guest) => matchesSearch(query, [guest.name, guest.phone, guest.email]))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  const toggle = async (guest: ClubGuest) => {
    try {
      await clubApi.markGuest(guest, !guest.arrivedAt);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 gap-3">
        {[
          { label: "Inscrits", value: String(registered) },
          { label: "Arrivés", value: String(arrived) },
          {
            label: "Places",
            value: event.guestListCapacity ? String(event.guestListCapacity) : "Sans plafond",
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-hairline bg-surface px-4 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">{stat.label}</dt>
            <dd className="mt-1 truncate font-display text-xl font-medium tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted">
        {event.guestListOpen ? "Inscriptions ouvertes" : "Inscriptions fermées"} · jusqu&rsquo;à{" "}
        {people(event.guestListMaxParty)} par inscription.
      </p>

      {guests.length === 0 ? (
        <EmptyState
          title="Personne sur la liste"
          body={
            event.guestListOpen
              ? "Les inscriptions faites depuis la page de la soirée s'affichent ici en direct."
              : "La liste d'invités de cette soirée n'est pas ouverte."
          }
        />
      ) : (
        <>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un nom, un numéro…"
            aria-label="Chercher un invité"
            className={inputClass}
          />
          {shown.length === 0 ? (
            <p className="px-1 text-sm text-muted">Aucun invité ne correspond.</p>
          ) : (
            <ul className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
              {shown.map((guest) => (
                <li key={guest.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${guest.arrivedAt ? "text-muted" : ""}`}>
                      {guest.name}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {people(guest.partySize)}
                      {guest.phone ? ` · ${formatPhone(guest.phone)}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggle(guest)}
                    aria-pressed={Boolean(guest.arrivedAt)}
                    aria-label={`${guest.name}, ${people(guest.partySize)} : ${guest.arrivedAt ? "arrivé, annuler" : "marquer arrivé"}`}
                    className={`flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors lg:pointer-fine:size-9 ${
                      guest.arrivedAt
                        ? "border-transparent bg-status-signed text-background"
                        : "border-hairline text-muted hover:border-ember-2/40 hover:text-foreground"
                    }`}
                  >
                    <CheckIcon key={String(Boolean(guest.arrivedAt))} className={`size-4.5 ${guest.arrivedAt ? "statut-pose" : ""}`} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
