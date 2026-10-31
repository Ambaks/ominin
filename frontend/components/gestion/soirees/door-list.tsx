"use client";

import { useEffect, useRef, useState } from "react";
import type { TableState } from "@/components/club/floor-plan";
import { CheckIcon, PhoneIcon } from "@/components/gestion/icons";
import { EmptyState, GlassButton, Input, Plate, Segmented } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import type { ClubBooking, ClubTable } from "@/lib/club/types";
import { formatCents, tableName } from "@/lib/club/format";
import * as clubApi from "@/lib/gestion/club-api";
import { formatPhone, matchesSearch, staffTableState, telHref } from "@/lib/gestion/club-selectors";
import { describeError } from "@/lib/gestion/errors";
import { StatusChip } from "./night-plan";
import { usePresence } from "./use-presence";

/*
 * La porte : les tables du soir en une liste. D'abord celles à encaisser
 * (cerclées de corail), puis les tables réglées qu'on attend, la plus
 * ancienne réservation en tête, signalée ; les arrivées repliées dessous.
 * Chaque rangée porte son geste écrit — « Faire entrer », ou « Encaisser …
 * et faire entrer » —, l'appel si un numéro est laissé, et sa fiche (déplacer,
 * rembourser) ; une table réglée entre aussi d'un glissé vers la droite,
 * raccourci du même geste. L'annonce qui suit permet de revenir dessus.
 */

/** Glissé (px) qui fait entrer une table ; au-delà, l'étiquette le dit et le lâcher suffit. */
const SWIPE_COMMIT = 96;
/** Glissé (px) à partir duquel la rangée suit le doigt plutôt que le défilement. */
const SWIPE_START = 10;
/** Vitesse (px/ms) d'un lancer qui fait entrer avant le seuil. */
const FLICK_SPEED = 0.6;
/** Glissé (px) minimal d'un lancer : un doigt qui tremble sur un appui ne fait entrer personne. */
const FLICK_MIN = 40;
/** Vibration (ms) qui confirme sous le doigt qu'une table entre. */
const COMMIT_BUZZ = 10;
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

/** L'astuce du glissé n'a de sens qu'au doigt, et qu'une fois. */
function readHintSeen(): boolean {
  if (!window.matchMedia("(pointer: coarse)").matches) return true;
  try {
    return window.localStorage.getItem(SWIPE_HINT_KEY) !== null;
  } catch {
    return true;
  }
}

type Filter = "toutes" | "attente" | "payee";

/** Les groupes de la porte, dans l'ordre : ce qu'il faut encaisser, puis ce qui est réglé. */
type Group = { label: string; entity: string };
const PAID_GROUP: Group = { label: "Payées", entity: "g-orders" };
const GROUPS: Partial<Record<TableState, Group>> = {
  attente: { label: "À encaisser", entity: "g-money" },
  payee: PAID_GROUP,
  prise: { label: "Paiement en ligne en cours", entity: "" },
};

