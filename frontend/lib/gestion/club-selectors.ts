import type { TableState } from "@/components/club/floor-plan";
import { bookingHolds } from "@/lib/club/mappers";
import type { ClubBooking, ClubEvent, ClubPayment, ClubTable } from "@/lib/club/types";
import type { ClubNight, ClubState } from "./club-store";

/* Lectures des soirées d'un club pour la gestion : ventes, plan, arrivées. */

/** Saisie par le club (téléphone, porte) : ni paiement en ligne ni frais Ominin. */
export const isClubEntered = (booking: ClubBooking) => booking.source !== "en_ligne";

/** Une soirée finie ne revient pas dans « À venir », même passé minuit. */
export const isPast = (event: ClubEvent, now: number) => Date.parse(event.endsAt) <= now;

export const isTonight = (event: ClubEvent, now: number) =>
  Date.parse(event.startsAt) <= now && !isPast(event, now);

/**
 * Réglée, arrivée, ou à régler sur place : la table est vendue. Un paiement
 * en ligne en cours la tient sans être une vente.
 */
export function isSold(booking: ClubBooking): boolean {
  return (
    booking.status === "payee" ||
    booking.status === "arrivee" ||
    (booking.status === "en_attente" && booking.holdExpiresAt === null)
  );
}

/** La réservation qui tient chaque table ce soir-là. */
export function bookingsByTable(night: ClubNight | undefined, now: number): Map<string, ClubBooking> {
  const map = new Map<string, ClubBooking>();
  for (const booking of night?.bookings ?? []) {
    if (bookingHolds(booking, now)) map.set(booking.tableId, booking);
  }
  return map;
}

/** Tables proposées aux clients ce soir-là : zones ouvertes, tables gardées exclues. */
export function onSaleTableIds(club: ClubState, eventId: string): Set<string> {
  const zones = new Set((club.eventZones[eventId] ?? []).map((setting) => setting.zoneId));
  const blocked = new Set(club.blocked[eventId] ?? []);
  return new Set(
    club.tables
      .filter((table) => zones.has(table.zoneId) && !blocked.has(table.id))
      .map((table) => table.id)
  );
}

/** Prix d'une table ce soir-là : celui de la soirée, sinon celui de sa zone (creer_reservation_club). */
export function tablePrice(club: ClubState, eventId: string, table: ClubTable): number {
  const zone = club.zones.find((candidate) => candidate.id === table.zoneId);
  const setting = club.eventZones[eventId]?.find((candidate) => candidate.zoneId === table.zoneId);
  return setting?.priceCents ?? zone?.priceCents ?? 0;
}

/** L'état d'une table sur le plan de l'équipe. */
/**
 * L'état d'une table sur le plan de l'équipe. Une table tenue dont il reste
 * à encaisser (saisie par le club, ou partagée et pas encore réglée en
 * entier) est « à régler sur place » : c'est à la porte que le reste se paie.
 */
export function staffTableState(booking: ClubBooking | undefined, onSale: boolean): TableState {
  if (!booking) return onSale ? "libre" : "gardee";
  if (booking.status === "arrivee") return "arrivee";
  if (booking.status === "en_attente" && booking.holdExpiresAt !== null) return "prise";
  return booking.remainingCents > 0 ? "attente" : "payee";
}

/** Les paiements d'une réservation, dans l'ordre où ils sont arrivés. */
export const paymentsOf = (night: ClubNight | undefined, bookingId: string): ClubPayment[] =>
  (night?.payments ?? []).filter((payment) => payment.bookingId === bookingId);

/**
 * L'acompte d'une table dont seul l'organisateur a payé, en partie : ce
 * qu'il a réglé en ligne, frais compris ; null sinon (table réglée, ou des
 * amis ont payé leur part). Le reste se paie à la porte.
 */
export function depositOf(booking: ClubBooking, payments: ClubPayment[]): number | null {
  if (booking.source !== "en_ligne" || booking.remainingCents === 0) return null;
  const online = payments.filter((payment) => payment.method === "en_ligne" && payment.status === "payee");
  if (online.length !== 1 || !online[0].organiser) return null;
  return online[0].amountCents + online[0].feeCents;
}

