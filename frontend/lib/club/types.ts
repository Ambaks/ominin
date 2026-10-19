import type { Database } from "@/lib/supabase/database.types";

/*
 * Ominin Club : réservation de tables en club. Les types de domaine, lus par
 * la page publique du club comme par l'espace de gestion (« Soirées »).
 * Montants en centimes, comme en base.
 */

export type BookingStatus = Database["public"]["Enums"]["club_booking_status"];
export type BookingSource = Database["public"]["Enums"]["club_booking_source"];

/** Un trait de mur, un repère (DJ, bar, entrée…) : le dessin d'une zone. */
export type PlanMark = {
  kind: "dj" | "bar" | "scene" | "wc" | "entree" | "piste" | "rambarde" | "texte";
  x: number;
  y: number;
  w?: number;
  h?: number;
  label?: string;
  /** Sens d'une flèche d'entrée, en degrés (0 : vers la droite). */
  rotate?: number;
};

export type ZoneLayout = {
  w: number;
  h: number;
  /** Murs en polylignes : [[x, y], …]. */
  walls: [number, number][][];
  marks: PlanMark[];
  /** Teinte des murs : « rouge » pour le Salon Rouge. */
  tone?: "nuit" | "rouge" | "or";
};

export type ClubZone = {
  id: string;
  name: string;
  sort: number;
  layout: ZoneLayout;
  priceCents: number;
  inclus: string | null;
};

export type ClubTable = {
  id: string;
  zoneId: string;
  label: string;
  seats: number;
  x: number;
  y: number;
  shape: "carre" | "rond";
};

export type ClubEvent = {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
  endsAt: string;
  tag: string | null;
  description: string | null;
  posterUrl: string | null;
  ticketUrl: string | null;
  published: boolean;
  cancelledAt: string | null;
  guestListOpen: boolean;
  guestListCapacity: number | null;
  guestListMaxParty: number;
};

/** Les conditions d'entrée, à accepter avant de payer. */
export type ClubConditions = {
  minAge: number;
  dress: string | null;
  /** Ce que la porte refuse, en clair. */
  refused: string | null;
};

export type Club = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  feePercent: number;
  /** Acompte minimal en % du prix frais compris ; null : une part égale au minimum. */
  depositPercent: number | null;
  paymentProvider: Database["public"]["Enums"]["payment_provider"];
  onlinePayment: boolean;
  conditions: ClubConditions;
  zones: ClubZone[];
};

export type ClubBooking = {
  id: string;
  eventId: string;
  tableId: string;
  name: string;
  phone: string | null;
  email: string | null;
  partySize: number;
  priceCents: number;
  feeCents: number;
  totalCents: number;
  status: BookingStatus;
  source: BookingSource;
  holdExpiresAt: string | null;
  paidOnline: boolean;
  /** Table partagée entre amis, et le lien de leurs parts. */
  shared: boolean;
  shareToken: string | null;
  /** Réglé du prix de la table (parts en ligne et sur place) ; le reste se paie à l'entrée. */
  paidCents: number;
  remainingCents: number;
  note: string | null;
  paidAt: string | null;
  arrivedAt: string | null;
  createdAt: string;
};

export type PaymentStatus = Database["public"]["Enums"]["club_payment_status"];

/** Un paiement d'une table : la table entière, une part d'ami, ou le reste encaissé à l'entrée. */
export type ClubPayment = {
  id: string;
  bookingId: string;
  name: string;
  email: string | null;
  phone: string | null;
  organiser: boolean;
  amountCents: number;
  feeCents: number;
  method: Database["public"]["Enums"]["club_payment_method"];
  status: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
};

/** Qui a payé quoi, pour les pages publiques : prénom et initiale seulement. */
export type SharePayer = {
  id: string;
  name: string;
  amountCents: number;
  organiser: boolean;
  paidAt: string;
};

export type ClubGuest = {
  id: string;
  eventId: string;
  name: string;
  partySize: number;
  phone: string;
  email: string | null;
  arrivedAt: string | null;
  createdAt: string;
};
