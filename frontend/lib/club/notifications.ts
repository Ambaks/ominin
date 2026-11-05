import type { Poste } from "./droits";
import { formatCents, formatNightShort, formatTime } from "./format";
import type { BookingSource, BookingStatus } from "./types";

/*
 * Les notifications de réservation d'un club (cahier de L'Étoile, étape 4).
 * Les événements naissent en base (club_notifications, déclencheurs) ; ici,
 * ce que chaque membre reçoit et ce que dit la notification — les mêmes mots
 * sur l'écran verrouillé (envoi, lib/club/notify-server.ts) et dans
 * l'historique de la gestion.
 */

/** Ce qui s'est passé, tel que la base l'écrit (club_notifications.kind). */
export type NotifKind =
  | "confirmee"
  | "manuelle"
  | "acompte"
  | "annulee"
  | "remboursee"
  | "part_remboursee"
  | "deplacee"
  | "modifiee";

/** Ce qu'un membre choisit de recevoir : les quatre événements du cahier (club_notif_prefs). */
export type NotifPref = "en_ligne" | "manuelle" | "acompte" | "modification";

export const NOTIF_PREFS: NotifPref[] = ["en_ligne", "manuelle", "acompte", "modification"];

export const NOTIF_PREF_LABELS: Record<NotifPref, string> = {
  en_ligne: "Réservations en ligne",
  manuelle: "Réservations saisies",
  acompte: "Acomptes et parts payés",
  modification: "Changements et annulations",
};

export const NOTIF_PREF_HINTS: Record<NotifPref, string> = {
  en_ligne: "Une table est réservée et son acompte payé en ligne.",
  manuelle: "Un membre de l'équipe saisit une réservation (téléphone, porte).",
  acompte: "Un client règle l'acompte demandé par le club, ou un ami paie sa part d'une table partagée.",
  modification: "Une réservation est annulée, remboursée, change de table ou de nombre de personnes.",
};

export const KIND_PREF: Record<NotifKind, NotifPref> = {
  confirmee: "en_ligne",
  manuelle: "manuelle",
  acompte: "acompte",
  annulee: "modification",
  remboursee: "modification",
  part_remboursee: "modification",
  deplacee: "modification",
  modifiee: "modification",
};

export const KIND_TITLES: Record<NotifKind, string> = {
  confirmee: "Nouvelle réservation en ligne",
  manuelle: "Nouvelle réservation saisie",
  acompte: "Part payée",
  annulee: "Réservation annulée",
  remboursee: "Réservation remboursée",
  part_remboursee: "Part remboursée",
  deplacee: "Changement de table",
  modifiee: "Réservation modifiée",
};

export type NotifPrefs = Record<NotifPref, boolean>;

/**
 * Défauts par poste, tant que le membre (ou la direction pour lui) n'a rien
 * réglé : la direction reçoit tout ; l'accueil, les réservations et leurs
 * changements (qui attendre à la porte) ; le caissier tout, l'argent compris ;
 * le chef de rang, les changements qui touchent ses tables. Un membre sans
 * poste du club ne reçoit rien.
 */
export const CLUB_NOTIF_DEFAULTS: Record<Poste, NotifPrefs> = {
  gerant: { en_ligne: true, manuelle: true, acompte: true, modification: true },
  accueil: { en_ligne: true, manuelle: true, acompte: false, modification: true },
  caissier: { en_ligne: true, manuelle: true, acompte: true, modification: true },
  chef_de_rang: { en_ligne: false, manuelle: false, acompte: false, modification: true },
};

const NONE: NotifPrefs = { en_ligne: false, manuelle: false, acompte: false, modification: false };

/** Ce que reçoit un membre : ses réglages enregistrés, à défaut ceux de son poste. */
export function prefsOf(poste: Poste | null, saved: NotifPrefs | null | undefined): NotifPrefs {
  if (saved) return saved;
  return poste ? CLUB_NOTIF_DEFAULTS[poste] : NONE;
}

