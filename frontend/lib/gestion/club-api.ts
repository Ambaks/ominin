import type { ClubDroits } from "@/lib/club/droits";
import { rowToJournal, type JournalEntry } from "@/lib/club/journal";
import { rowToBooking, rowToEvent } from "@/lib/club/mappers";
import type { Rapport, RapportSoiree, RapportTotaux } from "@/lib/club/rapport";
import type { BookingSource, ClubBooking, ClubEvent, ClubGuest, ClubPayment } from "@/lib/club/types";
import { createClient } from "@/lib/supabase/client";
import { check, must, type ListPage } from "@/lib/supabase/result";
import type { NightStep } from "./club-selectors";
import {
  commitClub,
  getClub,
  refreshClubNow,
  refreshNightNow,
  type ClubConditions,
  type ClubState,
  type EventZoneSetting,
} from "./club-store";

/*
 * Mutations des soirées d'un club, sur le modèle d'api.ts : chaque fonction
 * écrit dans Supabase (RLS et fonctions SQL font autorité) puis répercute le
 * changement sur le snapshot du club. Réservations et invités ne s'écrivent
 * que par leurs fonctions SQL ; l'argent (remboursement, soirée annulée)
 * passe par les routes serveur, qui seules parlent à Stripe.
 */

function apply<T>(recipe: (draft: ClubState) => T): T {
  const draft = structuredClone(getClub());
  const result = recipe(draft);
  commitClub(draft);
  return result;
}

/** Route serveur du club : JSON en entrée et en sortie, { error } en cas de refus. */
async function post<T>(path: string, body: Record<string, string>): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Une erreur est survenue.");
  return payload;
}

function patchBooking(draft: ClubState, booking: ClubBooking, patch: Partial<ClubBooking>) {
  const night = draft.nights[booking.eventId];
  const index = night?.bookings.findIndex((candidate) => candidate.id === booking.id) ?? -1;
  if (index !== -1) night.bookings[index] = { ...night.bookings[index], ...patch };
}

// ---------------------------------------------------------------------------
// Salle

export async function updateZone(zoneId: string, input: { priceCents: number; inclus: string | null }) {
  check(
    await createClient()
      .from("club_zones")
      .update({ price_cents: input.priceCents, inclus: input.inclus })
      .eq("id", zoneId)
  );
  apply((draft) => {
    const zone = draft.zones.find((candidate) => candidate.id === zoneId);
    if (zone) Object.assign(zone, input);
  });
}

export async function updateConditions(conditions: ClubConditions) {
  const { etablissementId } = getClub();
  check(
    await createClient()
      .from("etablissements")
      .update({
        club_min_age: conditions.minAge,
        club_dress_code: conditions.dressCode,
        club_refused: conditions.refused,
      })
      .eq("id", etablissementId)
  );
  apply((draft) => {
    draft.conditions = conditions;
  });
}

/** Ce que chaque poste peut faire (direction seule, club_peut le relit à chaque geste). */
export async function updateDroits(droits: ClubDroits) {
  const { etablissementId } = getClub();
  check(await createClient().from("etablissements").update({ club_droits: droits }).eq("id", etablissementId));
  apply((draft) => {
    draft.droits = droits;
  });
}

// ---------------------------------------------------------------------------
// Soirées

interface EventInput {
  slug: string;
  title: string;
  startsAt: string;
  endsAt: string;
  tag: string | null;
  description: string | null;
  posterUrl: string | null;
  ticketUrl: string | null;
  guestListOpen: boolean;
  guestListCapacity: number | null;
  /** Absent à la création : le défaut de la base. */
  guestListMaxParty?: number;
  zones: EventZoneSetting[];
  blocked: string[];
}

/**
 * Crée (eventId null, en brouillon) ou enregistre une soirée, avec ses zones
 * en vente et ses tables gardées : ce qui n'est plus coché se retire.
 */
