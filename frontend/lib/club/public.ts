import { cache } from "react";
import { rowToEvent, rowToTable, rowToZone } from "@/lib/club/mappers";
import type { BookingStatus, Club, ClubEvent, EventZone } from "@/lib/club/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";

/*
 * Lectures de la page publique d'un club (club.ominin.com/<slug>) : sans
 * session, sous les policies de lecture publique — le plan, les soirées
 * publiées et leurs prix. Les tables prises viennent de club_tables_prises,
 * qui ne livre que des identifiants.
 */

export const fetchClub = cache(async (slug: string): Promise<Club | null> => {
  const db = createPublicClient();
  const { data: etab } = await db
    .from("etablissements")
    .select("id, slug, name, tagline, address, phone, table_fee_percent, payment_provider, online_payment")
    .eq("slug", slug)
    .maybeSingle();
  if (!etab) return null;
  const [{ data: zones }, { data: tables }] = await Promise.all([
    db.from("club_zones").select("*").eq("etablissement_id", etab.id).order("sort"),
    db.from("club_tables").select("*").eq("etablissement_id", etab.id),
  ]);
  if (!zones?.length) return null;
  return {
    id: etab.id,
    slug: etab.slug,
    name: etab.name,
    tagline: etab.tagline,
    address: etab.address,
    phone: etab.phone,
    feePercent: Number(etab.table_fee_percent),
    paymentProvider: etab.payment_provider ?? "stripe",
    onlinePayment: etab.online_payment,
    zones: zones.map(rowToZone),
    tables: (tables ?? []).map(rowToTable),
  };
});

/** Les soirées publiées à venir (ou en cours), dans l'ordre. */
export async function fetchUpcomingEvents(clubId: string): Promise<ClubEvent[]> {
  const { data } = await createPublicClient()
    .from("club_events")
    .select("*")
    .eq("etablissement_id", clubId)
    .eq("published", true)
    .gt("ends_at", new Date().toISOString())
    .order("starts_at");
  return (data ?? []).map(rowToEvent);
}

export type EventAvailability = {
  zones: EventZone[];
  blocked: string[];
  taken: string[];
  /** Places restantes sur la liste d'invités ; null : sans plafond. */
  guestListLeft: number | null;
};

export async function fetchEvent(
  clubId: string,
  eventSlug: string
): Promise<ClubEvent | null> {
  const { data } = await createPublicClient()
    .from("club_events")
    .select("*")
    .eq("etablissement_id", clubId)
    .eq("slug", eventSlug)
    .eq("published", true)
    .maybeSingle();
  return data ? rowToEvent(data) : null;
}

/** Ce qui est en vente ce soir-là, et ce qui ne l'est plus. Jamais mis en cache. */
export async function fetchAvailability(
  club: Club,
  eventId: string
): Promise<EventAvailability> {
  const db = createPublicClient();
  const [{ data: zones }, { data: blocked }, { data: taken }, { data: left }] =
    await Promise.all([
      db.from("club_event_zones").select("zone_id, price_cents").eq("event_id", eventId),
      db.from("club_event_blocked_tables").select("table_id").eq("event_id", eventId),
      db.rpc("club_tables_prises", { p_event: eventId }),
      db.rpc("club_guest_list_restant", { p_event: eventId }),
    ]);
  const zonePrice = new Map(club.zones.map((zone) => [zone.id, zone.priceCents]));
  return {
    zones: (zones ?? []).map((row) => ({
      zoneId: row.zone_id,
      priceCents: row.price_cents ?? zonePrice.get(row.zone_id) ?? 0,
    })),
    blocked: (blocked ?? []).map((row) => row.table_id),
    taken: taken ?? [],
    guestListLeft: left ?? null,
  };
}

export type BookingTicket = {
  id: string;
  token: string;
  status: BookingStatus;
  name: string;
  partySize: number;
  priceCents: number;
  feeCents: number;
  totalCents: number;
  holdExpiresAt: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  cancelledAt: string | null;
  table: { label: string; seats: number; zone: string; inclus: string | null };
  event: ClubEvent;
  club: {
    slug: string;
    name: string;
    address: string | null;
    paymentProvider: Club["paymentProvider"];
  };
};

/**
 * La réservation d'un client, par la clé de son lien (e-mail, page de
 * confirmation). Lue au serveur sans RLS : la clé fait office d'accès.
 */
export async function fetchBookingByToken(token: string): Promise<BookingTicket | null> {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("club_bookings")
    .select(
      "id, token, status, name, party_size, price_cents, fee_cents, total_cents, hold_expires_at, paid_at, refunded_at, cancelled_at, club_tables(label, seats, club_zones(name, inclus)), club_events(*), etablissements(slug, name, address, payment_provider)"
    )
    .eq("token", token)
    .maybeSingle();
  if (!data?.club_tables?.club_zones || !data.club_events || !data.etablissements) return null;
  return {
    id: data.id,
    token: data.token,
    status: data.status,
    name: data.name,
    partySize: data.party_size,
    priceCents: data.price_cents,
    feeCents: data.fee_cents,
    totalCents: data.total_cents,
    holdExpiresAt: data.hold_expires_at,
    paidAt: data.paid_at,
    refundedAt: data.refunded_at,
    cancelledAt: data.cancelled_at,
    table: {
      label: data.club_tables.label,
      seats: data.club_tables.seats,
      zone: data.club_tables.club_zones.name,
      inclus: data.club_tables.club_zones.inclus,
    },
    event: rowToEvent(data.club_events),
    club: {
      slug: data.etablissements.slug,
      name: data.etablissements.name,
      address: data.etablissements.address,
      paymentProvider: data.etablissements.payment_provider ?? "stripe",
    },
  };
}
