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
import { DoorList, type HeldTable } from "@/components/gestion/soirees/door-list";
import { GuestList } from "@/components/gestion/soirees/guest-list";
import { NightPlan, PlanLegend } from "@/components/gestion/soirees/night-plan";
import { useWide } from "@/components/gestion/soirees/use-wide";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useToast } from "@/components/ui/toast";
import { formatCents, formatHours, formatNightShort } from "@/lib/club/format";
import type { ClubBooking, ClubTable } from "@/lib/club/types";
import {
  bookingsByTable,
  isSold,
  isTonight,
  nightStats,
  onSaleTableIds,
  paymentsOf,
  people,
  staffTableState,
  TABLE_STATE_LABELS,
  tableName,
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
import { SERVICE_CLOCK_TICK_MS, WAIT_TICK_MS } from "@/lib/gestion/constants";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import { useNow } from "@/lib/gestion/use-now";

/*
 * Le plan du soir. Sur un téléphone, à la porte ou au comptoir VIP : le
 * plan, la porte (la liste de ceux qu'on attend, en plein écran) et les
 * invités, un écran à la fois. Sur un grand écran : le plan à gauche, la
 * porte à droite. Tout bouge en direct ; une table payée en ligne s'allume.
 * L'équipe fait entrer ; le gérant seul saisit, annule et rembourse.
 */

type View = "plan" | "porte" | "invites";

const LEGEND: TableState[] = ["libre", "payee", "attente", "arrivee", "prise", "gardee"];

/** « il y a 3 s », « il y a 2 min » : depuis quand l'écran est à jour. */
function Freshness({ live, syncedAt }: { live: boolean | null; syncedAt: number }) {
  const now = useNow(SERVICE_CLOCK_TICK_MS).getTime();
  if (live === null) return null;
  const seconds = Math.max(0, Math.round((now - syncedAt) / 1000));
  const [count, unit] = seconds < 60 ? [seconds, "s"] : [Math.floor(seconds / 60), "min"];
  return (
    <span
      aria-live="off"
      className={`flex items-center gap-1.5 text-xs font-medium ${live ? "text-muted" : "text-ember-3"}`}
    >
      <span
        className={`size-1.5 rounded-full ${live ? "animate-pulse bg-[var(--soirees-ok)]" : "bg-ember-3"}`}
        aria-hidden
      />
      {live ? "En direct" : "Reconnexion…"} · il y a <span className="tabular-nums">{count}</span> {unit}
    </span>
  );
}

/** Une case du bandeau : un chiffre, son libellé, et sa précision dessous si elle tient. */
function Figure({ label, value, detail, strong }: { label: string; value: string; detail?: string; strong?: boolean }) {
  return (
    <div className="min-w-0 bg-surface px-4 py-3">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={`mt-0.5 font-semibold tabular-nums ${strong ? "text-2xl" : "text-lg"}`}>{value}</dd>
      {detail && <dd className="text-xs text-muted">{detail}</dd>}
    </div>
  );
}

/** Sous le plan d'un téléphone : les tables de la zone en pastilles, à toucher sans viser. */
function ZoneTables({
  zoneName,
  tables,
  states,
  byTable,
  onSelect,
}: {
  zoneName: string;
  tables: ClubTable[];
  states: Record<string, TableState>;
  byTable: Map<string, ClubBooking>;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {tables.map((table) => {
        const booking = byTable.get(table.id);
        const state = states[table.id];
        return (
          <li key={table.id}>
            <button
              type="button"
              onClick={() => onSelect(table.id)}
              aria-label={`${tableName(zoneName, table.label)}, ${TABLE_STATE_LABELS[state]?.toLowerCase()}${booking ? `, ${booking.name}` : ""}`}
              className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-hairline bg-surface px-2.5 py-1.5 text-left hover:border-ember-2/40"
            >
              <span className="plan-legende" data-state={state} aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-semibold tabular-nums">{table.label}</span>
                <span className="block truncate text-xs text-muted">
                  {booking ? booking.name : TABLE_STATE_LABELS[state]}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
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
  const wide = useWide();
  const now = useNow(WAIT_TICK_MS).getTime();
  useClubNights([id]);
  const [view, setView] = useState<View>("plan");
  const [side, setSide] = useState<"porte" | "invites">("porte");
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tables = club?.tables;
  const clubZones = club?.zones;
  // Une table payée en ligne pendant que le plan est ouvert : annoncée, et
  // touchable depuis l'annonce.
  useEffect(
    () =>
      onClubArrival(({ booking, eventId }) => {
        if (eventId !== id) return;
        const table = tables?.find((candidate) => candidate.id === booking.tableId);
        if (!table) return;
        const zone = clubZones?.find((candidate) => candidate.id === table.zoneId)?.name ?? "";
        toast.notice(`${tableName(zone, table.label)} payée en ligne · ${booking.name}`, {
          label: "Voir",
          onPress: () => {
            setView("plan");
            setZoneId(table.zoneId);
            setSelectedId(table.id);
          },
        });
      }),
    [id, tables, clubZones, toast]
  );

  if (!state) return null;
  if (!hasFeature("soirees")) return <ClubLocked />;
  if (!club) return error ? <ClubLoadError message={error} /> : <ClubSkeleton variant="soiree" />;
  const event = club.events.find((candidate) => candidate.id === id);
  if (!event) return <NightNotFound />;
  const night = club.nights[event.id];
  if (!night) return error ? <ClubLoadError message={error} /> : <ClubSkeleton variant="soiree" />;

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
  const tableById = new Map(club.tables.map((table) => [table.id, table]));

  const describe = (table: ClubTable, tableState: TableState) => {
    const booking = byTable.get(table.id);
    return [
      tableName(zone?.name ?? "", table.label),
      `${table.seats} places`,
      TABLE_STATE_LABELS[tableState]?.toLowerCase(),
      booking ? `${booking.name}, ${people(booking.partySize)}` : formatCents(tablePrice(club, event.id, table)),
    ]
      .filter(Boolean)
      .join(", ");
  };

  const held: HeldTable[] = [...byTable.values()].flatMap((booking) => {
    const table = tableById.get(booking.tableId);
    const payers = paymentsOf(night, booking.id)
      .filter((payment) => payment.method === "en_ligne" && payment.status === "payee")
      .map((payment) => payment.name);
    return table ? [{ booking, table, zoneName: zoneName.get(table.zoneId) ?? "", payers }] : [];
  });
  const expected = held.filter(({ booking }) => booking.status !== "arrivee" && isSold(booking)).length;
  const toReturn = event.cancelledAt ? held.filter(({ booking }) => isSold(booking)).length : 0;
  const guestList = event.guestListOpen || night.guests.length > 0;

  const selected = selectedId ? tableById.get(selectedId) : undefined;
  const selectedZone = selected ? club.zones.find((candidate) => candidate.id === selected.zoneId) : undefined;

  const plan = zone ? (
    <div className="flex flex-col gap-3">
      {zones.length > 1 && (
        <PillTabs
          tabs={zones.map((candidate) => ({
            id: candidate.id,
            label: candidate.name,
            count: club.tables.filter((table) => table.zoneId === candidate.id && byTable.has(table.id)).length,
          }))}
          activeId={zone.id}
          onSelect={setZoneId}
        />
      )}
      <NightPlan
        key={zone.id}
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
      {!wide && <ZoneTables zoneName={zone.name} tables={zoneTables} states={states} byTable={byTable} onSelect={setSelectedId} />}
    </div>
  ) : (
    <EmptyState
      title="Aucune zone en vente"
      body={gerant ? "Ouvrez au moins une zone dans la soirée pour vendre ses tables." : "Aucune table n'est en vente ce soir."}
    />
  );

  const guests = <GuestList event={event} guests={night.guests} />;

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <div className="flex flex-col gap-1">
        <BackToSoirees />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
            <h1 className="truncate font-display text-2xl font-medium">{event.title}</h1>
            <p className="text-sm text-muted first-letter:uppercase">
              {formatNightShort(event.startsAt)} · {formatHours(event.startsAt, event.endsAt)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Freshness live={live} syncedAt={club.syncedAt} />
            {gerant && (
              <Link
                href={`/gestion/soirees/${event.id}`}
                className="flex min-h-11 items-center rounded-full border border-hairline px-4 text-sm font-medium text-muted hover:border-ember-2/40 hover:text-foreground lg:pointer-fine:min-h-9"
              >
                Modifier
              </Link>
            )}
          </div>
        </div>
      </div>

      {event.cancelledAt && (
        <p role="status" className="rounded-2xl border border-ember-3/40 bg-ember-3/10 px-4 py-3 text-sm">
          Soirée annulée.{" "}
          {toReturn > 0 ? (
            <>
              {toReturn} table{toReturn > 1 ? "s" : ""} encore à rendre
              {gerant && (
                <>
                  {" "}
                  :{" "}
                  <Link href={`/gestion/soirees/${event.id}`} className="font-semibold text-ember-3 underline underline-offset-4">
                    relancer les remboursements
                  </Link>
                </>
              )}
              .
            </>
          ) : (
            "Chaque table a été remboursée ou annulée, et son client prévenu."
          )}
        </p>
      )}
      {!event.published && !event.cancelledAt && (
        <p className="rounded-2xl border border-hairline bg-surface px-4 py-3 text-sm text-muted">
          Brouillon : les clients ne voient pas encore cette soirée.
        </p>
      )}

      {/* Un seul bandeau : les deux chiffres de la porte en grand, le reste à côté. */}
      <dl className={`grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline ${gerant ? "lg:grid-cols-4" : ""}`}>
        <Figure
          strong
          label="Arrivées"
          value={`${stats.arrived} / ${stats.sold}`}
          detail={expected > 0 ? `${expected} attendue${expected > 1 ? "s" : ""}` : undefined}
        />
        {gerant ? (
          <Figure strong label="À encaisser" value={formatCents(stats.toCollect)} detail="sur place" />
        ) : (
          <Figure strong label="Tables vendues" value={`${stats.sold} / ${stats.capacity}`} />
        )}
        {gerant && (
          <>
            <Figure label="Tables vendues" value={`${stats.sold} / ${stats.capacity}`} />
            <Figure
              label="Encaissé"
              value={formatCents(stats.online + stats.onSite)}
              detail={`dont ${formatCents(stats.online)} en ligne`}
            />
          </>
        )}
      </dl>
      {gerant && stats.fees > 0 && (
        <p className="-mt-2 text-xs text-muted">
          Frais de service Ominin payés par les clients : <span className="tabular-nums">{formatCents(stats.fees)}</span>
        </p>
      )}

      {wide ? (
        <div className="grid grid-cols-[minmax(0,1fr)_24rem] items-start gap-6">
          {plan}
          <div className="sticky top-[calc(var(--gestion-entete,0px)+1rem)] flex max-h-[calc(100dvh-var(--gestion-entete,0px)-2rem)] flex-col gap-3 overflow-y-auto overscroll-contain rounded-2xl">
            {guestList && (
              <PillTabs
                tabs={[
                  { id: "porte", label: "Porte", count: expected },
                  { id: "invites", label: "Invités", count: stats.guests },
                ]}
                activeId={side}
                onSelect={(next) => setSide(next as "porte" | "invites")}
              />
            )}
            {side === "porte" || !guestList ? <DoorList held={held} onOpen={setSelectedId} /> : guests}
          </div>
        </div>
      ) : (
        <>
          <div className="sticky top-[var(--gestion-entete,0px)] z-20 -mx-5 bg-background/90 px-5 py-2 backdrop-blur-md">
            <PillTabs
              tabs={[
                { id: "plan", label: "Plan" },
                { id: "porte", label: "Porte", count: expected },
                ...(guestList ? [{ id: "invites", label: "Invités", count: stats.guests }] : []),
              ]}
              activeId={view}
              onSelect={(next) => setView(next as View)}
            />
          </div>
          {view === "plan" && plan}
          {view === "invites" && guests}
          {view === "porte" && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Porte · ${event.title}`}
              onKeyDown={(e) => {
                if (e.key === "Escape" && !e.defaultPrevented) setView("plan");
              }}
              className="soirees-entree fixed inset-0 z-50 flex flex-col bg-background"
            >
              <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">Porte · {event.title}</p>
                  <p className="text-xs text-muted">
                    <span className="tabular-nums">{expected}</span> attendue{expected > 1 ? "s" : ""} ·{" "}
                    <span className="tabular-nums">{stats.arrived}</span> arrivée{stats.arrived > 1 ? "s" : ""}
                  </p>
                </div>
                <IconButton aria-label="Fermer la porte" onClick={() => setView("plan")} autoFocus>
                  <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </IconButton>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-3">
                <DoorList held={held} onOpen={setSelectedId} />
              </div>
            </div>
          )}
        </>
      )}

      {selected && selectedZone && (
        <BookingSheet
          key={selected.id}
          event={event}
          table={selected}
          zone={selectedZone}
          booking={byTable.get(selected.id)}
          payments={paymentsOf(night, byTable.get(selected.id)?.id ?? "")}
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
