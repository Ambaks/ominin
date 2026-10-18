import type { Tables } from "@/lib/supabase/database.types";
import type {
  ClubBooking,
  ClubEvent,
  ClubGuest,
  ClubTable,
  ClubZone,
  ZoneLayout,
} from "@/lib/club/types";

/* Lignes de la base → types de domaine, pour la page publique et la gestion. */

export function rowToZone(row: Tables<"club_zones">): ClubZone {
  return {
    id: row.id,
    name: row.name,
    sort: row.sort,
    layout: row.layout as unknown as ZoneLayout,
    priceCents: row.price_cents,
    inclus: row.inclus,
  };
}

export function rowToTable(row: Tables<"club_tables">): ClubTable {
  return {
    id: row.id,
    zoneId: row.zone_id,
    label: row.label,
    seats: row.seats,
    x: row.x,
    y: row.y,
    shape: row.shape === "rond" ? "rond" : "carre",
  };
}

export function rowToEvent(row: Tables<"club_events">): ClubEvent {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    tag: row.tag,
    description: row.description,
    posterUrl: row.poster_url,
    ticketUrl: row.ticket_url,
    published: row.published,
    cancelledAt: row.cancelled_at,
    guestListOpen: row.guest_list_open,
    guestListCapacity: row.guest_list_capacity,
    guestListMaxParty: row.guest_list_max_party,
  };
}

export function rowToBooking(row: Tables<"club_bookings">): ClubBooking {
  return {
    id: row.id,
    eventId: row.event_id,
    tableId: row.table_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    partySize: row.party_size,
    priceCents: row.price_cents,
    feeCents: row.fee_cents,
    totalCents: row.total_cents,
    status: row.status,
    source: row.source,
    holdExpiresAt: row.hold_expires_at,
    paidOnline: row.source === "en_ligne" && row.paid_at !== null,
    note: row.note,
    paidAt: row.paid_at,
    arrivedAt: row.arrived_at,
    createdAt: row.created_at,
  };
}

export function rowToGuest(row: Tables<"club_guests">): ClubGuest {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    partySize: row.party_size,
    phone: row.phone,
    email: row.email,
    arrivedAt: row.arrived_at,
    createdAt: row.created_at,
  };
}

/** Une réservation qui tient sa table (même règle que club_booking_holds). */
export function bookingHolds(booking: ClubBooking, now = Date.now()): boolean {
  if (booking.status === "payee" || booking.status === "arrivee") return true;
  if (booking.status !== "en_attente") return false;
  return booking.holdExpiresAt === null || Date.parse(booking.holdExpiresAt) > now;
}
