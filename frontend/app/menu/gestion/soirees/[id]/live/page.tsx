"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import type { TableState } from "@/components/club/floor-plan";
import { XIcon } from "@/components/gestion/icons";
import {
  BookingSheet,
  NewBookingSheet,
  type MoveTarget,
  type ReserveTarget,
} from "@/components/gestion/soirees/booking-sheet";
import {
  BackToSoirees,
  ClubLoadError,
  ClubLocked,
  ClubSkeleton,
  NightNotFound,
} from "@/components/gestion/soirees/club-states";
import { DoorList, type HeldTable } from "@/components/gestion/soirees/door-list";
import { GuestList } from "@/components/gestion/soirees/guest-list";
import { Money } from "@/components/gestion/soirees/money";
import { NightPlan, PlanLegend } from "@/components/gestion/soirees/night-plan";
import { useWide } from "@/components/gestion/soirees/use-wide";
import {
  Chip,
  EmptyState,
  ENTITY,
  GlassButton,
  Notice,
  Plate,
  SectionHeading,
  Segmented,
} from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { droitsOf } from "@/lib/club/droits";
import { formatCents, formatHours, formatNightShort, tableName } from "@/lib/club/format";
import { bookingHolds } from "@/lib/club/mappers";
import type { ClubBooking, ClubTable } from "@/lib/club/types";
import * as clubApi from "@/lib/gestion/club-api";
import {
  bookingsByTable,
  departuresByTable,
  depositOf,
  hasArrived,
  isPast,
  isSold,
  isTonight,
  nightStats,
  onSaleTableIds,
  paymentsOf,
  people,
  staffTableState,
  TABLE_STATE_LABELS,
  tablePrice,
  unplacedBookings,
} from "@/lib/gestion/club-selectors";
import {
  acknowledgeArrival,
  onClubArrival,
  type ClubNight,
  useClub,
  useClubLoadError,
  useClubNights,
  useClubRealtime,
} from "@/lib/gestion/club-store";
import { SERVICE_CLOCK_TICK_MS, WAIT_TICK_MS } from "@/lib/gestion/constants";
import { describeError } from "@/lib/gestion/errors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import { useNow } from "@/lib/gestion/use-now";

/*
 * Le plan du soir. Sur un téléphone, à l'accueil, à la caisse ou en salle :
 * le plan, la liste des réservations (en plein écran) et les invités, un
 * écran à la fois. Sur un grand écran : le plan à gauche, la liste à droite.
 * Tout bouge en direct ; une réservation payée en ligne s'annonce et attend
 * sa table dans « À placer ». Chaque poste a ses gestes (droits réglés par
 * la direction) ; la direction seule rembourse et prépare la soirée.
 */

type View = "plan" | "porte" | "invites";

/** Ce qui est ouvert en feuille : une table du plan, une réservation, ou une saisie à placer. */
type Selection = { kind: "table"; id: string } | { kind: "booking"; id: string; placing?: boolean } | { kind: "nouvelle" };

const LEGEND: TableState[] = ["libre", "payee", "attente", "arrivee", "assise", "liberee", "prise", "gardee"];

const rise = (index: number) => ({ "--g-i": index }) as CSSProperties;

/** « il y a 3 s », « il y a 2 min » : depuis quand l'écran est à jour. */
function Freshness({ live, syncedAt }: { live: boolean | null; syncedAt: number }) {
  const now = useNow(SERVICE_CLOCK_TICK_MS).getTime();
  if (live === null) return null;
  const seconds = Math.max(0, Math.round((now - syncedAt) / 1000));
  const [count, unit] = seconds < 60 ? [seconds, "s"] : [Math.floor(seconds / 60), "min"];
  return (
    <span aria-live="off">
      <Chip tone={live ? "neutral" : "problem"} icon={<span className="pouls" data-coupe={!live || undefined} aria-hidden />}>
        {live ? "En direct" : "Reconnexion…"} · il y a <span className="tabular-nums">{count}</span> {unit}
      </Chip>
    </span>
  );
}

