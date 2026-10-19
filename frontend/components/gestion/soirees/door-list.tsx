"use client";

import { useEffect, useRef, useState } from "react";
import type { TableState } from "@/components/club/floor-plan";
import { PhoneIcon } from "@/components/gestion/icons";
import { useToast } from "@/components/ui/toast";
import type { ClubBooking, ClubTable } from "@/lib/club/types";
import { formatCents } from "@/lib/club/format";
import * as clubApi from "@/lib/gestion/club-api";
import { formatPhone, matchesSearch, staffTableState, tableName, telHref } from "@/lib/gestion/club-selectors";
import { StatusChip } from "./night-plan";
import { usePresence } from "./use-presence";

/*
 * La porte : les tables du soir en une liste. D'abord celles à encaisser
 * (cerclées de corail), puis les tables réglées qu'on attend, la plus
 * ancienne réservation en tête, signalée ; les arrivées repliées dessous.
 * Un seul geste par rangée ; une table réglée entre aussi d'un glissé vers
 * la droite, et l'annonce qui suit permet de revenir dessus.
 */

/** Glissé (px) qui fait entrer une table ; au-delà, l'étiquette le dit et le lâcher suffit. */
const SWIPE_COMMIT = 96;
/** Glissé (px) à partir duquel la rangée suit le doigt plutôt que le défilement. */
const SWIPE_START = 10;
/** L'astuce du glissé ne se montre qu'une fois par appareil. */
const SWIPE_HINT_KEY = "ominin-soirees-glisse-vu";

export type HeldTable = {
  booking: ClubBooking;
  table: ClubTable;
  zoneName: string;
  /** Les amis qui ont payé leur part en ligne (table partagée). */
  payers: string[];
  /** Acompte réglé en ligne (table non partagée), frais compris ; null sinon. */
  deposit: number | null;
};
type Entry = HeldTable & { state: TableState };
type Phase = "repos" | "glisse" | "pret" | "parti";

/** « 8 pers. », court : la rangée tient sur un téléphone. */
const party = (count: number) => `${count} pers.`;

function readHintSeen(): boolean {
  try {
    return window.localStorage.getItem(SWIPE_HINT_KEY) !== null;
  } catch {
    return true;
  }
}

function DoorRow({
  entry,
  next,
  hint,
  onOpen,
  onArrive,
}: {
  entry: Entry;
  next: boolean;
  hint: boolean;
  onOpen: () => void;
  /** Fait entrer (et encaisse d'abord le reste s'il y en a) ; résout faux si la base refuse : la rangée revient. */
  onArrive: () => Promise<boolean>;
}) {
  const { booking, table, zoneName, state, payers, deposit } = entry;
  const remaining = booking.remainingCents;
  const row = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ id: number; x: number; y: number; dx: number; active: boolean } | null>(null);
  const [phase, setPhase] = useState<Phase>("repos");
  // Glisser fait entrer une table réglée ; l'argent, lui, se prend d'un geste visible.
  const canSwipe = state === "payee";
  const name = tableName(zoneName, table.label);

  const setOffset = (dx: number) => row.current?.style.setProperty("--glisse", `${dx}px`);

  const commit = async () => {
    setPhase("parti");
    setOffset(row.current?.offsetWidth ?? 0);
    if (await onArrive()) return;
    setPhase("repos");
    setOffset(0);
  };

  const button = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-12 flex-1 rounded-full px-5 text-sm font-semibold ${
        next ? "ember-gradient" : "border border-hairline text-foreground hover:border-ember-2/50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      ref={row}
      className="porte-rangee"
      data-phase={phase}
      data-a-regler={state === "attente" || undefined}
      data-indice={hint || undefined}
      onPointerDown={(event) => {
        if (!canSwipe || event.button !== 0 || phase === "parti") return;
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
        }
        current.dx = Math.max(0, dx);
        setOffset(current.dx);
        setPhase(current.dx >= SWIPE_COMMIT ? "pret" : "glisse");
      }}
      onPointerUp={() => {
        const current = swipe.current;
        swipe.current = null;
        if (!current?.active) return;
        if (current.dx >= SWIPE_COMMIT) {
          void commit();
          return;
        }
        setPhase("repos");
        setOffset(0);
      }}
      onPointerCancel={() => {
        swipe.current = null;
        setPhase("repos");
        setOffset(0);
      }}
    >
      {canSwipe && (
        <div className="porte-fond" aria-hidden>
          {phase === "pret" || phase === "parti" ? "Relâchez : il entre" : "Faire entrer →"}
        </div>
      )}
      <div className="porte-contenu flex flex-col gap-3 p-4">
        <button type="button" onClick={onOpen} className="flex flex-col gap-1.5 rounded-xl text-left">
          <span className="flex items-start justify-between gap-3">
            <span className="text-base font-semibold leading-snug">{booking.name}</span>
            <span className="shrink-0 rounded-full border border-hairline px-2.5 py-1 text-xs font-semibold tabular-nums">
              {name}
            </span>
          </span>
          <span className="flex flex-wrap items-center gap-2 text-sm text-muted">
            {party(booking.partySize)}
            {booking.shared && payers.length > 1 && (
              <span>
                · {payers.length} payeur{payers.length > 1 ? "s" : ""}
              </span>
            )}
            {deposit !== null ? (
              <span className="statut statut-pose" data-state="attente">
                Acompte <span className="tabular-nums">{formatCents(deposit)}</span> · reste{" "}
                <span className="tabular-nums">{formatCents(remaining)}</span>
              </span>
            ) : remaining > 0 && booking.paidCents > 0 ? (
              <span className="statut statut-pose" data-state="attente">
                Reste <span className="tabular-nums">{formatCents(remaining)}</span>
              </span>
            ) : (
              <StatusChip key={state} state={state} />
            )}
            {next && <span className="text-xs font-semibold text-ember-2">Suivant</span>}
          </span>
        </button>
        {(booking.phone || state === "payee" || state === "attente") && (
          <div className="flex items-center gap-2">
            {booking.phone && (
              <a
                href={telHref(booking.phone)}
                draggable={false}
                aria-label={`Appeler ${booking.name}, ${formatPhone(booking.phone)}`}
                title={formatPhone(booking.phone)}
                className="flex size-12 shrink-0 items-center justify-center rounded-full border border-hairline text-muted hover:text-foreground"
              >
                <PhoneIcon className="size-5" />
              </a>
            )}
            {state === "payee" && button("Arrivé(e)", () => void commit())}
            {state === "attente" &&
              button(`Encaisser ${formatCents(remaining)} et faire entrer`, () => void commit())}
          </div>
        )}
        {hint && (
          <p className="text-xs text-muted">Astuce : glissez une table réglée vers la droite pour la faire entrer.</p>
        )}
      </div>
    </div>
  );
}

