"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { BullesSettings } from "@/components/gestion/bulles/settings";
import { NewReservationSheet, ReservationSheet, STATUS_LABELS } from "@/components/gestion/bulles/reservation-sheet";
import { CheckIcon, ExternalLinkIcon, GearIcon } from "@/components/gestion/icons";
import { Chip, EmptyState, ErrorNotice, GlassButton, Input, Plate, SectionHeading, Shimmer } from "@/components/gestion/ui";
import { addDays, isoWeekday } from "@/lib/bulles/format";
import { bulleUrl } from "@/lib/bulles/links";
import { formatHours, formatNight } from "@/lib/club/format";
import { parisInstant } from "@/lib/collect/hours";
import type { BulleDay, BulleReservation, BulleSetup } from "@/lib/gestion/bulles-api";
import type { Table } from "@/lib/gestion/types";

/*
 * Le soir de service des bulles, créneau par créneau : ce que chaque bulle a
 * de réservé — confirmé (la bulle est tenue) ou en attente (des groupes qui
 * paient encore leurs places). L'accueil y coche les arrivées et encaisse le
 * reste ; le gérant y prend une réservation au téléphone et règle prix,
 * créneaux et bulles. Les données et les gestes viennent de l'appelant.
 */

type Slot = { startsAt: string; endsAt: string };

const held = (reservation: BulleReservation) =>
  reservation.status === "confirmee" || reservation.status === "arrivee";

const rise = (i: number) => ({ "--g-i": i }) as CSSProperties;
const CELL_RADIUS = "rounded-[calc(var(--g-radius-card)-var(--g-pad))]";
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1";

