"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { BullesSettings } from "@/components/gestion/bulles/settings";
import { NewReservationSheet, ReservationSheet, STATUS_LABELS } from "@/components/gestion/bulles/reservation-sheet";
import { CheckIcon, ExternalLinkIcon, GearIcon } from "@/components/gestion/icons";
import { Chip, EmptyState, GlassButton, GlassFrame, Notice, Plate, SectionHeading, Shimmer } from "@/components/gestion/ui";
import { inputClass } from "@/components/ui/field";
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

      <div className="g-rise" style={rise(1)}>
        <GlassFrame entity="orders" className="w-fit max-w-full">
          <Plate className="flex items-center gap-1.5 p-1.5">
            <GlassButton variant="icon" aria-label="Soir précédent" onClick={() => onDateChange(addDays(date, -1))}>
              <ChevronIcon className="rotate-180" />
            </GlassButton>
            <input
              type="date"
              aria-label="Soir"
              value={date}
              onChange={(event) => event.target.value && onDateChange(event.target.value)}
              className={`${inputClass} w-44 border-transparent bg-transparent text-center font-medium tabular-nums`}
            />
            <GlassButton variant="icon" aria-label="Soir suivant" onClick={() => onDateChange(addDays(date, 1))}>
              <ChevronIcon />
            </GlassButton>
          </Plate>
        </GlassFrame>
      </div>

      {!setup.reglages ? (
        <div className="g-rise" style={rise(2)}>
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
        <div className="g-rise" style={rise(2)}>
          <Notice
            title="Les réservations ne se sont pas chargées"
            text={error}
            action={<GlassButton onClick={refresh}>Réessayer</GlassButton>}
          />
        </div>
      ) : !reservations ? (
        <div aria-busy className="g-rise grid gap-g-gap" style={rise(2)}>
          <Shimmer className="h-56" />
          <Shimmer className="h-56" />
        </div>
      ) : slots.length === 0 ? (
        <div className="g-rise" style={rise(2)}>
          <EmptyState
            text={`Aucun créneau le ${night}${gerant ? "" : "."}`}
            action={openSettings && <GlassButton onClick={openSettings}>Ajouter des créneaux</GlassButton>}
          />
        </div>
      ) : (
        <ul className="m-0 grid list-none gap-g-gap p-0" aria-label={`Créneaux du ${night}`}>
          {slots.map((slot, index) => (
            <li key={slot.startsAt} className="g-rise" style={rise(2 + index)}>
              <Plate className="px-4 pb-4 pt-3.5 sm:px-5">
                <h2 className="mb-3 font-display text-g-h2 tabular-nums">{formatHours(slot.startsAt, slot.endsAt)}</h2>
                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                  {bulles
                    .filter((bulle) => bulle.active || reservations.some((r) => r.bulle_id === bulle.id && sameStart(r, slot)))
                    .map((bulle) => {
                      const here = reservations.filter((r) => r.bulle_id === bulle.id && sameStart(r, slot));
                      const holder = here.find(held);
                      const pending = here.filter((r) => r.status === "en_attente");
                      const table = bulle.table_id ? tableNumber.get(bulle.table_id) : undefined;
                      return (
                        <div
                          key={bulle.id}
                          className="flex min-h-28 flex-col gap-2 rounded-g-card border border-hairline bg-background p-2.5"
                          style={{ "--bulle": bulle.color } as CSSProperties}
                        >
                          <p className="flex items-center gap-2 text-g-label font-semibold">
                            <span aria-hidden className="size-3 shrink-0 rounded-full bg-(--bulle)" />
                            <span className="truncate">{bulle.name}</span>
                            {table !== undefined && (
                              <span className="ml-auto whitespace-nowrap text-g-meta font-medium text-muted tabular-nums">T{table}</span>
                            )}
                          </p>
                          {holder ? (
                            <button
                              type="button"
                              onClick={() => setOpened(holder.id)}
                              className="g-press flex min-h-(--g-row-h) flex-1 flex-col items-start gap-1 rounded-[calc(var(--g-radius-card)-0.375rem)] bg-surface-raised p-2.5 text-left"
                            >
                              <span className="w-full truncate font-semibold">{holder.name}</span>
                              <span className="text-g-meta text-muted tabular-nums">
                                {holder.party_size} pers. · {holder.places_paid}/{holder.party_size} payées
                              </span>
                              <span className="mt-auto">
                                <Chip icon={holder.status === "arrivee" ? <CheckIcon /> : undefined}>
                                  {STATUS_LABELS[holder.status]}
                                </Chip>
                              </span>
                            </button>
                          ) : gerant && bulle.active ? (
                            <button
                              type="button"
                              onClick={() => setCreating({ bulleId: bulle.id, slot })}
                              className="g-press flex min-h-(--g-row-h) flex-1 items-center justify-center rounded-[calc(var(--g-radius-card)-0.375rem)] border border-dashed border-hairline text-g-label text-muted"
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
                              className="g-press flex min-h-9 items-center justify-between gap-2 rounded-lg px-1.5 text-left text-g-meta text-muted"
                            >
                              <span className="truncate">En attente · {group.name}</span>
                              <span className="whitespace-nowrap tabular-nums">
                                {group.places_paid}/{setup.reglages?.min_party}
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
