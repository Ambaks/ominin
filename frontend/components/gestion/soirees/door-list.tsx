"use client";

import { useRef, useState } from "react";
import type { TableState } from "@/components/club/floor-plan";
import { useToast } from "@/components/ui/toast";
import type { ClubBooking, ClubTable } from "@/lib/club/types";
import * as clubApi from "@/lib/gestion/club-api";
import { formatPhone, matchesSearch, people, staffTableState } from "@/lib/gestion/club-selectors";
import { StatusChip } from "./night-plan";
import { usePresence } from "./use-presence";

/*
 * La porte : les tables du soir en une liste, celles qu'on attend d'abord
 * (la plus ancienne réservation en tête, signalée), les arrivées repliées
 * dessous. Un seul geste par rangée ; une table réglée entre aussi d'un
 * glissé vers la droite, et une annonce permet de revenir dessus.
 */

/** Glissé (px) qui fait entrer une table ; en deçà, la rangée revient. */
const SWIPE_COMMIT = 96;
/** Glissé (px) à partir duquel la rangée suit le doigt plutôt que le défilement. */
const SWIPE_START = 10;

export type HeldTable = { booking: ClubBooking; table: ClubTable; zoneName: string };
type Entry = HeldTable & { state: TableState };

function DoorRow({
  entry,
  next,
  onOpen,
  onArrive,
}: {
  entry: Entry;
  next: boolean;
  onOpen: () => void;
  onArrive: () => void;
}) {
  const { booking, table, zoneName, state } = entry;
  const row = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ id: number; x: number; y: number; dx: number; active: boolean } | null>(null);
  const [swiping, setSwiping] = useState(false);
  const canSwipe = state === "payee";

  const setOffset = (dx: number) => row.current?.style.setProperty("--glisse", `${dx}px`);

  const action =
    state === "payee" ? (
      <button
        type="button"
        onClick={onArrive}
        className={`min-h-12 shrink-0 rounded-full px-5 text-sm font-semibold ${
          next ? "ember-gradient" : "border border-hairline text-foreground hover:border-ember-2/50"
        }`}
      >
        Arrivé(e)
      </button>
    ) : state === "attente" ? (
      <button
        type="button"
        onClick={onOpen}
        className={`min-h-12 shrink-0 rounded-full px-5 text-sm font-semibold ${
          next ? "ember-gradient" : "border border-hairline text-foreground hover:border-ember-2/50"
        }`}
      >
        Encaisser et faire entrer
      </button>
    ) : null;

  return (
    <div
      ref={row}
      className="porte-rangee"
      data-suivant={next || undefined}
      data-glisse={swiping || undefined}
      onPointerDown={(event) => {
        if (!canSwipe || event.button !== 0) return;
        swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, active: false };
      }}
      onPointerMove={(event) => {
        const current = swipe.current;
        if (!current || current.id !== event.pointerId) return;
        const dx = event.clientX - current.x;
        if (!current.active) {
          if (Math.abs(event.clientY - current.y) > SWIPE_START) {
            swipe.current = null;
            return;
          }
          if (dx < SWIPE_START) return;
          current.active = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          setSwiping(true);
        }
        current.dx = Math.max(0, dx);
        setOffset(current.dx);
      }}
      onPointerUp={() => {
        const current = swipe.current;
        swipe.current = null;
        if (!current?.active) return;
        setSwiping(false);
        setOffset(0);
        if (current.dx >= SWIPE_COMMIT) onArrive();
      }}
      onPointerCancel={() => {
        swipe.current = null;
        setSwiping(false);
        setOffset(0);
      }}
    >
      {canSwipe && (
        <div className="porte-fond" aria-hidden>
          Faire entrer →
        </div>
      )}
      <div className="porte-contenu flex items-center gap-3 py-3 pl-4 pr-3">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left"
        >
          <span className="w-12 shrink-0 text-center text-xl font-semibold tabular-nums">{table.label}</span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-base font-semibold">{booking.name}</span>
              {next && (
                <span className="shrink-0 rounded-full bg-ember-2/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-2">
                  Suivant
                </span>
              )}
            </span>
            <span className="text-xs text-muted">
              {zoneName} · {people(booking.partySize)}
              {booking.phone && <span className="whitespace-nowrap"> · {formatPhone(booking.phone)}</span>}
            </span>
            <span>
              <StatusChip key={state} state={state} />
            </span>
          </span>
        </button>
        {action}
      </div>
    </div>
  );
}