export function BullesBoard({
  slug,
  dayEndHour,
  tables,
  gerant,
  setup,
  date,
  onDateChange,
  day,
  settings,
}: {
  slug: string;
  dayEndHour: number;
  tables: Table[];
  /** Prendre une réservation au téléphone, annuler. */
  gerant: boolean;
  setup: BulleSetup;
  date: string;
  onDateChange: (date: string) => void;
  day: BulleDay;
  /** Les réglages (prix, créneaux, bulles) ; absents, le bouton n'est pas proposé. */
  settings?: { etablissementId: string; onSaved: () => void };
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [opened, setOpened] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ bulleId: string; slot: Slot } | null>(null);
  const { reservations, error, refresh } = day;

  const duration = setup.reglages?.duration_minutes ?? 0;
  // Les créneaux du soir, plus l'heure de toute réservation prise en dehors.
  const slots = useMemo<Slot[]>(() => {
    const starts = new Map<string, Slot>();
    for (const creneau of setup.creneaux.filter((c) => c.weekday === isoWeekday(date))) {
      const start = parisInstant(date, creneau.start_minutes);
      starts.set(start.toISOString(), {
        startsAt: start.toISOString(),
        endsAt: new Date(start.getTime() + duration * 60_000).toISOString(),
      });
    }
    for (const reservation of reservations ?? []) {
      const startsAt = new Date(reservation.starts_at).toISOString();
      if (!starts.has(startsAt)) starts.set(startsAt, { startsAt, endsAt: reservation.ends_at });
    }
    return [...starts.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [setup.creneaux, date, duration, reservations]);

  const bulles = setup.bulles;
  const bulleById = new Map(bulles.map((bulle) => [bulle.id, bulle]));
  const tableNumber = new Map(tables.map((table) => [table.id, table.number]));
  const sameStart = (reservation: BulleReservation, slot: Slot) =>
    Date.parse(reservation.starts_at) === Date.parse(slot.startsAt);
  const openedReservation = reservations?.find((reservation) => reservation.id === opened);
  const creatingBulle = creating && bulleById.get(creating.bulleId);
  const open = reservations?.filter((r) => r.status !== "remboursee" && r.status !== "annulee") ?? [];
  const closedCount = (reservations?.length ?? 0) - open.length;
  const arrived = open.filter((r) => r.status === "arrivee").length;
  const night = formatNight(parisInstant(date, 12 * 60).toISOString());
  const openSettings = settings ? () => setSettingsOpen(true) : undefined;

  return (
    <div className="grid gap-6">
      <div className="g-rise" style={rise(0)}>
        <SectionHeading
          level={1}
          title="Réservations"
          sub={
            reservations && setup.reglages
              ? `${night} · ${open.length} ${open.length > 1 ? "réservations" : "réservation"}${arrived ? ` · ${arrived} ${arrived > 1 ? "arrivées" : "arrivée"}` : ""}`
              : night
          }
          right={
            <div className="flex items-center gap-2">
              <a
                href={bulleUrl(slug)}
                target="_blank"
                rel="noreferrer"
                className="g-btn g-btn-secondary g-press"
                title="La page où vos clients réservent"
              >
                Page de réservation
                <ExternalLinkIcon />
              </a>
              {openSettings && (
                <GlassButton variant="icon" aria-label="Réglages des réservations" title="Prix, créneaux et bulles" onClick={openSettings}>
                  <GearIcon />
                </GlassButton>
              )}
            </div>
          }
        />
      </div>

      <div className="g-rise flex items-center gap-2" style={rise(1)}>
        <GlassButton variant="icon" aria-label="Soir précédent" onClick={() => onDateChange(addDays(date, -1))}>
          <ChevronIcon className="rotate-180" />
        </GlassButton>
        <Input
          type="date"
          aria-label="Soir"
          value={date}
          onChange={(event) => event.target.value && onDateChange(event.target.value)}
          className="min-w-0 flex-1 font-medium tabular-nums sm:max-w-56 sm:flex-none"
        />
        <GlassButton variant="icon" aria-label="Soir suivant" onClick={() => onDateChange(addDays(date, 1))}>
          <ChevronIcon />
        </GlassButton>
      </div>

      {!setup.reglages ? (
        <div>
          <EmptyState
            text={
              gerant
                ? "Réglez le prix, la durée et les créneaux : le tableau du soir s'ouvre ensuite."
                : "Les réservations ne sont pas encore réglées : le gérant s'en charge."
            }
            action={openSettings && <GlassButton variant="primary" onClick={openSettings}>Régler les réservations</GlassButton>}
          />
        </div>
      ) : error ? (
        <div>
          <ErrorNotice error={new Error(error)} onRetry={refresh} />
        </div>
      ) : !reservations ? (
        <div aria-busy className="grid gap-g-gap">
          <Shimmer className="h-56" />
          <Shimmer className="h-56" />
        </div>
      ) : slots.length === 0 ? (
        <div>
          <EmptyState
            text={`Aucun créneau le ${night}.`}
            action={openSettings && <GlassButton onClick={openSettings}>Ajouter des créneaux</GlassButton>}
          />
        </div>
      ) : bulles.length === 0 ? (
        <div>
          <EmptyState
            text={gerant ? "Aucune bulle : ajoutez-en une pour la proposer à la réservation." : "Aucune bulle en service."}
            action={openSettings && <GlassButton onClick={openSettings}>Ajouter une bulle</GlassButton>}
          />
        </div>
      ) : (
        <ul className="m-0 grid list-none gap-g-gap p-0" aria-label={`Créneaux du ${night}`}>
          {slots.map((slot) => (
            <li key={slot.startsAt}>
              <Plate className="px-4 pb-4 pt-3.5 sm:px-5">
                <h2 className="mb-3 font-display text-g-h2 tabular-nums">{formatHours(slot.startsAt, slot.endsAt)}</h2>
                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                  {bulles
                    .filter((bulle) => bulle.active || reservations.some((r) => r.bulle_id === bulle.id && sameStart(r, slot)))
                    .map((bulle) => {
                      const here = reservations.filter((r) => r.bulle_id === bulle.id && sameStart(r, slot));
                      const holder = here.find(held);
                      const pending = here.filter((r) => r.status === "en_attente");
                      const left = holder ? holder.party_size - holder.places_paid : 0;
                      const table = bulle.table_id ? tableNumber.get(bulle.table_id) : undefined;
                      const where = `${bulle.name}, ${formatHours(slot.startsAt, slot.endsAt)}`;
                      return (
                        <div
                          key={bulle.id}
                          role="group"
                          aria-label={where}
                          className="flex min-h-28 flex-col gap-2 rounded-g-card border border-hairline bg-background p-2.5"
                          style={{ "--bulle": bulle.color } as CSSProperties}
                        >
                          <p className="flex items-center gap-2 text-g-label font-semibold">
                            <span aria-hidden className="size-3 shrink-0 rounded-full bg-(--bulle)" />
                            <span className="truncate">{bulle.name}</span>
                            {table !== undefined && (
                              <span title={`Table ${table}`} aria-label={`Table ${table}`} className="ml-auto whitespace-nowrap text-g-meta font-medium text-muted tabular-nums">T{table}</span>
                            )}
                          </p>
                          {holder ? (
                            <button
                              type="button"
                              onClick={() => setOpened(holder.id)}
                              className={`g-press flex min-h-(--g-row-h) flex-1 flex-col items-start gap-1 ${CELL_RADIUS} p-2.5 text-left ${FOCUS} ${holder.status === "arrivee" ? "border border-hairline" : "bg-surface-raised"}`}
                            >
                              <span className="line-clamp-2 w-full break-words font-semibold">{holder.name}</span>
                              <span className="text-g-meta text-muted tabular-nums">{holder.party_size} pers.</span>
                              <span className="mt-auto flex flex-wrap gap-1 pt-1">
                                <Chip icon={holder.status === "arrivee" ? <CheckIcon /> : undefined}>
                                  {STATUS_LABELS[holder.status]}
                                </Chip>
                                {left > 0 && (
                                  <Chip tone="problem">
                                    Reste {left} {left > 1 ? "places" : "place"}
                                  </Chip>
                                )}
                              </span>
                            </button>
                          ) : gerant && bulle.active ? (
                            <button
                              type="button"
                              onClick={() => setCreating({ bulleId: bulle.id, slot })}
                              aria-label={`Réserver ${where}`}
                              className={`g-press flex min-h-(--g-row-h) flex-1 items-center justify-center ${CELL_RADIUS} border border-dashed border-hairline text-g-label text-muted ${FOCUS}`}
                            >
                              Libre · réserver
                            </button>
                          ) : (
                            <span className="flex flex-1 items-center text-g-label text-faint">Libre</span>
                          )}
                          {pending.map((group) => (
                            <button
                              key={group.id}
                              type="button"
                              onClick={() => setOpened(group.id)}
                              aria-label={`En attente, ${group.name}, ${group.places_paid} sur ${setup.reglages?.min_party} places payées`}
                              className={`g-press flex min-h-(--g-control) items-center justify-between gap-2 ${CELL_RADIUS} px-1.5 text-left text-g-meta text-muted ${FOCUS}`}
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate">En attente · {group.name}</span>
                                <span className="block tabular-nums">
                                  {group.places_paid} sur {setup.reglages?.min_party} minimum
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                </div>
              </Plate>
            </li>
          ))}
        </ul>
      )}
      {closedCount > 0 && (
        <p className="text-g-meta text-muted">
          {closedCount} {closedCount > 1 ? "réservations closes" : "réservation close"} ce soir (remboursée ou annulée).
        </p>
      )}

      {openedReservation && (
        <ReservationSheet
          reservation={openedReservation}
          bulle={bulleById.get(openedReservation.bulle_id)}
          gerant={gerant}
          onClose={() => setOpened(null)}
          onChanged={refresh}
        />
      )}
      {creating && creatingBulle && setup.reglages && (
        <NewReservationSheet
          bulle={creatingBulle}
          startsAt={creating.slot.startsAt}
          endsAt={creating.slot.endsAt}
          maxParty={setup.reglages.max_party}
          pendingGroups={
            reservations?.filter(
              (r) => r.status === "en_attente" && r.bulle_id === creating.bulleId && sameStart(r, creating.slot)
            ).length ?? 0
          }
          onClose={() => setCreating(null)}
          onChanged={refresh}
        />
      )}
      {settingsOpen && settings && (
        <BullesSettings
          etablissementId={settings.etablissementId}
          setup={setup}
          tables={[...tables].sort((a, b) => a.number - b.number)}
          dayEndHour={dayEndHour}
          onClose={() => setSettingsOpen(false)}
          onSaved={settings.onSaved}
        />
      )}
    </div>
  );
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