export async function saveEvent(eventId: string | null, input: EventInput): Promise<ClubEvent> {
  const supabase = createClient();
  const columns = {
    slug: input.slug,
    title: input.title,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    tag: input.tag,
    description: input.description,
    poster_url: input.posterUrl,
    ticket_url: input.ticketUrl,
    guest_list_open: input.guestListOpen,
    guest_list_capacity: input.guestListCapacity,
    guest_list_max_party: input.guestListMaxParty,
  };
  const row = must(
    eventId
      ? await supabase.from("club_events").update(columns).eq("id", eventId).select().single()
      : await supabase
          .from("club_events")
          .insert({ ...columns, etablissement_id: getClub().etablissementId })
          .select()
          .single()
  );
  const id = row.id;

  const zoneIds = input.zones.map((zone) => zone.zoneId);
  let staleZones = supabase.from("club_event_zones").delete().eq("event_id", id);
  if (zoneIds.length > 0) staleZones = staleZones.not("zone_id", "in", `(${zoneIds.join(",")})`);
  check(await staleZones);
  if (input.zones.length > 0) {
    check(
      await supabase.from("club_event_zones").upsert(
        input.zones.map((zone) => ({ event_id: id, zone_id: zone.zoneId, price_cents: zone.priceCents }))
      )
    );
  }

  let staleBlocked = supabase.from("club_event_blocked_tables").delete().eq("event_id", id);
  if (input.blocked.length > 0) {
    staleBlocked = staleBlocked.not("table_id", "in", `(${input.blocked.join(",")})`);
  }
  check(await staleBlocked);
  if (input.blocked.length > 0) {
    check(
      await supabase
        .from("club_event_blocked_tables")
        .upsert(
          input.blocked.map((tableId) => ({ event_id: id, table_id: tableId })),
          { ignoreDuplicates: true }
        )
    );
  }

  const event = rowToEvent(row);
  return apply((draft) => {
    const index = draft.events.findIndex((candidate) => candidate.id === id);
    if (index === -1) draft.events.push(event);
    else draft.events[index] = event;
    draft.events.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
    draft.eventZones[id] = input.zones;
    draft.blocked[id] = input.blocked;
    return event;
  });
}

export async function setPublished(eventId: string, published: boolean) {
  check(await createClient().from("club_events").update({ published }).eq("id", eventId));
  apply((draft) => {
    const event = draft.events.find((candidate) => candidate.id === eventId);
    if (event) event.published = published;
  });
}

type CancelResult = { refunded: number; cancelled: number; failed: string[] };

/**
 * Annule la soirée : chaque table est remboursée ou annulée, chaque client
 * prévenu. Sans danger à relancer : seules les tables encore tenues sont
 * reprises, celles dont le remboursement a échoué (failed) comprises.
 */
export async function cancelEvent(eventId: string): Promise<CancelResult> {
  const result = await post<CancelResult>("/api/club/cancel-event", { eventId });
  await refreshClubNow();
  return result;
}

/** Nouvel horaire enregistré : les clients des tables vendues le reçoivent par e-mail. */
export async function notifyEventChanged(eventId: string): Promise<number> {
  const { notified } = await post<{ notified: number }>("/api/club/event-changed", { eventId });
  return notified;
}

// ---------------------------------------------------------------------------
// Réservations

export interface ClubBookingInput {
  eventId: string;
  zoneId: string;
  /** Null : à placer dans la zone. */
  tableId: string | null;
  name: string;
  phone: string;
  partySize: number;
  source: Exclude<BookingSource, "en_ligne">;
  /** Réglée à la saisie ; sinon à régler sur place, à l'arrivée. */
  paid: boolean;
  note: string;
}

export async function createClubBooking(input: ClubBookingInput): Promise<ClubBooking> {
  const row = must(
    await createClient().rpc("creer_reservation_club", {
      p_event: input.eventId,
      p_zone: input.zoneId,
      p_table: input.tableId,
      p_name: input.name,
      p_phone: input.phone,
      p_party: input.partySize,
      p_source: input.source,
      p_paid: input.paid,
      p_note: input.note,
    })
  );
  const booking = rowToBooking(row);
  apply((draft) => {
    draft.nights[input.eventId]?.bookings.push(booking);
  });
  // Réglée à la saisie : son paiement sur place est né avec elle.
  if (input.paid) await refreshNightNow(input.eventId);
  return booking;
}

const STEP_RANK: Record<NightStep, number> = { payee: 0, arrivee: 1, assise: 2, partie: 3 };

/**
 * Le suivi du soir : faire entrer, installer (paid : encaisser d'abord le
 * reste), marquer le départ, ou revenir d'un cran. Chaque poste n'a que ses
 * gestes (club_statut_reservation). Affiché tout de suite, relu ensuite :
 * l'encaissement crée son paiement.
 */
export async function setBookingStatus(booking: ClubBooking, step: NightStep, paid = false) {
  const now = new Date().toISOString();
  const rank = STEP_RANK[step];
  apply((draft) =>
    patchBooking(draft, booking, {
      status: rank > 0 ? step : booking.paidAt ? "payee" : "en_attente",
      arrivedAt: rank >= 1 ? (booking.arrivedAt ?? now) : null,
      seatedAt: rank >= 2 ? (booking.seatedAt ?? now) : null,
      leftAt: rank === 3 ? (booking.leftAt ?? now) : null,
      ...(paid ? { paidCents: booking.priceCents, remainingCents: 0, paidAt: booking.paidAt ?? now } : {}),
    })
  );
  const result = await createClient().rpc("club_statut_reservation", {
    p_booking: booking.id,
    p_status: step,
    p_paid: paid,
  });
  if (paid || result.error) await refreshNightNow(booking.eventId);
  if (result.error) throw new Error(result.error.message);
}

/** Le caissier encaisse le reste d'une table, sans toucher à son statut. */
export async function collectRemaining(booking: ClubBooking) {
  check(await createClient().rpc("club_encaisser", { p_booking: booking.id }));
  await refreshNightNow(booking.eventId);
}