export function DoorList({
  held,
  onOpen,
  autoFocus = false,
}: {
  held: HeldTable[];
  onOpen: (tableId: string) => void;
  autoFocus?: boolean;
}) {
  const toast = useToast();
  const [query, setQuery] = useState("");

  const entries: Entry[] = held
    .map((entry) => ({ ...entry, state: staffTableState(entry.booking, true) }))
    .filter(({ booking, table }) => matchesSearch(query, [booking.name, booking.phone, table.label]));
  // Ceux qu'on attend : à faire entrer ou à encaisser d'abord, les paiements
  // en ligne en cours ensuite ; à l'intérieur, la réservation la plus ancienne.
  const rank = (state: TableState) => (state === "prise" ? 1 : 0);
  const waiting = entries
    .filter((entry) => entry.state !== "arrivee")
    .sort(
      (a, b) => rank(a.state) - rank(b.state) || Date.parse(a.booking.createdAt) - Date.parse(b.booking.createdAt)
    );
  const arrived = entries
    .filter((entry) => entry.state === "arrivee")
    .sort((a, b) => Date.parse(b.booking.arrivedAt ?? "") - Date.parse(a.booking.arrivedAt ?? ""));
  const nextId = waiting.find((entry) => entry.state !== "prise")?.booking.id;
  const [rows, done] = usePresence(waiting, (entry) => entry.booking.id);

  const arrive = async (booking: ClubBooking, label: string) => {
    try {
      await clubApi.markArrival(booking, true);
      toast.notice(`Table ${label} : ${booking.name} est entré(e).`, {
        label: "Annuler",
        onPress: () => {
          clubApi
            .markArrival({ ...booking, status: "arrivee" }, false)
            .catch((error: unknown) =>
              toast.error(error instanceof Error ? error.message : "Une erreur est survenue.")
            );
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  };

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 bg-background/95 pb-3 backdrop-blur-md">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, téléphone ou table"
          aria-label="Chercher une réservation"
          enterKeyHint="search"
          autoFocus={autoFocus}
          className="w-full rounded-2xl border border-hairline bg-surface px-4 py-3.5 text-base outline-none transition-colors placeholder:text-muted focus:border-ember-2/60"
        />
      </div>

      {held.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted">
          Aucune table réservée pour l&rsquo;instant. Les réservations s&rsquo;affichent ici en direct.
        </p>
      ) : (
        <>
          <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Attendues · <span className="tabular-nums">{waiting.length}</span>
          </p>
          {rows.length === 0 ? (
            <p className="px-1 pb-4 text-sm text-muted">
              {query ? "Personne d'attendu ne correspond." : "Tout le monde est arrivé."}
            </p>
          ) : (
            <ul className="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-surface">
              {rows.map(({ key, item, presence }) => (
                <li
                  key={key}
                  className="rangee"
                  data-presence={presence}
                  onAnimationEnd={(event) => {
                    if (event.target === event.currentTarget && presence === "sortie") done(key);
                  }}
                >
                  <div>
                    <DoorRow
                      entry={item}
                      next={item.booking.id === nextId}
                      onOpen={() => onOpen(item.table.id)}
                      onArrive={() => void arrive(item.booking, item.table.label)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {arrived.length > 0 && (
            <details className="group mt-4 rounded-2xl border border-hairline bg-surface">
              <summary className="flex min-h-12 cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden justify-between gap-3 px-4 text-sm font-semibold">
                <span>
                  Arrivées · <span className="tabular-nums">{arrived.length}</span>
                </span>
                <svg viewBox="0 0 24 24" className="size-4 text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <ul className="divide-y divide-hairline border-t border-hairline">
                {arrived.map(({ booking, table, zoneName }) => (
                  <li key={booking.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(table.id)}
                      className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left"
                    >
                      <span className="w-12 shrink-0 text-center font-semibold tabular-nums">{table.label}</span>
                      <span className="min-w-0 flex-1 truncate text-sm">{booking.name}</span>
                      <span className="shrink-0 text-xs text-muted">{zoneName}</span>
                      <StatusChip state="arrivee" />
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
