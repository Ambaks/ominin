import { cache } from "react";
import { isShareToken } from "@/lib/club/links";
import { rowToEvent, rowToZone, publicName, sharePayers } from "@/lib/club/mappers";
import type { BookingStatus, Club, ClubConditions, ClubEvent, SharePayer } from "@/lib/club/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";

/*
 * Lectures de la page publique d'un club (club.ominin.com/<slug>) : sans
 * session, sous les policies de lecture publique — les zones, les soirées
 * publiées et leurs offres (club_offres), jamais le stock de tables.
 */

export const fetchClub = cache(async (slug: string): Promise<Club | null> => {
  const db = createPublicClient();
  const { data: etab } = await db
    .from("etablissements")
    .select("id, slug, name, tagline, address, phone, table_fee_percent, table_deposit_percent, payment_provider, online_payment, club_min_age, club_dress_code, club_refused")
    .eq("slug", slug)
    .maybeSingle();
  if (!etab) return null;
  const { data: zones } = await db
    .from("club_zones")
    .select("*")
    .eq("etablissement_id", etab.id)
    .order("sort");
  if (!zones?.length) return null;
  return {
    id: etab.id,
    slug: etab.slug,
    name: etab.name,
    tagline: etab.tagline,
    address: etab.address,
    phone: etab.phone,
    feePercent: Number(etab.table_fee_percent),
    depositPercent: etab.table_deposit_percent === null ? null : Number(etab.table_deposit_percent),
    paymentProvider: etab.payment_provider ?? "stripe",
    onlinePayment: etab.online_payment,
    conditions: {
      minAge: etab.club_min_age,
      dress: etab.club_dress_code,
      refused: etab.club_refused,
    },
    zones: zones.map(rowToZone),
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

export const fetchEvent = cache(async (
  clubId: string,
  eventSlug: string
): Promise<ClubEvent | null> => {
  const { data } = await createPublicClient()
    .from("club_events")
    .select("*")
    .eq("etablissement_id", clubId)
    .eq("slug", eventSlug)
    .eq("published", true)
    .maybeSingle();
  return data ? rowToEvent(data) : null;
});

/** Une offre du soir : une zone en vente, sans rien dire du stock. */
export type EventOffer = {
  zoneId: string;
  /** Prix de la table ce soir-là, hors frais ; le client le voit frais compris. */
  priceCents: number;
  /** Une table au moins est encore libre. */
  available: boolean;
  /** La plus grande tablée que l'offre peut encore accueillir. */
  maxParty: number;
};

export type EventAvailability = {
  offers: EventOffer[];
  /** Places restantes sur la liste d'invités ; null : sans plafond. */
  guestListLeft: number | null;
};

/** Les offres du soir et la liste d'invités. Jamais mis en cache. */
export async function fetchAvailability(eventId: string): Promise<EventAvailability> {
  const db = createPublicClient();
  const [{ data: offers }, { data: left }] = await Promise.all([
    db.rpc("club_offres", { p_event: eventId }),
    db.rpc("club_guest_list_restant", { p_event: eventId }),
  ]);
  return {
    offers: (offers ?? []).map((offer) => ({
      zoneId: offer.zone_id,
      priceCents: offer.price_cents,
      available: offer.available,
      maxParty: offer.max_party,
    })),
    guestListLeft: left ?? null,
  };
}

/** La somme de ce qui a été payé d'une table, frais compris, en ligne et à l'entrée. */
const paidTotal = (payments: { total_cents: number; status: string }[]) =>
  payments.filter((payment) => payment.status === "payee").reduce((sum, payment) => sum + payment.total_cents, 0);

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
  shared: boolean;
  shareToken: string | null;
  paidCents: number;
  remainingCents: number;
  /** Le paiement de l'organisateur encore en cours, à reprendre depuis cette page, et son montant. */
  pendingPaymentId: string | null;
  pendingTotalCents: number | null;
  /** Tout ce qui a été payé, frais compris : en ligne et à l'entrée. */
  paidTotalCents: number;
  /** Tout ce qui a été remboursé, frais compris. */
  refundedTotalCents: number;
  payers: SharePayer[];
  /** La zone réservée : le client ne voit pas le numéro de table, que le club peut changer. */
  table: { zone: string; inclus: string | null };
  event: ClubEvent;
  club: {
    slug: string;
    name: string;
    address: string | null;
    paymentProvider: Club["paymentProvider"];
    /** Le club prend les commandes au menu QR : sa carte se commande pendant la soirée. */
    ordering: boolean;
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
      "id, token, status, name, party_size, price_cents, fee_cents, total_cents, hold_expires_at, paid_at, refunded_at, cancelled_at, shared, share_token, paid_cents, club_tables(club_zones(name, inclus)), club_events(*), etablissements(slug, name, address, payment_provider, offre), club_payments(id, name, total_cents, organiser, paid_at, status, method)"
    )
    .eq("token", token)
    .maybeSingle();
  if (!data?.club_tables?.club_zones || !data.club_events || !data.etablissements) return null;
  const pending = data.club_payments.find(
    (payment) => payment.organiser && payment.status === "en_attente"
  );
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
    shared: data.shared,
    shareToken: data.share_token,
    paidCents: data.paid_cents,
    remainingCents: data.price_cents - data.paid_cents,
    pendingPaymentId: pending?.id ?? null,
    pendingTotalCents: pending?.total_cents ?? null,
    paidTotalCents: paidTotal(data.club_payments),
    refundedTotalCents: data.club_payments
      .filter((payment) => payment.status === "remboursee")
      .reduce((sum, payment) => sum + payment.total_cents, 0),
    payers: sharePayers(data.club_payments),
    table: {
      zone: data.club_tables.club_zones.name,
      inclus: data.club_tables.club_zones.inclus,
    },
    event: rowToEvent(data.club_events),
    club: {
      slug: data.etablissements.slug,
      name: data.etablissements.name,
      address: data.etablissements.address,
      paymentProvider: data.etablissements.payment_provider ?? "stripe",
      ordering: data.etablissements.offre === "smart" || data.etablissements.offre === "connect",
    },
  };
}

export type ShareTable = {
  shareToken: string;
  organiser: string;
  status: BookingStatus;
  partySize: number;
  /** La table frais compris : le prix que voient l'organisateur et ses amis. */
  totalCents: number;
  payers: SharePayer[];
  /** Tout le prix est réglé (parts payées seulement, pas celles en cours). */
  fullyPaid: boolean;
  /** Tout ce qui a été payé, frais compris. */
  paidTotalCents: number;
  /** Ce qui reste, places encore libres pour une part, et la plus petite part possible. */
  remainingCents: number;
  seatsLeft: number;
  minimumCents: number;
  /** Les amis peuvent payer : table confirmée, soirée ni annulée ni commencée. */
  open: boolean;
  /** La zone réservée : le client ne voit pas le numéro de table, que le club peut changer. */
  table: { zone: string; inclus: string | null };
  event: ClubEvent;
  club: {
    slug: string;
    name: string;
    address: string | null;
    paymentProvider: Club["paymentProvider"];
    conditions: ClubConditions;
  };
};

/**
 * Une table partagée, par le lien que l'organisateur envoie à ses amis.
 * Lue au serveur sans RLS : la clé fait office d'accès ; des autres payeurs
 * ne sortent que le prénom et l'initiale.
 */
export async function fetchShareByToken(shareToken: string): Promise<ShareTable | null> {
  if (!isShareToken(shareToken)) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("club_bookings")
    .select(
      "id, status, name, party_size, price_cents, total_cents, paid_cents, share_token, club_tables(club_zones(name, inclus)), club_events(*), etablissements(slug, name, address, payment_provider, club_min_age, club_dress_code, club_refused), club_payments(id, name, total_cents, organiser, paid_at, status, method)"
    )
    .eq("share_token", shareToken)
    .maybeSingle();
  if (!data?.share_token || !data.club_tables?.club_zones || !data.club_events || !data.etablissements) {
    return null;
  }
  const { data: state } = await admin.rpc("club_partage_etat", { p_booking: data.id });
  const now = Date.now();
  const event = rowToEvent(data.club_events);
  const etab = data.etablissements;
  return {
    shareToken: data.share_token,
    organiser: publicName(data.name),
    status: data.status,
    partySize: data.party_size,
    totalCents: data.total_cents,
    fullyPaid: data.paid_cents >= data.price_cents,
    paidTotalCents: paidTotal(data.club_payments),
    payers: sharePayers(data.club_payments),
    remainingCents: state?.[0]?.remaining_cents ?? 0,
    seatsLeft: state?.[0]?.seats_left ?? 0,
    minimumCents: state?.[0]?.minimum_cents ?? 0,
    open:
      (data.status === "payee" || data.status === "arrivee") &&
      !event.cancelledAt &&
      Date.parse(event.startsAt) > now,
    table: {
      zone: data.club_tables.club_zones.name,
      inclus: data.club_tables.club_zones.inclus,
    },
    event,
    club: {
      slug: etab.slug,
      name: etab.name,
      address: etab.address,
      paymentProvider: etab.payment_provider ?? "stripe",
      conditions: { minAge: etab.club_min_age, dress: etab.club_dress_code, refused: etab.club_refused },
    },
  };
}
