"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { BullesSettings } from "@/components/gestion/bulles/settings";
import { NewReservationSheet, ReservationSheet, STATUS_LABELS } from "@/components/gestion/bulles/reservation-sheet";
import { inputClass } from "@/components/ui/field";
import { addDays, isoWeekday } from "@/lib/bulles/format";
import { bulleUrl } from "@/lib/bulles/links";
import { formatHours, formatNight } from "@/lib/club/format";
import { parisDate, parisInstant } from "@/lib/collect/hours";
import { loadSetup, useBulleDay, type BulleReservation, type BulleSetup } from "@/lib/gestion/bulles-api";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import type { Table } from "@/lib/gestion/types";

/*
 * L'onglet Bulles : le soir de service, créneau par créneau, ce que chaque
 * bulle a de réservé — confirmé (la bulle est tenue) ou en attente (des
 * groupes qui paient encore leurs places). L'accueil y coche les arrivées et
 * encaisse le reste ; le gérant y prend une réservation au téléphone et
 * règle prix, créneaux et bulles.
 */

type Slot = { startsAt: string; endsAt: string };

const held = (reservation: BulleReservation) =>
  reservation.status === "confirmee" || reservation.status === "arrivee";

const HOUR_MS = 3_600_000;

export default function BullesPage() {
  const state = useGestion();
  const { hasFeature, role } = useGestionAccess();
  const etablissementId = state?.etablissement.id;
  const [setup, setSetup] = useState<BulleSetup | null>(null);
  const [setupVersion, setSetupVersion] = useState(0);

  useEffect(() => {
    if (!etablissementId) return;
    let cancelled = false;
    void loadSetup(etablissementId).then((loaded) => {
      if (!cancelled) setSetup(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [etablissementId, setupVersion]);
  const reloadSetup = useCallback(() => setSetupVersion((count) => count + 1), []);

  if (state && !hasFeature("bulles")) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-2 py-16 text-center">
        <h1 className="font-display text-2xl font-medium">Bulles</h1>
        <p className="text-sm text-muted">La réservation de bulles s&rsquo;ouvre sur demande : parlez-en à Ominin.</p>
      </div>
    );
  }
  if (!state || !setup || !etablissementId) {
    return <div aria-busy className="h-64 animate-pulse rounded-3xl bg-surface" />;
  }
  return (
    <Board
      etablissementId={etablissementId}
      slug={state.etablissement.slug}
      dayEndHour={state.dayEndHour}
      tables={state.tables}
      gerant={role === "gerant"}
      setup={setup}
      reloadSetup={reloadSetup}
    />
  );
}

function Board({
  etablissementId,
  slug,
  dayEndHour,
  tables,
  gerant,
  setup,
  reloadSetup,
}: {
  etablissementId: string;
  slug: string;
  dayEndHour: number;
  tables: Table[];
  gerant: boolean;
  setup: BulleSetup;
  reloadSetup: () => void;
}) {
  // Le soir de service en cours : avant l'heure de bascule, c'est encore la veille.
  const [date, setDate] = useState(() => parisDate(new Date(Date.now() - dayEndHour * HOUR_MS)));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [opened, setOpened] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ bulleId: string; slot: Slot } | null>(null);
  const { reservations, error, refresh } = useBulleDay(etablissementId, date, dayEndHour);

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
  const closedCount = reservations?.filter((r) => r.status === "remboursee" || r.status === "annulee").length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">Bulles</h1>
          <p className="mt-1 text-sm text-muted">
            Les réservations du soir, en direct.{" "}
            <a href={bulleUrl(slug)} target="_blank" rel="noreferrer" className="text-ember-1 underline">
              Page de réservation
            </a>
          </p>
        </div>
        {gerant && (
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="min-h-11 rounded-full border border-hairline px-4 text-sm font-medium transition-colors hover:border-ember-2/40"
          >
            Réglages
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Soir précédent"
          onClick={() => setDate((current) => addDays(current, -1))}
          className="flex size-11 items-center justify-center rounded-full border border-hairline text-lg"
        >
          ‹
        </button>
        <div className="w-44">
          <input
            type="date"
            aria-label="Soir"
            value={date}
            onChange={(event) => event.target.value && setDate(event.target.value)}
            className={inputClass}
          />
        </div>
        <button
          type="button"
          aria-label="Soir suivant"
          onClick={() => setDate((current) => addDays(current, 1))}
          className="flex size-11 items-center justify-center rounded-full border border-hairline text-lg"
        >
          ›
        </button>
        <span className="text-sm text-muted">{formatNight(parisInstant(date, 12 * 60).toISOString())}</span>
      </div>

      {!setup.reglages ? (
        <p className="rounded-2xl border border-hairline p-5 text-sm text-muted">
          Les bulles ne sont pas encore réglées{gerant ? " : ouvrez les réglages pour fixer le prix et les créneaux." : "."}
        </p>
      ) : error ? (
        <p role="alert" className="rounded-2xl border border-ember-3/40 p-5 text-sm">
          Les réservations n&rsquo;ont pas pu se charger : {error}{" "}
          <button type="button" onClick={refresh} className="underline">
            Réessayer
          </button>
        </p>
      ) : !reservations ? (
        <div aria-busy className="h-64 animate-pulse rounded-3xl bg-surface" />
      ) : slots.length === 0 ? (
        <p className="rounded-2xl border border-hairline p-5 text-sm text-muted">
          Aucun créneau ce soir-là{gerant ? " : ajoutez-en dans les réglages." : "."}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {slots.map((slot) => (
            <li key={slot.startsAt} className="rounded-3xl border border-hairline bg-surface p-4">
              <h2 className="mb-3 font-display text-lg font-medium tabular-nums">{formatHours(slot.startsAt, slot.endsAt)}</h2>
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                {bulles
                  .filter((bulle) => bulle.active || reservations.some((r) => r.bulle_id === bulle.id && sameStart(r, slot)))
                  .map((bulle) => {
                    const here = reservations.filter((r) => r.bulle_id === bulle.id && sameStart(r, slot));
                    const holder = here.find(held);
                    const pending = here.filter((r) => r.status === "en_attente");
                    return (
                      <div
                        key={bulle.id}
                        className="flex min-h-28 flex-col gap-2 rounded-2xl border border-hairline bg-background p-3"
                        style={{ "--bulle": bulle.color } as CSSProperties}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <span aria-hidden className="size-3.5 rounded-full bg-(--bulle)" />
                          {bulle.name}
                          {bulle.table_id && tableNumber.has(bulle.table_id) && (
                            <span className="font-normal text-faint">· table {tableNumber.get(bulle.table_id)}</span>
                          )}
                        </div>
                        {holder ? (
                          <button
                            type="button"
                            onClick={() => setOpened(holder.id)}
                            className="flex flex-1 flex-col items-start gap-0.5 rounded-xl bg-surface-raised p-2.5 text-left text-sm transition-colors hover:bg-surface"
                          >
                            <span className="font-semibold">{holder.name}</span>
                            <span className="text-xs text-muted tabular-nums">
                              {holder.party_size} pers. · {holder.places_paid}/{holder.party_size} payées
                            </span>
                            <span className={`text-xs font-semibold ${holder.status === "arrivee" ? "text-ember-1" : "text-ember-2"}`}>
                              {STATUS_LABELS[holder.status]}
                            </span>
                          </button>
                        ) : gerant && bulle.active ? (
                          <button
                            type="button"
                            onClick={() => setCreating({ bulleId: bulle.id, slot })}
                            className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-dashed border-hairline text-sm text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
                          >
                            Libre · réserver
                          </button>
                        ) : (
                          <span className="flex-1 text-sm text-faint">Libre</span>
                        )}
                        {pending.map((group) => (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => setOpened(group.id)}
                            className="min-h-9 rounded-lg px-2 text-left text-xs text-muted underline-offset-2 hover:underline"
                          >
                            En attente · {group.name} ({group.places_paid}/{setup.reglages?.min_party} payées)
                          </button>
                        ))}
                      </div>
                    );
                  })}
              </div>
            </li>
          ))}
        </ul>
      )}
      {closedCount > 0 && (
        <p className="text-xs text-faint">
          {closedCount} réservation{closedCount > 1 ? "s" : ""} close{closedCount > 1 ? "s" : ""} ce soir (remboursée ou annulée).
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
      {settingsOpen && (
        <BullesSettings
          etablissementId={etablissementId}
          setup={setup}
          tables={[...tables].sort((a, b) => a.number - b.number)}
          dayEndHour={dayEndHour}
          onClose={() => setSettingsOpen(false)}
          onSaved={reloadSetup}
        />
      )}
    </div>
  );
}