/** La réservation au moment de l'événement (club_notif_details en base). */
export interface NotifDetails {
  nom: string;
  soiree: string;
  debut: string;
  zone: string;
  table: string | null;
  personnes: number;
  statut: BookingStatus;
  source: BookingSource;
  prix_cents: number;
  regle_cents: number;
  /** Le payeur et le montant d'une part (acompte, part remboursée). */
  payeur?: string;
  montant_cents?: number;
  /** Changement de table. */
  ancienne_table?: string | null;
  ancienne_zone?: string | null;
  /** Changement du nombre de personnes. */
  anciennes_personnes?: number;
  /** L'heure d'arrivée prévue, si la soirée propose des créneaux. */
  arrivee_prevue?: string | null;
}

const SOURCE_LABELS: Partial<Record<BookingSource, string>> = {
  telephone: "Prise au téléphone",
  sur_place: "Prise à la porte",
};

/** Où en est l'argent de la table ; sans le droit « acomptes », sans montant. */
function acompteLine(d: NotifDetails, money: boolean): string {
  if (d.regle_cents >= d.prix_cents) return money ? `Réglée · ${formatCents(d.prix_cents)}` : "Réglée";
  if (d.regle_cents > 0) {
    return money
      ? `Acompte ${formatCents(d.regle_cents)} sur ${formatCents(d.prix_cents)}, reste ${formatCents(d.prix_cents - d.regle_cents)}`
      : "Acompte payé, reste à régler";
  }
  return money ? `Sans acompte · ${formatCents(d.prix_cents)} à régler` : "Sans acompte, à régler sur place";
}

/** Ce qui vient de changer, en tête du texte. */
function changeLine(kind: NotifKind, d: NotifDetails, money: boolean): string | null {
  const part = money && d.montant_cents !== undefined ? ` : ${formatCents(d.montant_cents)}` : "";
  switch (kind) {
    case "manuelle":
      return SOURCE_LABELS[d.source] ?? null;
    case "acompte":
      // Une réservation saisie par le club : l'acompte qu'il a demandé ; en ligne : la part d'un ami.
      return d.source !== "en_ligne" ? `Acompte payé en ligne${part}` : `Part de ${d.payeur ?? "un ami"} payée${part}`;
    case "part_remboursee":
      return `Part de ${d.payeur ?? "un ami"} remboursée${part}`;
    case "deplacee":
      return `${d.ancienne_zone ?? ""} ${d.ancienne_table ?? ""} → ${d.zone} ${d.table ?? ""}`.replace(/\s+/g, " ").trim();
    case "modifiee":
      return `${d.anciennes_personnes ?? "?"} → ${d.personnes} personnes`;
    default:
      return null;
  }
}

/**
 * Le texte d'une notification : le client et sa table d'abord (ce qu'on lit
 * sur l'écran verrouillé), ce qui change, la soirée (et l'heure d'arrivée
 * prévue), puis l'acompte. `money` : le membre a le droit de voir l'argent.
 */
export function notifLines(kind: NotifKind, d: NotifDetails, money: boolean): string[] {
  const place = d.table ? `${d.zone} · table ${d.table}` : `${d.zone} · à placer`;
  const arrival = d.arrivee_prevue ? ` · arrivée ${formatTime(d.arrivee_prevue)}` : "";
  const closed = kind === "annulee" || kind === "remboursee";
  return [
    `${d.nom} · ${d.personnes} pers. · ${place}`,
    changeLine(kind, d, money),
    `${d.soiree} · ${formatNightShort(d.debut)}${arrival}`,
    closed ? null : acompteLine(d, money),
  ].filter((line): line is string => Boolean(line));
}

/** Où mène la notification : le plan du soir, la fiche de la réservation ouverte. */
export const notifUrl = (eventId: string, bookingId: string) =>
  `/gestion/soirees/${eventId}/live?reservation=${bookingId}`;
