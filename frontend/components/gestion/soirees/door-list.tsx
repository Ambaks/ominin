"use client";

import { useEffect, useRef, useState } from "react";
import type { TableState } from "@/components/club/floor-plan";
import { CheckIcon, PhoneIcon } from "@/components/gestion/icons";
import { EmptyState, GlassButton, Input, Plate, Segmented } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import type { ClubBooking, ClubDroit, ClubTable } from "@/lib/club/types";
import { formatCents, formatTime, tableName } from "@/lib/club/format";
import * as clubApi from "@/lib/gestion/club-api";
import {
  formatPhone,
  matchesSearch,
  nextGesture,
  staffTableState,
  telHref,
  type Gesture,
  type NightStep,
} from "@/lib/gestion/club-selectors";
import { describeError } from "@/lib/gestion/errors";
import { StatusChip } from "./night-plan";
import { usePresence } from "./use-presence";

/*
 * Les réservations du soir en une liste, rangées par temps de la soirée :
 * celles qu'on attend (la plus ancienne en tête, signalée), celles arrivées
 * qu'il faut installer, celles assises ; les parties repliées dessous.
 * Chaque rangée porte le geste du poste qui la regarde — faire entrer,
 * placer, encaisser et installer, marquer le départ —, l'appel si un numéro
 * est laissé, et sa fiche. Un geste sans argent se fait aussi d'un glissé
 * vers la droite ; l'annonce qui suit permet de revenir dessus.
 */

/** Glissé (px) qui valide le geste ; au-delà, l'étiquette le dit et le lâcher suffit. */
const SWIPE_COMMIT = 96;
/** Glissé (px) à partir duquel la rangée suit le doigt plutôt que le défilement. */
const SWIPE_START = 10;
/** Vitesse (px/ms) d'un lancer qui valide avant le seuil. */
const FLICK_SPEED = 0.6;
/** Glissé (px) minimal d'un lancer : un doigt qui tremble sur un appui ne valide rien. */
const FLICK_MIN = 40;
/** Vibration (ms) qui confirme sous le doigt que le geste part. */
const COMMIT_BUZZ = 10;
/** L'astuce du glissé ne se montre qu'une fois par appareil. */
const SWIPE_HINT_KEY = "ominin-soirees-glisse-vu";

export type HeldTable = {
  booking: ClubBooking;
  /** Null : à placer. */
  table: ClubTable | null;
  zoneName: string;
  /** Les amis qui ont payé leur part en ligne (table partagée). */
  payers: string[];
  /** Acompte réglé en ligne (table non partagée), frais compris ; null sinon. */
  deposit: number | null;
};
type Entry = HeldTable & { state: TableState; gesture: Gesture | null };
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

type Section = "attendues" | "arrivees" | "assises";
type Filter = "toutes" | Section;

const SECTION_OF: Partial<Record<TableState, Section>> = {
  payee: "attendues",
  attente: "attendues",
  prise: "attendues",
  arrivee: "arrivees",
  assise: "assises",
};

/** Les sections, dans l'ordre de la soirée. */
const SECTIONS: { value: Section; label: string; entity: string }[] = [
  { value: "attendues", label: "Attendues", entity: "g-orders" },
  { value: "arrivees", label: "Arrivées, à installer", entity: "g-money" },
  { value: "assises", label: "Assises", entity: "" },
];

const FILTERS: { value: Filter; label: string }[] = [
  { value: "toutes", label: "Toutes" },
  { value: "attendues", label: "Attendues" },
  { value: "arrivees", label: "Arrivées" },
  { value: "assises", label: "Assises" },
];

/** Ce que dit l'annonce d'un geste, et le temps d'avant pour revenir dessus. */
const DONE: Record<Exclude<NightStep, "payee">, { text: (name: string) => string; back: NightStep }> = {
  arrivee: { text: (name) => `${name} est entré(e).`, back: "payee" },
  assise: { text: (name) => `${name} est installé(e).`, back: "arrivee" },
  partie: { text: (name) => `${name} est parti(e), table libérée.`, back: "assise" },
};

