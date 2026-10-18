"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { TableState } from "@/components/club/floor-plan";
import { BookingSheet } from "@/components/gestion/soirees/booking-sheet";
import {
  BackToSoirees,
  ClubLoadError,
  ClubLocked,
  ClubSkeleton,
  NightNotFound,
} from "@/components/gestion/soirees/club-states";
import { GuestList } from "@/components/gestion/soirees/guest-list";
import { NightPlan, PlanLegend } from "@/components/gestion/soirees/night-plan";
import { inputClass } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useToast } from "@/components/ui/toast";
import { formatCents, formatHours, formatNight } from "@/lib/club/format";
import type { ClubBooking, ClubTable } from "@/lib/club/types";
import {
  bookingsByTable,
  isTonight,
  matchesSearch,
  nightStats,
  onSaleTableIds,
  people,
  staffTableState,
  TABLE_STATE_LABELS,
  tablePrice,
} from "@/lib/gestion/club-selectors";
import {
  acknowledgeArrival,
  onClubArrival,
  useClub,
  useClubLoadError,
  useClubNights,
  useClubRealtime,
} from "@/lib/gestion/club-store";
import { WAIT_TICK_MS } from "@/lib/gestion/constants";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import { useNow } from "@/lib/gestion/use-now";

/*
 * Le plan du soir, à la porte ou au comptoir VIP, sur un téléphone : chaque
 * table dans son état, en direct (une table réservée en ligne s'y allume),
 * sa réservation d'un geste, et la liste d'invités. L'équipe pointe les
 * arrivées ; le gérant seul saisit, annule et rembourse.
 */

type View = "plan" | "liste" | "invites";

const LEGEND: TableState[] = ["libre", "payee", "attente", "arrivee", "prise", "gardee"];

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-hairline bg-surface px-3.5 py-2.5 sm:px-4 sm:py-3">
      <dt className="truncate text-[10px] font-semibold uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-0.5 truncate font-display text-lg font-medium tabular-nums sm:text-xl">{value}</dd>
      {hint && <dd className="truncate text-[11px] text-muted">{hint}</dd>}
    </div>
  );
}