/** Rembourse toute la table : chaque part payée en ligne, frais compris ; chaque payeur est prévenu. */
export async function refundBooking(booking: ClubBooking) {
  await post("/api/club/refund", { bookingId: booking.id });
  apply((draft) => patchBooking(draft, booking, { status: "remboursee" }));
  await refreshNightNow(booking.eventId);
}

/**
 * Rembourse la part d'un ami qui se désiste : la table reste réservée, ce
 * qui reste à encaisser à la porte grandit d'autant.
 */
export async function refundPayment(booking: ClubBooking, payment: ClubPayment) {
  await post("/api/club/refund", { paymentId: payment.id });
  apply((draft) => {
    const night = draft.nights[booking.eventId];
    const entry = night?.payments.find((candidate) => candidate.id === payment.id);
    if (entry) entry.status = "remboursee";
    patchBooking(draft, booking, {
      paidCents: booking.paidCents - payment.amountCents,
      remainingCents: booking.remainingCents + payment.amountCents,
    });
  });
  await refreshNightNow(booking.eventId);
}

/**
 * Place une réservation sur une table libre ce soir-là, ou la déplace : la
 * base vérifie que la table est libre et qu'elle accueille le groupe. La
 * zone de la réservation suit la table.
 */
export async function placeBooking(booking: ClubBooking, tableId: string) {
  apply((draft) => {
    const zoneId = draft.tables.find((table) => table.id === tableId)?.zoneId ?? booking.zoneId;
    patchBooking(draft, booking, { tableId, zoneId });
  });
  const result = await createClient().rpc("club_placer_reservation", {
    p_booking: booking.id,
    p_table: tableId,
  });
  if (result.error) {
    await refreshNightNow(booking.eventId);
    throw new Error(result.error.message);
  }
}

/** Annule une réservation saisie par le club : la table redevient libre. */
export async function cancelClubBooking(booking: ClubBooking) {
  check(await createClient().rpc("club_annuler_reservation", { p_booking: booking.id }));
  apply((draft) => {
    const night = draft.nights[booking.eventId];
    if (night) night.bookings = night.bookings.filter((candidate) => candidate.id !== booking.id);
  });
}

// ---------------------------------------------------------------------------
// Liste d'invités

export async function markGuest(guest: ClubGuest, arrived: boolean) {
  const patch = (draft: ClubState, arrivedAt: string | null) => {
    const entry = draft.nights[guest.eventId]?.guests.find((candidate) => candidate.id === guest.id);
    if (entry) entry.arrivedAt = arrivedAt;
  };
  apply((draft) => patch(draft, arrived ? new Date().toISOString() : null));
  const result = await createClient().rpc("club_marquer_invite", {
    p_guest: guest.id,
    p_arrived: arrived,
  });
  if (result.error) {
    apply((draft) => patch(draft, guest.arrivedAt));
    throw new Error(result.error.message);
  }
}

// ---------------------------------------------------------------------------
// Rapports (direction)

/** Le rapport financier d'une soirée, calculé en base (club_rapport). */
export async function fetchRapport(eventId: string): Promise<Rapport> {
  return must(await createClient().rpc("club_rapport", { p_event: eventId })) as unknown as Rapport;
}

/** L'historique des soirées commencées, la plus récente d'abord, page par page. */
export async function fetchRapports(search: string, limit: number, offset: number): Promise<ListPage<RapportSoiree>> {
  const rows = must(
    await createClient().rpc("club_rapports", {
      p_etablissement: getClub().etablissementId,
      p_search: search,
      p_limit: limit,
      p_offset: offset,
    })
  );
  return {
    rows: rows.map((row) => ({
      eventId: row.event_id,
      title: row.title,
      startsAt: row.starts_at,
      cancelled: row.cancelled,
      totaux: row.totaux as unknown as RapportTotaux,
    })),
    total: rows[0]?.total_count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Journal des actions (direction)

/** Le journal du club, le plus récent d'abord, page par page : une soirée, ou toutes (null). */
export async function fetchJournal(
  eventId: string | null,
  search: string,
  limit: number,
  offset: number
): Promise<ListPage<JournalEntry>> {
  const rows = must(
    await createClient().rpc("club_journal_page", {
      p_etablissement: getClub().etablissementId,
      p_event: eventId,
      p_search: search,
      p_limit: limit,
      p_offset: offset,
    })
  );
  return { rows: rows.map(rowToJournal), total: rows[0]?.total_count ?? 0 };
}

/**
 * L'historique d'une réservation, dans l'ordre. Pas de pages : une
 * réservation ne vit qu'une soirée, son historique tient sur un écran.
 */
export async function fetchBookingJournal(bookingId: string): Promise<JournalEntry[]> {
  const rows = must(
    await createClient()
      .from("club_journal")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at")
      .order("id")
  );
  return rows.map(rowToJournal);
}