/**
 * Un chiffre du bandeau, sur plaque : quatre libellés en capitales ne tiennent
 * pas dans un cadre de verre au téléphone, et un montant y défile jusqu'à sa
 * valeur, euros en grand, centimes en petit.
 */
function Figure({
  entity,
  label,
  baseline,
  children,
}: {
  entity: "money" | "orders";
  label: string;
  baseline: string;
  children: React.ReactNode;
}) {
  return (
    <Plate className={`${ENTITY[entity]} min-w-0 p-3.5 sm:p-5`}>
      <p className="flex items-center gap-2 text-g-label text-muted">
        <span className="size-2 shrink-0 rounded-full bg-g-entity" aria-hidden />
        {label}
      </p>
      <p className="mt-2 whitespace-nowrap text-g-h2 tabular-nums xl:mt-3 xl:text-g-kpi">{children}</p>
      <p className="mt-2 text-g-meta text-muted">{baseline}</p>
    </Plate>
  );
}

/**
 * Une table rendue dont une part n'a pas été remboursée (refus de Stripe,
 * réseau) : elle se relance d'ici, sans rien rembourser deux fois.
 */
function RefundRetries({ night, placeOf }: { night: ClubNight; placeOf: (booking: ClubBooking) => string }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const pending = night.bookings.filter(
    (booking) =>
      booking.status === "remboursee" &&
      night.payments.some(
        (payment) => payment.bookingId === booking.id && payment.method === "en_ligne" && payment.status === "payee"
      )
  );
  if (pending.length === 0) return null;
  const retry = async (booking: ClubBooking) => {
    setBusy(booking.id);
    try {
      await clubApi.refundBooking(booking);
      toast.success(`${placeOf(booking)} : remboursement relancé.`);
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <Notice
        title="Remboursement à relancer"
        text={`${pending.length} table${pending.length > 1 ? "s" : ""} rendue${pending.length > 1 ? "s" : ""} sans que l'argent soit reparti. Relancer ne rembourse jamais deux fois.`}
      />
      <Plate>
        <ul className="divide-y divide-hairline">
          {pending.map((booking) => (
            <li key={booking.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-g-body">
              <span>
                {placeOf(booking)} · {booking.name}
              </span>
              <GlassButton disabled={busy === booking.id} onClick={() => void retry(booking)}>
                {busy === booking.id ? "Remboursement…" : "Relancer"}
              </GlassButton>
            </li>
          ))}
        </ul>
      </Plate>
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
              data-state={state}
              className="tuile g-press"
            >
              <span className="plan-legende" data-state={state} aria-hidden />
              <span className="min-w-0">
                <span className="block text-g-body font-semibold tabular-nums">{table.label}</span>
                <span className="block truncate text-g-meta text-muted">{booking ? booking.name : TABLE_STATE_LABELS[state]}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Les réservations en ligne (ou saisies) qui attendent leur table, les plus anciennes d'abord. */
function Unplaced({
  bookings,
  zoneName,
  canPlace,
  onOpen,
  onPlace,
}: {
  bookings: ClubBooking[];
  zoneName: (zoneId: string) => string;
  canPlace: boolean;
  onOpen: (id: string) => void;
  onPlace: (id: string) => void;
}) {
  if (bookings.length === 0) return null;
  return (
    <section aria-label="À placer" className="flex flex-col gap-2">
      <h2 className="g-eyebrow g-money">
        À placer · <span className="tabular-nums">{bookings.length}</span>
      </h2>
      <Plate>
        <ul className="divide-y divide-hairline">
          {bookings.map((booking) => (
            <li key={booking.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <button type="button" onClick={() => onOpen(booking.id)} className="g-press min-w-0 rounded-g-card text-left">
                <span className="block truncate text-g-body font-medium">{booking.name}</span>
                <span className="block text-g-meta text-muted">
                  {zoneName(booking.zoneId)} · {people(booking.partySize)}
                </span>
              </button>
              {canPlace && (
                <GlassButton onClick={() => onPlace(booking.id)}>Placer</GlassButton>
              )}
            </li>
          ))}
        </ul>
      </Plate>
    </section>
  );
}

export default function LivePage() {
  const { id } = useParams<{ id: string }>();
  const state = useGestion();
  const { can, hasFeature, role } = useGestionAccess();
  const club = useClub();
  const error = useClubLoadError();
  const live = useClubRealtime();
  const toast = useToast();
  const wide = useWide();
  const now = useNow(WAIT_TICK_MS).getTime();
  useClubNights([id]);
  // Tant que personne n'a choisi : le soir même on ouvre sur la liste, sinon sur le plan.
  const [chosenView, setView] = useState<View | null>(null);
  const [side, setSide] = useState<"porte" | "invites">("porte");
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  const tables = club?.tables;
  const clubZones = club?.zones;
  // Une réservation payée en ligne pendant que le plan est ouvert : annoncée,
  // et touchable depuis l'annonce — sur sa table, ou à placer.
  useEffect(
    () =>
      onClubArrival(({ booking, eventId }) => {
        if (eventId !== id) return;
        const zone = clubZones?.find((candidate) => candidate.id === booking.zoneId)?.name ?? "";
        const table = booking.tableId ? tables?.find((candidate) => candidate.id === booking.tableId) : undefined;
        toast.notice(
          table
            ? `${tableName(zone, table.label)} payée en ligne · ${booking.name}`
            : `Réservation en ligne · ${zone} · ${booking.name}, à placer`,
          {
            label: "Voir",
            onPress: () => {
              if (table) {
                setView("plan");
                setZoneId(table.zoneId);
              }
              setSelection({ kind: "booking", id: booking.id });
            },
          }
        );
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
  const droits = droitsOf(role, club.clubRole, club.droits);
  const money = droits.has("acomptes");
  const tonight = isTonight(event, now);
  const open = !event.cancelledAt && !isPast(event, now);
  const view: View = chosenView ?? (tonight && !event.cancelledAt ? "porte" : "plan");
  const stats = nightStats(club, event.id);
  const byTable = bookingsByTable(night, now);
  const departures = departuresByTable(night);
  const waiting = unplacedBookings(night, now).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
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
    zoneTables.map((table) => [
      table.id,
      staffTableState(byTable.get(table.id), onSale.has(table.id), departures.has(table.id)),
    ])
  );
  const pings = club.arrivals
    .filter((arrival) => arrival.eventId === event.id)
    .flatMap((arrival) => {
      const table = zoneTables.find((candidate) => candidate.id === arrival.booking.tableId);
      return table ? [{ id: arrival.booking.id, table }] : [];
    });
  const zoneById = new Map(club.zones.map((candidate) => [candidate.id, candidate]));
  const zoneName = (zoneKey: string) => zoneById.get(zoneKey)?.name ?? "";
  const tableById = new Map(club.tables.map((table) => [table.id, table]));
  const placeOf = (booking: ClubBooking) => {
    const table = booking.tableId ? tableById.get(booking.tableId) : undefined;
    return table ? tableName(zoneName(table.zoneId), table.label) : `À placer · ${zoneName(booking.zoneId)}`;
  };

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

  const entryOf = (booking: ClubBooking): HeldTable => {
    const payments = paymentsOf(night, booking.id);
    const payers = payments
      .filter((payment) => payment.method === "en_ligne" && payment.status === "payee")
      .map((payment) => payment.name);
    const table = booking.tableId ? (tableById.get(booking.tableId) ?? null) : null;
    return { booking, table, zoneName: zoneName(booking.zoneId), payers, deposit: depositOf(booking, payments) };
  };
  const held = night.bookings.filter((booking) => bookingHolds(booking, now)).map(entryOf);
  const departed = night.bookings.filter((booking) => booking.status === "partie").map(entryOf);
  const expected = held.filter(({ booking }) => !hasArrived(booking) && isSold(booking)).length;
  const toReturn = event.cancelledAt ? held.filter(({ booking }) => isSold(booking)).length : 0;
  const guestList = (club.options.guestList && event.guestListOpen) || night.guests.length > 0;
  const peopleExpected = stats.people - stats.peopleArrived;

  // La feuille ouverte : une table du plan (et sa réservation), ou une réservation, placée ou non.
  const selectedBooking =
    selection?.kind === "booking"
      ? night.bookings.find((booking) => booking.id === selection.id)
      : selection?.kind === "table"
        ? byTable.get(selection.id)
        : undefined;
  const selectedTable =
    selection?.kind === "table"
      ? tableById.get(selection.id)
      : selectedBooking?.tableId
        ? tableById.get(selectedBooking.tableId)
        : undefined;
  const selectedZone = selectedTable
    ? zoneById.get(selectedTable.zoneId)
    : selectedBooking
      ? zoneById.get(selectedBooking.zoneId)
      : undefined;
  // Où la réservation ouverte peut aller : les tables libres ce soir qui accueillent son groupe.
  const placeTargets: MoveTarget[] = selectedBooking
    ? club.zones
        .map((candidate) => ({
          zone: candidate,
          tables: club.tables.filter(
            (table) =>
              table.zoneId === candidate.id && !byTable.has(table.id) && table.seats >= selectedBooking.partySize
          ),
        }))
        .filter((group) => group.tables.length > 0)
    : [];
  // Une réservation prise au téléphone, à placer : dans une zone du soir (toutes, si aucune n'est ouverte).
  const reserveTargets: ReserveTarget[] = (
    openZones.size > 0 ? club.zones.filter((candidate) => openZones.has(candidate.id)) : club.zones
  ).flatMap((candidate) => {
    const seats = Math.max(0, ...club.tables.filter((table) => table.zoneId === candidate.id).map((table) => table.seats));
    const setting = club.eventZones[event.id]?.find((entry) => entry.zoneId === candidate.id);
    return seats > 0
      ? [{ zone: candidate, table: null, seats, price: setting?.priceCents ?? candidate.priceCents, onSale: true }]
      : [];
  });
  const openBooking = (bookingId: string) => setSelection({ kind: "booking", id: bookingId });
  const placeBooking = (bookingId: string) => setSelection({ kind: "booking", id: bookingId, placing: true });

  const plan = zone ? (
    <div className="flex flex-col gap-3">
      {zones.length > 1 && (
        <div className="seg-defile -mx-[var(--g-topbar-mx-sm)] px-[var(--g-topbar-mx-sm)] lg:mx-0 lg:px-0">
          <Segmented
            label="Zones"
            glass={false}
            options={zones.map((candidate) => {
              const count = club.tables.filter((table) => table.zoneId === candidate.id && byTable.has(table.id)).length;
              return { value: candidate.id, label: count > 0 ? `${candidate.name} · ${count}` : candidate.name };
            })}
            value={zone.id}
            onChange={setZoneId}
          />
        </div>
      )}
      {!wide && (
        <ZoneTables
          zoneName={zone.name}
          tables={zoneTables}
          states={states}
          byTable={byTable}
          onSelect={(tableId) => setSelection({ kind: "table", id: tableId })}
        />
      )}
      {!wide && <h2 className="g-eyebrow mt-2">Vue d&rsquo;ensemble</h2>}
      <NightPlan
        key={zone.id}
        zone={zone}
        tables={zoneTables}
        states={states}
        selectedId={selectedTable?.id ?? null}
        onSelect={(table) => setSelection({ kind: "table", id: table.id })}
        describe={describe}
        pings={pings}
        onPingEnd={acknowledgeArrival}
      />
      <PlanLegend states={LEGEND} />
    </div>
  ) : (
    <EmptyState
      text={
        gerant
          ? "Aucune zone en vente : ouvrez au moins une zone dans la soirée pour vendre ses tables."
          : "Aucune table n'est en vente ce soir."
      }
      action={gerant ? <GlassButton href={`/gestion/soirees/${event.id}`}>Préparer la soirée</GlassButton> : undefined}
    />
  );

  const unplaced = (
    <Unplaced
      bookings={waiting}
      zoneName={zoneName}
      canPlace={droits.has("placer") && open}
      onOpen={openBooking}
      onPlace={placeBooking}
    />
  );
  const guests = <GuestList event={event} guests={night.guests} />;
  const listLabel = expected > 0 ? `Liste · ${expected}` : "Liste";
  const viewTabs = [
    { value: "plan" as View, label: "Plan" },
    { value: "porte" as View, label: listLabel },
    ...(guestList ? [{ value: "invites" as View, label: stats.guests > 0 ? `Invités · ${stats.guests}` : "Invités" }] : []),
  ];
  const door = <DoorList held={held} departed={departed} droits={droits} onOpen={openBooking} onPlace={placeBooking} />;

  return (
    <div className="soirees-page flex flex-col gap-4 lg:gap-5">
      <div className="g-rise flex flex-col gap-2" style={rise(0)}>
        <BackToSoirees />
        <SectionHeading
          level={1}
          title={event.title}
          sub={`${formatNightShort(event.startsAt)} · ${formatHours(event.startsAt, event.endsAt)}`}
          right={
            <div className="flex flex-wrap items-center gap-3">
              <Freshness live={live} syncedAt={club.syncedAt} />
              {droits.has("reserver") && open && reserveTargets.length > 0 && (
                <GlassButton variant="primary" onClick={() => setSelection({ kind: "nouvelle" })}>
                  Nouvelle réservation
                </GlassButton>
              )}
              {gerant && <GlassButton href={`/gestion/soirees/${event.id}/rapport`}>Rapport</GlassButton>}
              {gerant && <GlassButton href={`/gestion/soirees/${event.id}`}>Modifier</GlassButton>}
            </div>
          }
        />
      </div>

      {event.cancelledAt && (
        <Notice
          title="Soirée annulée"
          text={
            toReturn > 0
              ? `${toReturn} réservation${toReturn > 1 ? "s" : ""} encore à rendre.`
              : "Chaque réservation a été remboursée ou annulée, et son client prévenu."
          }
          action={
            toReturn > 0 && gerant ? (
              <GlassButton href={`/gestion/soirees/${event.id}`}>Relancer les remboursements</GlassButton>
            ) : undefined
          }
        />
      )}
      {gerant && <RefundRetries night={night} placeOf={placeOf} />}
      {!event.published && !event.cancelledAt && (
        <Notice
          tone="info"
          title="Brouillon"
          text="Les clients ne voient pas encore cette soirée."
          action={gerant ? <GlassButton href={`/gestion/soirees/${event.id}`}>Préparer</GlassButton> : undefined}
        />
      )}

      {/* Au téléphone, les vues d'abord : la liste se rejoint d'un geste, sans passer les chiffres. */}
      {!wide && (
        <div className="seg-defile sticky top-[calc(var(--gestion-entete,0px)+var(--g-frame-margin))] z-20">
          <Segmented label="Le plan du soir" options={viewTabs} value={view} onChange={setView} />
        </div>
      )}

      {/* Un seul bandeau, les mêmes mots partout : des réservations (attendues, entrées), des personnes, de l'argent. */}
      <div className={`g-rise grid grid-cols-2 gap-3 sm:gap-g-gap ${money ? "xl:grid-cols-4" : ""}`} style={rise(1)}>
        <Figure entity="orders" label="Tables arrivées" baseline={`${expected} attendue${expected > 1 ? "s" : ""}`}>
          {stats.arrived} / {stats.sold}
        </Figure>
        <Figure
          entity="orders"
          label="Personnes entrées"
          baseline={`${peopleExpected} encore attendue${peopleExpected > 1 ? "s" : ""}`}
        >
          {stats.peopleArrived} / {stats.people}
        </Figure>
        {money && (
          <>
            <Figure entity="money" label="À encaisser" baseline="sur place">
              <Money cents={stats.toCollect} />
            </Figure>
            <Figure
              entity="money"
              label="Encaissé"
              baseline={`${formatCents(stats.online)} en ligne · ${formatCents(stats.onSite)} sur place`}
            >
              <Money cents={stats.online + stats.onSite} />
            </Figure>
          </>
        )}
      </div>
      {money && stats.fees > 0 && (
        <p className="g-rise text-g-meta text-muted" style={rise(1)}>
          Frais de service Ominin, payés par les clients en plus : <span className="tabular-nums">{formatCents(stats.fees)}</span>
        </p>
      )}

      {wide ? (
        <div className="g-rise grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start gap-6" style={rise(2)}>
          <div className="flex flex-col gap-4">
            {unplaced}
            {plan}
          </div>
          <div className="sticky top-[calc(var(--gestion-entete,0px)+var(--g-frame-margin))] flex h-[calc(100dvh-var(--gestion-entete,0px)-2*var(--g-frame-margin))] flex-col gap-3">
            {guestList && (
              <div className="seg-defile">
                <Segmented
                  label="Réservations et invités"
                  options={[
                    { value: "porte" as const, label: listLabel },
                    { value: "invites" as const, label: stats.guests > 0 ? `Invités · ${stats.guests}` : "Invités" },
                  ]}
                  value={side}
                  onChange={setSide}
                />
              </div>
            )}
            {/* Les onglets restent en place ; seule la liste défile, sa recherche collée en haut. */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-g-card">
              {side === "porte" || !guestList ? door : guests}
            </div>
          </div>
        </div>
      ) : (
        <div className="g-rise flex flex-col gap-4" style={rise(2)}>
          {view === "plan" && (
            <>
              {unplaced}
              {plan}
            </>
          )}
          {view === "invites" && guests}
        </div>
      )}

      {/* Hors du bloc qui monte : une transformation en cours décalerait ce plein écran. */}
      {!wide && view === "porte" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Réservations · ${event.title}`}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !e.defaultPrevented) setView("plan");
          }}
          className="porte-ecran fixed inset-0 z-50 flex flex-col bg-background"
        >
          <div className="porte-ecran-tete flex items-center justify-between gap-3 border-b border-hairline px-[var(--g-topbar-mx-sm)] pb-3">
            <div className="min-w-0">
              <p className="truncate font-display text-g-h2">{event.title}</p>
              <p className="mt-0.5 text-g-meta text-muted">
                <span className="tabular-nums">{expected}</span> attendue{expected > 1 ? "s" : ""} ·{" "}
                <span className="tabular-nums">{stats.arrived}</span> arrivée{stats.arrived > 1 ? "s" : ""}
                {waiting.length > 0 && (
                  <>
                    {" · "}
                    <span className="tabular-nums">{waiting.length}</span> à placer
                  </>
                )}
              </p>
            </div>
            <GlassButton variant="icon" aria-label="Fermer la liste" onClick={() => setView("plan")} autoFocus>
              <XIcon />
            </GlassButton>
          </div>
          <div className="seg-defile px-[var(--g-topbar-mx-sm)] pt-3">
            <Segmented label="Le plan du soir" glass={false} options={viewTabs} value={view} onChange={setView} />
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-[var(--g-topbar-mx-sm)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-3">
            {door}
          </div>
        </div>
      )}

      {selection?.kind === "nouvelle" && (
        <NewBookingSheet
          event={event}
          targets={reserveTargets}
          slots={club.slots[event.id] ?? []}
          tonight={tonight}
          onClose={() => setSelection(null)}
        />
      )}
      {selection && selection.kind !== "nouvelle" && selectedZone && (selectedTable || selectedBooking) && (
        <BookingSheet
          key={selection.kind === "table" ? selection.id : `r-${selection.id}`}
          event={event}
          table={selectedTable ?? null}
          zone={selectedZone}
          booking={selectedBooking}
          payments={paymentsOf(night, selectedBooking?.id ?? "")}
          price={selectedTable ? tablePrice(club, event.id, selectedTable) : 0}
          onSale={selectedTable ? onSale.has(selectedTable.id) : true}
          departed={selectedTable ? departures.get(selectedTable.id) : undefined}
          tonight={tonight}
          droits={droits}
          gerant={gerant}
          placeTargets={placeTargets}
          waiting={waiting}
          startPlacing={selection.kind === "booking" && selection.placing === true}
          slots={club.slots[event.id] ?? []}
          depositPercent={club.depositPercent}
          onPlaced={(tableId) => {
            const table = tableById.get(tableId);
            if (table) setZoneId(table.zoneId);
          }}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
}
