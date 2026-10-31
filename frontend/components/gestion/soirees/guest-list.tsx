"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/gestion/icons";
import { EmptyState, Input, Plate } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import type { ClubEvent, ClubGuest } from "@/lib/club/types";
import * as clubApi from "@/lib/gestion/club-api";
import { formatPhone, matchesSearch, people } from "@/lib/gestion/club-selectors";
import { describeError } from "@/lib/gestion/errors";

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
      toast.error(describeError(error).message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <dl className="g-plate grid grid-cols-3 divide-x divide-hairline">
        {[
          { label: "Inscrits", value: String(registered) },
          { label: "Arrivés", value: String(arrived) },
          { label: "Places", value: event.guestListCapacity ? String(event.guestListCapacity) : "—" },
        ].map((stat) => (
          <div key={stat.label} className="min-w-0 px-4 py-3">
            <dt className="text-g-meta text-muted">{stat.label}</dt>
            <dd className="mt-1.5 truncate text-g-kpi tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-g-meta text-muted">
        {event.guestListOpen ? "Inscriptions ouvertes" : "Inscriptions fermées"} · jusqu&rsquo;à{" "}
        {people(event.guestListMaxParty)} par inscription
        {event.guestListCapacity ? "" : " · sans plafond"}.
      </p>

      {guests.length === 0 ? (
        <EmptyState
          text={
            event.guestListOpen
              ? "Personne sur la liste pour l'instant : les inscriptions faites depuis la page de la soirée s'affichent ici en direct."
              : "La liste d'invités de cette soirée n'est pas ouverte."
          }
        />
      ) : (
        <>
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom ou numéro"
            aria-label="Chercher un invité"
            enterKeyHint="search"
          />
          {shown.length === 0 ? (
            <p className="px-1 text-g-body text-muted">Aucun invité ne correspond.</p>
          ) : (
            <Plate>
              <ul className="divide-y divide-hairline">
                {shown.map((guest) => (
                  <li key={guest.id} className="flex items-center gap-3 px-4 py-2">
                    <div className="min-w-0 flex-1">
                      <p title={guest.name} className={`truncate text-g-body font-medium ${guest.arrivedAt ? "text-muted" : ""}`}>
                        {guest.name}
                      </p>
                      <p className="truncate text-g-meta text-muted">
                        {people(guest.partySize)}
                        {guest.phone ? ` · ${formatPhone(guest.phone)}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void toggle(guest)}
                      aria-pressed={Boolean(guest.arrivedAt)}
                      aria-label={`${guest.name}, ${people(guest.partySize)} : arrivé`}
                      className="invite-coche g-press"
                    >
                      <CheckIcon key={String(Boolean(guest.arrivedAt))} className={`size-4.5 ${guest.arrivedAt ? "statut-pose" : ""}`} />
                    </button>
                  </li>
                ))}
              </ul>
            </Plate>
          )}
        </>
      )}
    </div>
  );
}
