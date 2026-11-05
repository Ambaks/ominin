"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorNotice, Input, ListPager, Plate, Select, Shimmer } from "@/components/gestion/ui";
import { formatNight, formatNightShort, formatTime } from "@/lib/club/format";
import { journalActeur, journalText, type JournalEntry } from "@/lib/club/journal";
import { fetchBookingJournal, fetchJournal } from "@/lib/gestion/club-api";
import { useClub } from "@/lib/gestion/club-store";
import { usePagedList } from "@/lib/use-paged-list";

/*
 * Le journal des actions, pour la direction : qui a fait quoi, quand. Celui
 * du club entier (onglet Journal des Soirées), page par page, par soirée et
 * par recherche ; et celui d'une réservation, dans sa fiche.
 */

/** inClub : dans le journal du club entier, qui nomme le client et la soirée d'une réservation. */
function JournalRow({ entry, inClub }: { entry: JournalEntry; inClub: boolean }) {
  const { title, detail } = journalText(entry);
  // Le client d'une réservation, la soirée d'une action sur la soirée ; un
  // membre est déjà nommé dans la phrase.
  const subject = inClub && (entry.bookingId || entry.eventId) ? entry.cible : null;
  const context = inClub && entry.bookingId ? entry.eventTitle : null;
  return (
    <li className="flex gap-3 px-4 py-3">
      <time dateTime={entry.at} className="w-11 shrink-0 pt-0.5 text-g-meta text-muted tabular-nums">
        {formatTime(entry.at)}
      </time>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-g-body">
          <span className="font-semibold">{title}</span>
          {subject && <span className="text-muted"> · {subject}</span>}
        </span>
        {detail && <span className="text-g-meta text-muted [overflow-wrap:anywhere]">{detail}</span>}
        <span className="text-g-meta">
          <span className={entry.acteur === "membre" ? "font-medium text-ember-1" : "font-medium"}>
            {journalActeur(entry)}
          </span>
          {context && <span className="text-muted"> · {context}</span>}
        </span>
      </span>
    </li>
  );
}

/** Les entrées, le jour inscrit en tête de chaque journée. */
function JournalRows({ entries, inClub }: { entries: JournalEntry[]; inClub: boolean }) {
  return (
    <ul className="divide-y divide-hairline">
      {entries.flatMap((entry, index) => {
        const day = formatNight(entry.at);
        const row = <JournalRow key={entry.id} entry={entry} inClub={inClub} />;
        return index > 0 && formatNight(entries[index - 1].at) === day
          ? [row]
          : [
              <li key={`jour-${entry.id}`} className="g-eyebrow px-4 pb-2 pt-3 first-letter:uppercase">
                {day}
              </li>,
              row,
            ];
      })}
    </ul>
  );
}

const rowId = (entry: JournalEntry) => String(entry.id);

export function JournalList() {
  const club = useClub();
  const [eventId, setEventId] = useState("");
  const fetchPage = useCallback(
    (search: string, limit: number, offset: number) => fetchJournal(eventId || null, search, limit, offset),
    [eventId]
  );
  const list = usePagedList({ fetchPage, rowId });
  const events = [...(club?.events ?? [])].sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,16rem)_1fr]">
        <Select value={eventId} onChange={(event) => setEventId(event.target.value)} aria-label="Soirée">
          <option value="">Toutes les soirées et l&rsquo;équipe</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {formatNightShort(event.startsAt)} · {event.title}
            </option>
          ))}
        </Select>
        <Input
          type="search"
          value={list.search}
          onChange={(event) => list.setSearch(event.target.value)}
          placeholder="Chercher un client ou un membre"
          aria-label="Chercher un client ou un membre"
          enterKeyHint="search"
        />
      </div>
      {list.error ? (
        <ErrorNotice error={list.error} onRetry={list.reload} />
      ) : list.total === null ? (
        <div aria-busy className="flex flex-col gap-3">
          <Shimmer className="h-16" />
          <Shimmer className="h-16" />
          <Shimmer className="h-16" />
        </div>
      ) : list.total === 0 ? (
        <EmptyState
          text={
            list.query || eventId
              ? "Aucune action ne correspond."
              : "Rien encore : chaque geste de l'équipe, chaque réservation et chaque paiement s'inscrira ici."
          }
        />
      ) : (
        <Plate className="overflow-hidden">
          <JournalRows entries={list.rows} inClub />
          <ListPager
            shown={list.rows.length}
            total={list.total}
            pageSize={list.pageSize}
            loading={list.loading}
            onPageSize={list.setPageSize}
            onMore={list.showMore}
          />
        </Plate>
      )}
    </div>
  );
}

/**
 * L'historique d'une réservation dans sa fiche. `version` change avec la
 * réservation (statut, table, paiements…) : l'historique se relit alors.
 */
export function BookingHistory({ bookingId, version }: { bookingId: string; version: string }) {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    fetchBookingJournal(bookingId).then(
      (rows) => {
        if (!live) return;
        setEntries(rows);
        setError(null);
      },
      (failure) => live && setError(failure)
    );
    return () => {
      live = false;
    };
  }, [bookingId, version, attempt]);

  return (
    <section aria-label="Historique" className="flex flex-col gap-2">
      <h3 className="g-eyebrow">Historique</h3>
      {error ? (
        <ErrorNotice error={error} onRetry={() => setAttempt((count) => count + 1)} />
      ) : entries === null ? (
        <Shimmer className="h-16" />
      ) : entries.length === 0 ? (
        <p className="text-g-body text-muted">Aucune action enregistrée.</p>
      ) : (
        <Plate>
          <JournalRows entries={entries} inClub={false} />
        </Plate>
      )}
    </section>
  );
}