export default function LivePage() {
  const { id } = useParams<{ id: string }>();
  const state = useGestion();
  const { can, hasFeature } = useGestionAccess();
  const club = useClub();
  const error = useClubLoadError();
  const live = useClubRealtime();
  const toast = useToast();
  const now = useNow(WAIT_TICK_MS).getTime();
  useClubNights([id]);
  const [view, setView] = useState<View>("plan");
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const tables = club?.tables;
  // Une table réservée en ligne pendant que le plan est ouvert : annoncée,
  // et touchable depuis l'annonce.
  useEffect(
    () =>
      onClubArrival(({ booking, eventId }) => {
        if (eventId !== id) return;
        const table = tables?.find((candidate) => candidate.id === booking.tableId);
        if (!table) return;
        toast.notice(`Table ${table.label} réservée en ligne · ${booking.name}`, {
          label: "Voir",
          onPress: () => {
            setView("plan");
            setZoneId(table.zoneId);
            setSelectedId(table.id);
          },
        });
      }),
    [id, tables, toast]
  );

  if (!state) return null;
  if (!hasFeature("soirees")) return <ClubLocked />;
  if (!club) return error ? <ClubLoadError message={error} /> : <ClubSkeleton />;
  const event = club.events.find((candidate) => candidate.id === id);
  if (!event) return <NightNotFound />;
  const night = club.nights[event.id];
  if (!night) return error ? <ClubLoadError message={error} /> : <ClubSkeleton />;

  const gerant = can("soirees.edit");
  const tonight = isTonight(event, now);
  const stats = nightStats(club, event.id);
  const byTable = bookingsByTable(night, now);
  const onSale = onSaleTableIds(club, event.id);
  const openZones = new Set((club.eventZones[event.id] ?? []).map((setting) => setting.zoneId));
  // Les zones du soir d'abord ; une zone fermée ne s'affiche que si le club
  // y a quand même placé quelqu'un.
  const zones = club.zones.filter(
    (zone) =>
      openZones.has(zone.id) ||
      club.tables.some((table) => table.zoneId === zone.id && byTable.has(table.id))
  );
  const zone = zones.find((candidate) => candidate.id === zoneId) ?? zones[0];
  const zoneTables = zone ? club.tables.filter((table) => table.zoneId === zone.id) : [];
  const states: Record<string, TableState> = Object.fromEntries(
    zoneTables.map((table) => [table.id, staffTableState(byTable.get(table.id), onSale.has(table.id))])
  );
  const pings = club.arrivals
    .filter((arrival) => arrival.eventId === event.id)
    .flatMap((arrival) => {
      const table = zoneTables.find((candidate) => candidate.id === arrival.booking.tableId);
      return table ? [{ id: arrival.booking.id, table }] : [];
    });
  const zoneName = new Map(club.zones.map((candidate) => [candidate.id, candidate.name]));
  const zoneSort = new Map(club.zones.map((candidate) => [candidate.id, candidate.sort]));
  const tableById = new Map(club.tables.map((table) => [table.id, table]));

  const describe = (table: ClubTable, tableState: TableState) => {
    const booking = byTable.get(table.id);
    return [
      `Table ${table.label}`,
      `${table.seats} places`,
      TABLE_STATE_LABELS[tableState]?.toLowerCase(),
      booking ? `${booking.name}, ${people(booking.partySize)}` : formatCents(tablePrice(club, event.id, table)),
    ]
      .filter(Boolean)
      .join(", ");
  };

  const held: { booking: ClubBooking; table: ClubTable }[] = [...byTable.values()]
    .flatMap((booking) => {
      const table = tableById.get(booking.tableId);
      return table ? [{ booking, table }] : [];
    })
    .sort(
      (a, b) =>
        (zoneSort.get(a.table.zoneId) ?? 0) - (zoneSort.get(b.table.zoneId) ?? 0) ||
        a.table.label.localeCompare(b.table.label, "fr", { numeric: true })
    );
  const listed = held.filter(({ booking, table }) =>
    matchesSearch(query, [booking.name, booking.phone, table.label])
  );
  const guestList = event.guestListOpen || night.guests.length > 0;
  const views = [
    { id: "plan", label: "Plan" },
    { id: "liste", label: "Liste", count: held.length },
    ...(guestList ? [{ id: "invites", label: "Invités", count: stats.guests }] : []),
  ];

  const selected = selectedId ? tableById.get(selectedId) : undefined;
  const selectedZone = selected ? club.zones.find((candidate) => candidate.id === selected.zoneId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackToSoirees />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-medium tracking-tight lg:text-3xl">
              {event.title}
            </h1>
            <p className="mt-1 text-sm text-muted first-letter:uppercase">
              {formatNight(event.startsAt)} · {formatHours(event.startsAt, event.endsAt)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {live !== null && (
              <span
                className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${
                  live ? "text-muted" : "text-ember-3"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${live ? "animate-pulse bg-ember-2" : "bg-ember-3"}`}
                  aria-hidden
                />
                {live ? "En direct" : "Reconnexion…"}
              </span>
            )}
            {gerant && (
              <Link
                href={`/gestion/soirees/${event.id}`}
                className="flex min-h-11 items-center rounded-full border border-hairline px-4 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground lg:pointer-fine:min-h-9"
              >
                Modifier
              </Link>
            )}
          </div>
        </div>
      </div>

      {event.cancelledAt && (
        <p className="rounded-2xl border border-ember-3/40 bg-ember-3/10 px-4 py-3 text-sm text-ember-3">
          Soirée annulée : chaque table a été remboursée ou annulée, et son client prévenu.
        </p>
      )}
      {!event.published && !event.cancelledAt && (
        <p className="rounded-2xl border border-hairline bg-surface px-4 py-3 text-sm text-muted">
          Brouillon : les clients ne voient pas encore cette soirée.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Tables vendues" value={`${stats.sold} / ${stats.capacity}`} />
        <Stat
          label="Arrivées"
          value={`${stats.arrived} / ${stats.sold}`}
          hint={
            stats.sold > stats.arrived
              ? `${stats.sold - stats.arrived} attendue${stats.sold - stats.arrived > 1 ? "s" : ""}`
              : undefined
          }
        />
        {gerant && (
          <>
            <Stat label="Encaissé en ligne" value={formatCents(stats.online)} />
            <Stat label="Sur place" value={formatCents(stats.onSite)} />
            <Stat label="À encaisser" value={formatCents(stats.toCollect)} />
            <Stat label="Frais Ominin" value={formatCents(stats.fees)} hint="Payés par les clients" />
          </>
        )}
      </dl>

      <PillTabs tabs={views} activeId={view} onSelect={(next) => setView(next as View)} />

      {view === "plan" &&
        (zone ? (
          <div className="flex flex-col gap-4">
            {zones.length > 1 && (
              <PillTabs
                tabs={zones.map((candidate) => ({
                  id: candidate.id,
                  label: candidate.name,
                  count: club.tables.filter(
                    (table) => table.zoneId === candidate.id && byTable.has(table.id)
                  ).length,
                }))}
                activeId={zone.id}
                onSelect={setZoneId}
              />
            )}
            <NightPlan
              zone={zone}
              tables={zoneTables}
              states={states}
              selectedId={selectedId}
              onSelect={(table) => setSelectedId(table.id)}
              describe={describe}
              pings={pings}
              onPingEnd={acknowledgeArrival}
            />
            <PlanLegend states={LEGEND} />
          </div>
        ) : (
          <EmptyState
            title="Aucune zone en vente"
            body={gerant ? "Ouvrez au moins une zone dans la soirée pour vendre ses tables." : "Aucune table n'est en vente ce soir."}
          />
        ))}

      {view === "liste" && (
        <div className="flex flex-col gap-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un nom, un numéro, une table…"
            aria-label="Chercher une réservation"
            className={inputClass}
          />
          {held.length === 0 ? (
            <EmptyState
              title="Aucune table réservée"
              body="Les tables réservées en ligne, au téléphone ou à la porte s'affichent ici en direct."
            />
          ) : listed.length === 0 ? (
            <p className="px-1 text-sm text-muted">Aucune réservation ne correspond.</p>
          ) : (
            <ul className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
              {listed.map(({ booking, table }) => {
                const tableState = staffTableState(booking, true);
                return (
                  <li key={booking.id} className="rise">
                    <button
                      type="button"
                      onClick={() => setSelectedId(table.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-raised"
                    >
                      <span className="flex w-12 shrink-0 flex-col items-center">
                        <span className="font-display text-lg font-medium tabular-nums">{table.label}</span>
                        <span className="max-w-full truncate text-[10px] text-faint">{zoneName.get(table.zoneId)}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{booking.name}</span>
                        <span className="block truncate text-xs text-faint">
                          {people(booking.partySize)}
                          {booking.phone ? ` · ${booking.phone}` : ""}
                        </span>
                      </span>
                      <span
                        key={tableState}
                        className="statut-pose flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-muted"
                      >
                        <span className="plan-legende" data-state={tableState} aria-hidden />
                        <span className="hidden sm:inline">{TABLE_STATE_LABELS[tableState]}</span>
                        <span className="sr-only sm:hidden">{TABLE_STATE_LABELS[tableState]}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {view === "invites" && <GuestList event={event} guests={night.guests} />}

      {selected && selectedZone && (
        <BookingSheet
          key={selected.id}
          event={event}
          table={selected}
          zone={selectedZone}
          booking={byTable.get(selected.id)}
          price={tablePrice(club, event.id, selected)}
          onSale={onSale.has(selected.id)}
          tonight={tonight}
          gerant={gerant}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
