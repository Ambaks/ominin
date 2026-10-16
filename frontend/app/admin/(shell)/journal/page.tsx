"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatTime } from "@/lib/admin/format";
import { fetchJournal, groupByDay, type JournalEntry } from "@/lib/admin/journal";
import { OWNER_LABELS, OWNERS, isOwner, type Owner } from "@/lib/admin/owners";

/*
 * Ce que chacun a poussé, jour par jour : une entrée par /push, avec le
 * résumé écrit par Claude au moment du push.
 */

const SECTION_TITLE = "text-[11px] font-semibold uppercase tracking-wider text-faint";

function EntryCard({ entry }: { entry: JournalEntry }) {
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-hairline bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ember-1">
          {isOwner(entry.owner) ? OWNER_LABELS[entry.owner] : entry.owner} ·{" "}
          {formatTime(entry.created_at)}
        </p>
        <p className="font-mono text-[11px] text-faint">
          {entry.branch} · {entry.commit_sha}
        </p>
      </div>
      <h3 className="font-medium">{entry.title}</h3>
      {entry.summary && (
        <p className="whitespace-pre-line text-sm text-muted">{entry.summary}</p>
      )}
    </li>
  );
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [who, setWho] = useState<Owner | null>(null);

  const load = () =>
    fetchJournal().then(setEntries, (reason: unknown) =>
      setError(reason instanceof Error ? reason.message : "Une erreur est survenue."),
    );
  useEffect(() => void load(), []);
  const retry = () => {
    setError(null);
    void load();
  };

  const days = entries
    ? groupByDay(who ? entries.filter((entry) => entry.owner === who) : entries)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium">Journal</h1>
          <p className="mt-1 text-sm text-muted">
            Ce que chacun a poussé, avec le résumé écrit à chaque /push.
          </p>
        </div>
        <div className="flex gap-2">
          {[null, ...OWNERS].map((owner) => (
            <button
              key={owner ?? "all"}
              type="button"
              onClick={() => setWho(owner)}
              aria-pressed={who === owner}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                who === owner
                  ? "border-ember-2/60 text-foreground"
                  : "border-hairline text-muted hover:text-foreground"
              }`}
            >
              {owner ? OWNER_LABELS[owner] : "Tous"}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <EmptyState
          title="Chargement impossible"
          body={error}
          action={
            <button
              type="button"
              onClick={retry}
              className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted hover:text-foreground"
            >
              Réessayer
            </button>
          }
        />
      ) : !entries ? (
        <div aria-busy className="flex flex-col gap-3">
          <div className="shimmer h-28 rounded-2xl" />
          <div className="shimmer h-28 rounded-2xl" />
        </div>
      ) : days.length === 0 ? (
        <EmptyState
          title="Rien de poussé pour l'instant"
          body="Chaque /push ajoute ici le résumé de ce qui a été fait."
        />
      ) : (
        days.map((day) => (
          <section key={day.key} className="flex flex-col gap-3">
            <h2 className={SECTION_TITLE}>{day.label}</h2>
            <ul className="flex flex-col gap-3">
              {day.entries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