/** Payé en ligne, non remboursé : ce qu'un remboursement de la table rend. */
export const refundableOnline = (payments: ClubPayment[]) =>
  payments.filter((payment) => payment.method === "en_ligne" && payment.status === "payee");

export const TABLE_STATE_LABELS: Partial<Record<TableState, string>> = {
  libre: "Libre",
  prise: "Paiement en ligne en cours",
  payee: "Payée",
  attente: "À encaisser",
  arrivee: "Arrivée",
  gardee: "Gardée, hors vente",
};

export interface NightStats {
  sold: number;
  /** Tables en vente ce soir, plus celles vendues hors vente (gardées, zone fermée). */
  capacity: number;
  arrived: number;
  /** Personnes attendues aux tables vendues, et celles déjà entrées. */
  people: number;
  peopleArrived: number;
  /** Parts payées en ligne, frais Ominin à part. */
  online: number;
  onSite: number;
  toCollect: number;
  fees: number;
  guests: number;
  guestsArrived: number;
}

export function nightStats(club: ClubState, eventId: string): NightStats {
  const night = club.nights[eventId];
  const sold = (night?.bookings ?? []).filter(isSold);
  const onSale = onSaleTableIds(club, eventId);
  const stats: NightStats = {
    sold: sold.length,
    capacity: new Set([...onSale, ...sold.map((booking) => booking.tableId)]).size,
    arrived: 0,
    people: 0,
    peopleArrived: 0,
    online: 0,
    onSite: 0,
    toCollect: 0,
    fees: 0,
    guests: 0,
    guestsArrived: 0,
  };
  for (const booking of sold) {
    stats.people += booking.partySize;
    if (booking.status === "arrivee") {
      stats.arrived += 1;
      stats.peopleArrived += booking.partySize;
    }
    stats.toCollect += booking.remainingCents;
  }
  const active = new Set(sold.map((booking) => booking.id));
  for (const payment of night?.payments ?? []) {
    if (payment.status !== "payee" || !active.has(payment.bookingId)) continue;
    if (payment.method === "en_ligne") {
      stats.online += payment.amountCents;
      stats.fees += payment.feeCents;
    } else {
      stats.onSite += payment.amountCents;
    }
  }
  for (const guest of night?.guests ?? []) {
    stats.guests += guest.partySize;
    if (guest.arrivedAt) stats.guestsArrived += guest.partySize;
  }
  return stats;
}

/** « Salon Rouge · 03 » : une table se nomme par sa zone, comme sur la page du club. */
export const tableName = (zoneName: string, label: string) => `${zoneName} · ${label}`;

/** « 1 personne », « 5 personnes ». */
export const people = (count: number) => `${count} personne${count > 1 ? "s" : ""}`;

/** « 06 12 34 56 78 », « +33 6 12 34 56 78 » ; tel quel s'il n'a pas une forme française. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  const national = /^0\d{9}$/.test(digits) ? digits : null;
  const international = /^\+33\d{9}$/.test(digits) ? digits.slice(3) : null;
  if (national) return national.replace(/(\d{2})(?=\d)/g, "$1 ");
  if (international) return `+33 ${international[0]} ${international.slice(1).replace(/(\d{2})(?=\d)/g, "$1 ")}`;
  return phone;
}

/** Lien d'appel d'un numéro saisi librement. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** Recherche de l'équipe : nom, téléphone (chiffres seuls) ou numéro de table. */
export function matchesSearch(query: string, fields: (string | null)[]): boolean {
  const needle = query.trim().toLocaleLowerCase("fr");
  if (!needle) return true;
  const digits = needle.replace(/\D/g, "");
  return fields.some((field) => {
    if (!field) return false;
    const value = field.toLocaleLowerCase("fr");
    return value.includes(needle) || (digits.length >= 2 && value.replace(/\D/g, "").includes(digits));
  });
}