function DoorRow({
  entry,
  next,
  hint,
  onOpen,
  onPlace,
  onStep,
  money,
}: {
  entry: Entry;
  next: boolean;
  hint: boolean;
  /** Le poste voit l'argent (droit « acomptes ») : acompte et reste sur la rangée. */
  money: boolean;
  onOpen: () => void;
  onPlace: () => void;
  /** Passe au temps suivant (et encaisse d'abord le reste s'il y en a) ; résout faux si la base refuse : la rangée revient. */
  onStep: () => Promise<boolean>;
}) {
  const { booking, table, zoneName, state, payers, deposit, gesture } = entry;
  const remaining = booking.remainingCents;
  const row = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ id: number; x: number; y: number; dx: number; t: number; speed: number; active: boolean; armed: boolean } | null>(null);
  const committing = useRef(false);
  const [phase, setPhase] = useState<Phase>("repos");
  // Glisser fait le geste de la rangée ; l'argent, lui, se prend d'un geste visible.
  const canSwipe = gesture?.kind === "step" && gesture.collect === 0;
  const place = table ? tableName(zoneName, table.label) : `À placer · ${zoneName}`;

  const setOffset = (dx: number) => {
    row.current?.style.setProperty("--glisse", `${dx}px`);
    row.current?.style.setProperty("--progres", String(Math.min(dx / SWIPE_COMMIT, 1)));
  };

  const commit = async () => {
    // Un double appui, ou un glissé puis un appui : un seul geste, une seule annonce.
    if (committing.current) return;
    committing.current = true;
    navigator.vibrate?.(COMMIT_BUZZ);
    setPhase("parti");
    setOffset(row.current?.offsetWidth ?? 0);
    if (await onStep()) return;
    committing.current = false;
    setPhase("repos");
    setOffset(0);
  };

  return (
    <div
      ref={row}
      className="porte-rangee"
      data-phase={phase}
      data-a-regler={(gesture?.kind === "step" && gesture.collect > 0) || undefined}
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
        const nextDx = Math.max(0, dx);
        // Vitesse du dernier déplacement : un lancer rapide vaut un glissé jusqu'au seuil.
        current.speed = (nextDx - current.dx) / Math.max(event.timeStamp - current.t, 1);
        current.t = event.timeStamp;
        current.dx = nextDx;
        setOffset(current.dx);
        const armed = current.dx >= SWIPE_COMMIT;
        // Un cran sous le doigt au passage du seuil : lâcher valide.
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
            {phase === "parti" ? booking.name : phase === "pret" ? "Relâchez" : gesture?.label}
          </span>
        </div>
      )}
      <div className="porte-contenu flex flex-col gap-3 p-4">
        <button type="button" onClick={onOpen} className="g-press flex flex-col gap-1.5 rounded-g-card text-left">
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0 text-g-body font-semibold leading-snug">{booking.name}</span>
            <span className={`g-chip shrink-0 tabular-nums ${table ? "" : "text-ember-1"}`}>{place}</span>
          </span>
          <span className="flex flex-wrap items-center gap-2 text-g-label text-muted">
            {party(booking.partySize)}
            {booking.arrivalAt && <span className="tabular-nums">· {formatTime(booking.arrivalAt)}</span>}
            {booking.shared && payers.length > 1 && (
              <span>
                · {payers.length} payeur{payers.length > 1 ? "s" : ""}
              </span>
            )}
            {money && deposit !== null && remaining > 0 ? (
              <span className="reste statut-pose">
                <span className="plan-legende" data-state="attente" aria-hidden />
                Acompte <span className="tabular-nums">{formatCents(deposit)}</span> · reste{" "}
                <span className="tabular-nums">{formatCents(remaining)}</span>
              </span>
            ) : money && remaining > 0 && booking.paidCents > 0 ? (
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
          {gesture && (
            <GlassButton
              variant={next ? "primary" : "secondary"}
              className="min-w-0 flex-1"
              onClick={() => (gesture.kind === "placer" ? onPlace() : void commit())}
            >
              <span className="porte-libelle">{gesture.label}</span>
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
          <GlassButton className={gesture ? "" : "ml-auto"} aria-label={`Fiche de ${booking.name}`} onClick={onOpen}>
            Fiche
          </GlassButton>
        </div>
        {hint && <p className="text-g-meta text-muted">Astuce : glisser la rangée vers la droite fait le même geste.</p>}
      </div>
    </div>
  );
}

export function DoorList({
  held,
  departed,
  droits,
  onOpen,
  onPlace,
}: {
  /** Les réservations tenues ce soir, placées ou non. */
  held: HeldTable[];
  /** Les réservations parties, la table libérée. */
  departed: HeldTable[];
  droits: Set<ClubDroit>;
  onOpen: (bookingId: string) => void;
  onPlace: (bookingId: string) => void;
}) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("toutes");
  const [hintSeen] = useState(readHintSeen);

  const search = (entry: HeldTable) =>
    matchesSearch(query, [
      entry.booking.name,
      entry.booking.phone,
      entry.zoneName,
      ...(entry.table ? [entry.table.label, tableName(entry.zoneName, entry.table.label)] : []),
      ...entry.payers,
    ]);
  const entries: Entry[] = held
    .map((entry) => ({ ...entry, state: staffTableState(entry.booking, true), gesture: nextGesture(entry.booking, droits) }))
    .filter(search);
  // Dans l'ordre de la soirée ; dans chaque temps, ce qui attend un geste
  // de ce poste d'abord, puis l'heure d'arrivée prévue, puis la réservation
  // la plus ancienne.
  const arrivalKey = (entry: Entry) => (entry.booking.arrivalAt ? Date.parse(entry.booking.arrivalAt) : Number.POSITIVE_INFINITY);
  const sectionRank = (entry: Entry) => SECTIONS.findIndex((section) => section.value === SECTION_OF[entry.state]);
  const rows = entries
    .filter((entry) => filter === "toutes" || SECTION_OF[entry.state] === filter)
    .sort(
      (a, b) =>
        sectionRank(a) - sectionRank(b) ||
        Number(b.gesture !== null) - Number(a.gesture !== null) ||
        arrivalKey(a) - arrivalKey(b) ||
        Date.parse(a.booking.createdAt) - Date.parse(b.booking.createdAt)
    );
  const left = departed
    .filter(search)
    .sort((a, b) => Date.parse(b.booking.leftAt ?? "") - Date.parse(a.booking.leftAt ?? ""));
  const nextId = rows.find((entry) => entry.gesture !== null)?.booking.id;
  const hintId = hintSeen
    ? undefined
    : rows.find((entry) => entry.gesture?.kind === "step" && entry.gesture.collect === 0)?.booking.id;
  const [shown, done] = usePresence(rows, (entry) => entry.booking.id, `${query}|${filter}`);

  // L'astuce montrée, elle ne revient plus sur cet appareil.
  useEffect(() => {
    if (!hintId) return;
    try {
      window.localStorage.setItem(SWIPE_HINT_KEY, "1");
    } catch {
      // Stockage refusé (navigation privée) : l'astuce reviendra, rien de plus.
    }
  }, [hintId]);

  const step = async (entry: Entry): Promise<boolean> => {
    const { booking, gesture } = entry;
    if (gesture?.kind !== "step") return false;
    try {
      await clubApi.setBookingStatus(booking, gesture.to, gesture.collect > 0);
      const { text, back } = DONE[gesture.to];
      const undo = () => {
        clubApi
          .setBookingStatus(
            { ...booking, status: gesture.to, paidCents: booking.paidCents + gesture.collect, remainingCents: booking.remainingCents - gesture.collect },
            back
          )
          .catch((error: unknown) => toast.error(describeError(error).message));
      };
      toast.notice(
        `${gesture.collect > 0 ? `${formatCents(gesture.collect)} encaissés. ` : ""}${text(booking.name)}`,
        { label: "Annuler", onPress: undo }
      );
      return true;
    } catch (error) {
      toast.error(describeError(error).message);
      return false;
    }
  };

  const sectionOf = (entry: Entry) => SECTIONS.find((section) => section.value === SECTION_OF[entry.state]) ?? SECTIONS[0];

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
          <Segmented label="Filtrer les réservations" glass={false} options={FILTERS} value={filter} onChange={setFilter} />
        </div>
      </div>

      {held.length === 0 && departed.length === 0 ? (
        <EmptyState text="Aucune réservation pour l'instant : elles s'affichent ici en direct." />
      ) : (
        <>
          {shown.length === 0 ? (
            <p className="px-1 pb-4 text-g-body text-muted">
              {query ? "Aucune réservation ne correspond." : filter === "toutes" ? "Tout le monde est parti." : "Personne dans ce filtre."}
            </p>
          ) : (
            <ul className="flex flex-col">
              {shown.map(({ key, item, presence }, index) => {
                const section = sectionOf(item);
                const opens = index === 0 || sectionOf(shown[index - 1].item) !== section;
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
                        <p className={`g-eyebrow px-1 pb-2 ${section.entity} ${index > 0 ? "pt-4" : ""}`}>
                          {section.label} · <span className="tabular-nums">{rows.filter((entry) => sectionOf(entry) === section).length}</span>
                        </p>
                      )}
                      <Plate className="overflow-hidden">
                        <DoorRow
                          entry={item}
                          next={item.booking.id === nextId}
                          hint={item.booking.id === hintId}
                          onOpen={() => onOpen(item.booking.id)}
                          onPlace={() => onPlace(item.booking.id)}
                          onStep={() => step(item)}
                          money={droits.has("acomptes")}
                        />
                      </Plate>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {left.length > 0 && (
            <Plate className="mt-4">
              <details className="group">
                <summary className="flex min-h-g-control cursor-pointer list-none items-center justify-between gap-3 rounded-g-card px-4 text-g-label font-semibold [&::-webkit-details-marker]:hidden">
                  <span>
                    Parties · <span className="tabular-nums">{left.length}</span>
                  </span>
                  <svg viewBox="0 0 24 24" className="size-4 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <ul className="divide-y divide-hairline border-t border-hairline">
                  {left.map(({ booking, table, zoneName }) => (
                    <li key={booking.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(booking.id)}
                        className="g-press flex min-h-g-control w-full items-center justify-between gap-3 px-4 py-2 text-left"
                      >
                        <span className="min-w-0 truncate text-g-body font-medium">{booking.name}</span>
                        <span className="shrink-0 text-g-meta text-muted tabular-nums">
                          {table ? tableName(zoneName, table.label) : zoneName}
                        </span>
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
