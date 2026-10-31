"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import type { TableState } from "@/components/club/floor-plan";
import { XIcon } from "@/components/gestion/icons";
import { BookingSheet, type MoveTarget } from "@/components/gestion/soirees/booking-sheet";
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
import { formatCents, formatHours, formatNightShort, tableName } from "@/lib/club/format";
import type { ClubBooking, ClubTable } from "@/lib/club/types";
import * as clubApi from "@/lib/gestion/club-api";
import {
  bookingsByTable,
  depositOf,
  isSold,
  isTonight,
  nightStats,
  onSaleTableIds,
  paymentsOf,
  people,
  staffTableState,
  TABLE_STATE_LABELS,
  tablePrice,
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
 * Le plan du soir. Sur un téléphone, à la porte ou au comptoir VIP : le
 * plan, la porte (la liste de ceux qu'on attend, en plein écran) et les
 * invités, un écran à la fois. Sur un grand écran : le plan à gauche, la
 * porte à droite. Tout bouge en direct ; une table payée en ligne s'allume.
 * L'équipe fait entrer ; le gérant seul saisit, annule et rembourse.
 */

type View = "plan" | "porte" | "invites";

const LEGEND: TableState[] = ["libre", "payee", "attente", "arrivee", "prise", "gardee"];

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
function RefundRetries({ night, tableName: nameOf }: { night: ClubNight; tableName: (tableId: string) => string }) {
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
      toast.success(`${nameOf(booking.tableId)} : remboursement relancé.`);
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
                {nameOf(booking.tableId)} · {booking.name}
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
  // Tant que personne n'a choisi : le soir même on ouvre sur la porte, sinon sur le plan.
  const [chosenView, setView] = useState<View | null>(null);
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
  const view: View = chosenView ?? (tonight && !event.cancelledAt ? "porte" : "plan");
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
    const payments = paymentsOf(night, booking.id);
    const payers = payments
      .filter((payment) => payment.method === "en_ligne" && payment.status === "payee")
      .map((payment) => payment.name);
    const deposit = depositOf(booking, payments);
    return table ? [{ booking, table, zoneName: zoneName.get(table.zoneId) ?? "", payers, deposit }] : [];
  });
  const expected = held.filter(({ booking }) => booking.status !== "arrivee" && isSold(booking)).length;
  const toReturn = event.cancelledAt ? held.filter(({ booking }) => isSold(booking)).length : 0;
  const guestList = event.guestListOpen || night.guests.length > 0;
  const peopleExpected = stats.people - stats.peopleArrived;

  const nameOfTable = (tableId: string) => {
    const table = tableById.get(tableId);
    return table ? tableName(zoneName.get(table.zoneId) ?? "", table.label) : "";
  };

  const selected = selectedId ? tableById.get(selectedId) : undefined;
  const selectedBooking = selected ? byTable.get(selected.id) : undefined;
  // Où la réservation ouverte peut aller : les tables libres ce soir qui accueillent son groupe.
  const moveTargets: MoveTarget[] = selectedBooking
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
  const selectedZone = selected ? club.zones.find((candidate) => candidate.id === selected.zoneId) : undefined;

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
      {!wide && <ZoneTables zoneName={zone.name} tables={zoneTables} states={states} byTable={byTable} onSelect={setSelectedId} />}
      {!wide && <h2 className="g-eyebrow mt-2">Vue d&rsquo;ensemble</h2>}
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

  const guests = <GuestList event={event} guests={night.guests} />;
  const viewTabs = [
    { value: "plan" as View, label: "Plan" },
    { value: "porte" as View, label: expected > 0 ? `Porte · ${expected}` : "Porte" },
    ...(guestList ? [{ value: "invites" as View, label: stats.guests > 0 ? `Invités · ${stats.guests}` : "Invités" }] : []),
  ];
  const door = <DoorList held={held} onOpen={setSelectedId} />;

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
              ? `${toReturn} table${toReturn > 1 ? "s" : ""} encore à rendre.`
              : "Chaque table a été remboursée ou annulée, et son client prévenu."
          }
          action={
            toReturn > 0 && gerant ? (
              <GlassButton href={`/gestion/soirees/${event.id}`}>Relancer les remboursements</GlassButton>
            ) : undefined
          }
        />
      )}
      {gerant && <RefundRetries night={night} tableName={nameOfTable} />}
      {!event.published && !event.cancelledAt && (
        <Notice
          tone="info"
          title="Brouillon"
          text="Les clients ne voient pas encore cette soirée."
          action={gerant ? <GlassButton href={`/gestion/soirees/${event.id}`}>Préparer</GlassButton> : undefined}
        />
      )}

      {/* Au téléphone, les vues d'abord : la porte se rejoint d'un geste, sans passer les chiffres. */}
      {!wide && (
        <div className="seg-defile sticky top-[calc(var(--gestion-entete,0px)+var(--g-frame-margin))] z-20">
          <Segmented label="Le plan du soir" options={viewTabs} value={view} onChange={setView} />
        </div>
      )}

      {/* Un seul bandeau, les mêmes mots partout : des tables (réservées, attendues, arrivées), des personnes, de l'argent. */}
      <div className={`g-rise grid grid-cols-2 gap-3 sm:gap-g-gap ${gerant ? "xl:grid-cols-4" : ""}`} style={rise(1)}>
        <Figure
          entity="orders"
          label="Tables arrivées"
          baseline={`${expected} attendue${expected > 1 ? "s" : ""}`}
        >
          {stats.arrived} / {stats.sold}
        </Figure>
        <Figure
          entity="orders"
          label="Personnes entrées"
          baseline={`${peopleExpected} encore attendue${peopleExpected > 1 ? "s" : ""}`}
        >
          {stats.peopleArrived} / {stats.people}
        </Figure>
        {gerant && (
          <>
            <Figure entity="money" label="À encaisser" baseline="à la porte">
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
      {gerant && stats.fees > 0 && (
        <p className="g-rise text-g-meta text-muted" style={rise(1)}>
          Frais de service Ominin, payés par les clients en plus : <span className="tabular-nums">{formatCents(stats.fees)}</span>
        </p>
      )}

      {wide ? (
        <div className="g-rise grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start gap-6" style={rise(2)}>
          {plan}
          <div className="sticky top-[calc(var(--gestion-entete,0px)+var(--g-frame-margin))] flex h-[calc(100dvh-var(--gestion-entete,0px)-2*var(--g-frame-margin))] flex-col gap-3">
            {guestList && (
              <div className="seg-defile">
                <Segmented
                  label="Porte et invités"
                  options={[
                    { value: "porte" as const, label: expected > 0 ? `Porte · ${expected}` : "Porte" },
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
        <div className="g-rise" style={rise(2)}>
          {view === "plan" && plan}
          {view === "invites" && guests}
        </div>
      )}

      {/* Hors du bloc qui monte : une transformation en cours décalerait ce plein écran. */}
      {!wide && view === "porte" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Porte · ${event.title}`}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !e.defaultPrevented) setView("plan");
          }}
          className="porte-ecran fixed inset-0 z-50 flex flex-col bg-background"
        >
          <div className="porte-ecran-tete flex items-center justify-between gap-3 border-b border-hairline px-[var(--g-topbar-mx-sm)] pb-3">
            <div className="min-w-0">
              <p className="truncate font-display text-g-h2">Porte · {event.title}</p>
              <p className="mt-0.5 text-g-meta text-muted">
                <span className="tabular-nums">{expected}</span> attendue{expected > 1 ? "s" : ""} ·{" "}
                <span className="tabular-nums">{stats.arrived}</span> arrivée{stats.arrived > 1 ? "s" : ""}
              </p>
            </div>
            <GlassButton variant="icon" aria-label="Fermer la porte" onClick={() => setView("plan")} autoFocus>
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
          moveTargets={moveTargets}
          onMoved={setSelectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
