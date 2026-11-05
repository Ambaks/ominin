import type { TableState } from "@/components/club/floor-plan";
import { formatCents } from "@/lib/club/format";
import { bookingHolds } from "@/lib/club/mappers";
import type { ClubBooking, ClubDroit, ClubEvent, ClubPayment, ClubTable } from "@/lib/club/types";
import type { ClubNight, ClubState } from "./club-store";

/* Lectures des soirées d'un club pour la gestion : ventes, plan, arrivées. */

/** Saisie par le club (téléphone, porte) : ni paiement en ligne ni frais Ominin. */
export const isClubEntered = (booking: ClubBooking) => booking.source !== "en_ligne";

/** Une soirée finie ne revient pas dans « À venir », même passé minuit. */
export const isPast = (event: ClubEvent, now: number) => Date.parse(event.endsAt) <= now;

export const isTonight = (event: ClubEvent, now: number) =>
  Date.parse(event.startsAt) <= now && !isPast(event, now);

/**
 * Réglée, à régler sur place, arrivée, assise ou partie : la réservation est
 * vendue. Un paiement en ligne en cours la tient sans être une vente.
 */
export function isSold(booking: ClubBooking): boolean {
  return (
    booking.status === "payee" ||
    booking.status === "arrivee" ||
    booking.status === "assise" ||
    booking.status === "partie" ||
    (booking.status === "en_attente" && booking.holdExpiresAt === null)
  );
}

/** Entrée dans le club : arrivée, assise ou partie depuis. */
export const hasArrived = (booking: ClubBooking) =>
  booking.status === "arrivee" || booking.status === "assise" || booking.status === "partie";

/** La réservation qui tient chaque table ce soir-là. */
export function bookingsByTable(night: ClubNight | undefined, now: number): Map<string, ClubBooking> {
  const map = new Map<string, ClubBooking>();
  for (const booking of night?.bookings ?? []) {
    if (booking.tableId && bookingHolds(booking, now)) map.set(booking.tableId, booking);
  }
  return map;
}

/** Les réservations à placer : une zone, pas encore de table. Les plus anciennes d'abord. */
export function unplacedBookings(night: ClubNight | undefined, now: number): ClubBooking[] {
  return (night?.bookings ?? []).filter((booking) => booking.tableId === null && bookingHolds(booking, now));
}