export function DoorList({ held, onOpen }: { held: HeldTable[]; onOpen: (tableId: string) => void }) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [hintSeen] = useState(readHintSeen);

  const entries: Entry[] = held
    .map((entry) => ({ ...entry, state: staffTableState(entry.booking, true) }))
    .filter(({ booking, table, zoneName, payers }) =>
      matchesSearch(query, [booking.name, booking.phone, table.label, tableName(zoneName, table.label), ...payers])
    );
  // À encaisser d'abord, puis réglées, puis paiements en ligne en cours ;
  // à l'intérieur, la réservation la plus ancienne.
  const rank: Partial<Record<TableState, number>> = { attente: 0, payee: 1, prise: 2 };
  const waiting = entries
    .filter((entry) => entry.state !== "arrivee")
    .sort(
      (a, b) =>
        (rank[a.state] ?? 3) - (rank[b.state] ?? 3) ||
        Date.parse(a.booking.createdAt) - Date.parse(b.booking.createdAt)
    );
  const arrived = entries
    .filter((entry) => entry.state === "arrivee")
    .sort((a, b) => Date.parse(b.booking.arrivedAt ?? "") - Date.parse(a.booking.arrivedAt ?? ""));
  const nextId = waiting.find((entry) => entry.state !== "prise")?.booking.id;
  const hintId = hintSeen ? undefined : waiting.find((entry) => entry.state === "payee")?.booking.id;
  const [rows, done] = usePresence(waiting, (entry) => entry.booking.id);

  // L'astuce montrée, elle ne revient plus sur cet appareil.
  useEffect(() => {
    if (!hintId) return;
    try {
      window.localStorage.setItem(SWIPE_HINT_KEY, "1");
    } catch {
      // Stockage refusé (navigation privée) : l'astuce reviendra, rien de plus.
    }
  }, [hintId]);

  const arrive = async (booking: ClubBooking, name: string): Promise<boolean> => {
    const collect = booking.remainingCents;
    try {
      await clubApi.markArrival(booking, true, collect > 0);
      if (collect > 0) {
        // De l'argent a changé de main : rien à annuler d'un geste, la fiche de la table le permet.
        toast.success(`${name} : ${formatCents(collect)} encaissés, ${booking.name} est entré(e).`);
        return true;
      }
      toast.notice(`${name} : ${booking.name} est entré(e).`, {
        label: "Annuler",
        onPress: () => {
          clubApi
            .markArrival({ ...booking, status: "arrivee" }, false)
            .catch((error: unknown) =>
              toast.error(error instanceof Error ? error.message : "Une erreur est survenue.")
            );
        },
      });
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
      return false;
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
            Tables attendues · <span className="tabular-nums">{waiting.length}</span>
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
                      hint={item.booking.id === hintId}
                      onOpen={() => onOpen(item.table.id)}
                      onArrive={() => arrive(item.booking, tableName(item.zoneName, item.table.label))}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {arrived.length > 0 && (
            <details className="group mt-4 rounded-2xl border border-hairline bg-surface">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                <span>
                  Tables arrivées · <span className="tabular-nums">{arrived.length}</span>
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
                      className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left"
                    >
                      <span className="min-w-0 text-sm font-medium">{booking.name}</span>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">
                        {tableName(zoneName, table.label)}
                      </span>
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