const FILTERS: { value: Filter; label: string }[] = [
  { value: "toutes", label: "Toutes" },
  { value: "attente", label: "À encaisser" },
  { value: "payee", label: "Payées" },
];

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
  const swipe = useRef<{ id: number; x: number; y: number; dx: number; t: number; speed: number; active: boolean; armed: boolean } | null>(null);
  const committing = useRef(false);
  const [phase, setPhase] = useState<Phase>("repos");
  // Glisser fait entrer une table réglée ; l'argent, lui, se prend d'un geste visible.
  const canSwipe = state === "payee";
  const name = tableName(zoneName, table.label);

  const setOffset = (dx: number) => {
    row.current?.style.setProperty("--glisse", `${dx}px`);
    row.current?.style.setProperty("--progres", String(Math.min(dx / SWIPE_COMMIT, 1)));
  };

  const commit = async () => {
    // Un double appui, ou un glissé puis un appui : une seule entrée, une seule annonce.
    if (committing.current) return;
    committing.current = true;
    navigator.vibrate?.(COMMIT_BUZZ);
    setPhase("parti");
    setOffset(row.current?.offsetWidth ?? 0);
    if (await onArrive()) return;
    committing.current = false;
    setPhase("repos");
    setOffset(0);
  };

  return (
    <div
      ref={row}
      className="porte-rangee"
      data-phase={phase}
      data-a-regler={state === "attente" || undefined}
      data-indice={hint || undefined}
      onPointerDown={(event) => {
        if (!canSwipe || event.button !== 0 || phase === "parti") return;
        swipe.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          dx: 0,
          t: event.timeStamp,
          speed: 0,
          active: false,
          armed: false,
        };
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
        const next = Math.max(0, dx);
        // Vitesse du dernier déplacement : un lancer rapide vaut un glissé jusqu'au seuil.
        current.speed = (next - current.dx) / Math.max(event.timeStamp - current.t, 1);
        current.t = event.timeStamp;
        current.dx = next;
        setOffset(current.dx);
        const armed = current.dx >= SWIPE_COMMIT;
        // Un cran sous le doigt au passage du seuil : lâcher fera entrer.
        if (armed && !current.armed) navigator.vibrate?.(COMMIT_BUZZ);
        current.armed = armed;
        setPhase(armed ? "pret" : "glisse");
      }}
      onPointerUp={() => {
        const current = swipe.current;
        swipe.current = null;
        if (!current?.active) return;
        if (current.dx >= SWIPE_COMMIT || (current.dx >= FLICK_MIN && current.speed >= FLICK_SPEED)) {
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
      {(canSwipe || phase === "parti") && (
        <div className="porte-fond" aria-hidden>
          <span className={`porte-coche ${phase === "parti" ? "g-ready" : ""}`}>
            <CheckIcon className="size-4" />
          </span>
          <span className="min-w-0 truncate">
            {phase === "parti" ? `${booking.name} entre` : phase === "pret" ? "Relâchez : il entre" : "Faire entrer"}
          </span>
        </div>
      )}
      <div className="porte-contenu flex flex-col gap-3 p-4">
        <button type="button" onClick={onOpen} className="g-press flex flex-col gap-1.5 rounded-g-card text-left">
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0 text-g-body font-semibold leading-snug">{booking.name}</span>
            <span className="g-chip shrink-0 tabular-nums">{name}</span>
          </span>
          <span className="flex flex-wrap items-center gap-2 text-g-label text-muted">
            {party(booking.partySize)}
            {booking.shared && payers.length > 1 && (
              <span>
                · {payers.length} payeur{payers.length > 1 ? "s" : ""}
              </span>
            )}
            {deposit !== null ? (
              <span className="reste statut-pose">
                <span className="plan-legende" data-state="attente" aria-hidden />
                Acompte <span className="tabular-nums">{formatCents(deposit)}</span> · reste{" "}
                <span className="tabular-nums">{formatCents(remaining)}</span>
              </span>
            ) : remaining > 0 && booking.paidCents > 0 ? (
              <span className="reste statut-pose">
                <span className="plan-legende" data-state="attente" aria-hidden />
                Reste <span className="tabular-nums">{formatCents(remaining)}</span>
              </span>
            ) : (
              <StatusChip key={state} state={state} />
            )}
            {next && <span className="text-g-meta font-semibold text-ember-2">Suivant</span>}
          </span>
        </button>
        {booking.note && <p className="text-g-meta text-muted">Note : {booking.note}</p>}
        <div className="flex items-center gap-2">
          {state === "payee" && (
            <GlassButton variant={next ? "primary" : "secondary"} className="min-w-0 flex-1" onClick={() => void commit()}>
              Faire entrer
            </GlassButton>
          )}
          {state === "attente" && (
            <GlassButton variant={next ? "primary" : "secondary"} className="min-w-0 flex-1" onClick={() => void commit()}>
              <span className="porte-libelle">Encaisser {formatCents(remaining)} et faire entrer</span>
            </GlassButton>
          )}
          {booking.phone && (
            <a
              href={telHref(booking.phone)}
              draggable={false}
              aria-label={`Appeler ${booking.name}, ${formatPhone(booking.phone)}`}
              className="g-btn g-btn-icon g-press"
            >
              <PhoneIcon />
            </a>
          )}
          <GlassButton className={state === "payee" || state === "attente" ? "" : "ml-auto"} aria-label={`Fiche de ${booking.name}`} onClick={onOpen}>
            Fiche
          </GlassButton>
        </div>
        {hint && (
          <p className="text-g-meta text-muted">Astuce : glisser une table réglée vers la droite la fait entrer aussi.</p>
        )}
      </div>
    </div>
  );
}

export function DoorList({ held, onOpen }: { held: HeldTable[]; onOpen: (tableId: string) => void }) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("toutes");
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
    .filter((entry) => entry.state !== "arrivee" && (filter === "toutes" || entry.state === filter))
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
  const [rows, done] = usePresence(waiting, (entry) => entry.booking.id, `${query}|${filter}`);

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
      // Revenir dessus annule l'arrivée ; l'argent encaissé, lui, reste noté
      // (club_marquer_arrivee n'y touche pas) : la table redevient « payée ».
      const undo = () => {
        clubApi
          .markArrival({ ...booking, status: "arrivee", paidCents: booking.priceCents, remainingCents: 0 }, false)
          .catch((error: unknown) => toast.error(describeError(error).message));
      };
      if (collect > 0) {
        toast.notice(`${name} : ${formatCents(collect)} encaissés, ${booking.name} est entré(e).`, {
          label: "Annuler l'arrivée",
          onPress: undo,
        });
      } else {
        toast.notice(`${name} : ${booking.name} est entré(e).`, { label: "Annuler", onPress: undo });
      }
      return true;
    } catch (error) {
      toast.error(describeError(error).message);
      return false;
    }
  };

  const groupOf = (entry: Entry) => GROUPS[entry.state] ?? PAID_GROUP;

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 flex flex-col gap-2 bg-background pb-3">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, téléphone ou table"
          aria-label="Chercher une réservation"
          enterKeyHint="search"
        />
        <div className="seg-defile">
          <Segmented label="Filtrer les tables attendues" glass={false} options={FILTERS} value={filter} onChange={setFilter} />
        </div>
      </div>

      {held.length === 0 ? (
        <EmptyState text="Aucune table réservée pour l'instant : les réservations s'affichent ici en direct." />
      ) : (
        <>
          {rows.length === 0 ? (
            <p className="px-1 pb-4 text-g-body text-muted">
              {query
                ? "Personne d'attendu ne correspond."
                : filter === "toutes"
                  ? "Tout le monde est arrivé."
                  : "Aucune table attendue dans ce filtre."}
            </p>
          ) : (
            <ul className="flex flex-col">
              {rows.map(({ key, item, presence }, index) => {
                const group = groupOf(item);
                const opens = index === 0 || groupOf(rows[index - 1].item) !== group;
                return (
                  <li
                    key={key}
                    className="rangee"
                    data-presence={presence}
                    onAnimationEnd={(event) => {
                      if (event.target === event.currentTarget && presence === "sortie") done(key);
                    }}
                  >
                    <div className="pb-2">
                      {opens && (
                        <p className={`g-eyebrow px-1 pb-2 ${group.entity} ${index > 0 ? "pt-4" : ""}`}>
                          {group.label} · <span className="tabular-nums">{waiting.filter((entry) => groupOf(entry) === group).length}</span>
                        </p>
                      )}
                      <Plate className="overflow-hidden">
                        <DoorRow
                          entry={item}
                          next={item.booking.id === nextId}
                          hint={item.booking.id === hintId}
                          onOpen={() => onOpen(item.table.id)}
                          onArrive={() => arrive(item.booking, tableName(item.zoneName, item.table.label))}
                        />
                      </Plate>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {arrived.length > 0 && (
            <Plate className="mt-4">
              <details className="group">
                <summary className="flex min-h-g-control cursor-pointer list-none items-center justify-between gap-3 rounded-g-card px-4 text-g-label font-semibold [&::-webkit-details-marker]:hidden">
                  <span>
                    Tables arrivées · <span className="tabular-nums">{arrived.length}</span>
                  </span>
                  <svg viewBox="0 0 24 24" className="size-4 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <ul className="divide-y divide-hairline border-t border-hairline">
                  {arrived.map(({ booking, table, zoneName }) => (
                    <li key={booking.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(table.id)}
                        className="g-press flex min-h-g-control w-full items-center justify-between gap-3 px-4 py-2 text-left"
                      >
                        <span className="min-w-0 truncate text-g-body font-medium">{booking.name}</span>
                        <span className="shrink-0 text-g-meta text-muted tabular-nums">{tableName(zoneName, table.label)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            </Plate>
          )}
        </>
      )}
    </div>
  );
}