/** Le dernier départ de chaque table ce soir-là : libérée, elle se reprend. */
export function departuresByTable(night: ClubNight | undefined): Map<string, ClubBooking> {
  const map = new Map<string, ClubBooking>();
  for (const booking of night?.bookings ?? []) {
    if (booking.status !== "partie" || !booking.tableId) continue;
    const last = map.get(booking.tableId);
    if (!last || Date.parse(booking.leftAt ?? "") > Date.parse(last.leftAt ?? "")) map.set(booking.tableId, booking);
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

/**
 * L'état d'une table, ou d'une réservation, pour l'équipe. Réservée, elle
 * est « reste à encaisser » tant que son prix n'est pas réglé (saisie par le
 * club, acompte, table partagée) : le caissier encaisse en l'installant. Une
 * table dont les clients sont partis est « libérée ».
 */
export function staffTableState(booking: ClubBooking | undefined, onSale: boolean, departed = false): TableState {
  if (!booking) return departed ? "liberee" : onSale ? "libre" : "gardee";
  if (booking.status === "partie") return "liberee";
  if (booking.status === "assise") return "assise";
  if (booking.status === "arrivee") return "arrivee";
  if (booking.status === "en_attente" && booking.holdExpiresAt !== null) return "prise";
  return booking.remainingCents > 0 ? "attente" : "payee";
}

/** Les temps de la soirée ; « payee » ramène une réservation à réservée. */
export type NightStep = "payee" | "arrivee" | "assise" | "partie";

/** Le geste attendu d'une réservation : passer au temps suivant, ou la placer. */
export type Gesture =
  | { kind: "step"; to: Exclude<NightStep, "payee">; label: string; collect: number }
  | { kind: "placer"; label: string };

/**
 * Le geste suivant d'une réservation pour ce poste, s'il en a un : faire
 * entrer, installer (en encaissant le reste), marquer le départ. Une
 * réservation à placer s'installe une fois sur une table.
 */
export function nextGesture(booking: ClubBooking, droits: Set<ClubDroit>): Gesture | null {
  if (booking.status === "en_attente" && booking.holdExpiresAt !== null) return null;
  const remaining = booking.remainingCents;
  if ((booking.status === "payee" || booking.status === "en_attente") && droits.has("arrivee")) {
    return { kind: "step", to: "arrivee", label: "Faire entrer", collect: 0 };
  }
  if (booking.status === "arrivee" && booking.tableId && droits.has("assise")) {
    return {
      kind: "step",
      to: "assise",
      label: remaining > 0 ? `Encaisser ${formatCents(remaining)} et installer` : "Installer",
      collect: remaining,
    };
  }
  if (booking.status === "assise") {
    return droits.has("partie") ? { kind: "step", to: "partie", label: "Marquer le départ", collect: 0 } : null;
  }
  if (!booking.tableId && bookingHolds(booking) && droits.has("placer")) {
    return { kind: "placer", label: "Placer sur une table" };
  }
  return null;
}

/** Revenir d'un cran, après une erreur : le temps d'avant et le geste qui le dit. */
export function undoGesture(booking: ClubBooking, droits: Set<ClubDroit>): { to: NightStep; label: string } | null {
  if (booking.status === "arrivee" && droits.has("arrivee")) return { to: "payee", label: "Annuler l’arrivée" };
  if (booking.status === "assise" && droits.has("assise")) return { to: "arrivee", label: "Annuler l’installation" };
  if (booking.status === "partie" && droits.has("partie")) return { to: "assise", label: "Annuler le départ" };
  return null;
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

/** Un payeur d'une table : ses paiements (une part, puis un complément), réunis sous son nom. */
export type Payer = {
  key: string;
  name: string;
  organiser: boolean;
  /** Payé et non remboursé, frais compris et hors frais. */
  totalCents: number;
  amountCents: number;
  feeCents: number;
  payments: ClubPayment[];
};

/**
 * Les payeurs d'une table, dans l'ordre de leur premier paiement : une
 * personne qui paie deux fois (sa part en ligne, le reste à la porte) reste
 * une personne, reconnue à son e-mail ou à son téléphone, à défaut à son
 * nom. La liste « Qui a payé » et l'anneau en sont la source.
 */
export function payersOf(payments: ClubPayment[]): Payer[] {
  const payers: Payer[] = [];
  const known = new Map<Payer, Set<string>>();
  for (const payment of payments) {
    const ids = [
      payment.email && `@${payment.email.trim().toLowerCase()}`,
      payment.phone && `#${payment.phone.replace(/\D/g, "")}`,
      `~${payment.name.trim().toLowerCase()}`,
    ].filter((id): id is string => Boolean(id));
    let payer = payers.find((candidate) => ids.some((id) => known.get(candidate)?.has(id)));
    if (!payer) {
      payer = { key: ids[0], name: payment.name, organiser: false, totalCents: 0, amountCents: 0, feeCents: 0, payments: [] };
      payers.push(payer);
      known.set(payer, new Set());
    }
    for (const id of ids) known.get(payer)?.add(id);
    payer.organiser ||= payment.organiser;
    payer.payments.push(payment);
    if (payment.status === "payee") {
      payer.amountCents += payment.amountCents;
      payer.feeCents += payment.feeCents;
      payer.totalCents += payment.amountCents + payment.feeCents;
    }
  }
  return payers;
}

/** Payé en ligne, non remboursé : ce qu'un remboursement de la table rend. */
export const refundableOnline = (payments: ClubPayment[]) =>
  payments.filter((payment) => payment.method === "en_ligne" && payment.status === "payee");

export const TABLE_STATE_LABELS: Partial<Record<TableState, string>> = {
  libre: "Libre",
  prise: "Paiement en ligne en cours",
  payee: "Réservée",
  attente: "Réservée, reste à encaisser",
  arrivee: "Arrivée",
  assise: "Assise",
  liberee: "Libérée",
  gardee: "Gardée, hors vente",
};

interface NightStats {
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
    capacity: new Set([...onSale, ...sold.flatMap((booking) => (booking.tableId ? [booking.tableId] : []))]).size,
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
    if (hasArrived(booking)) {
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
