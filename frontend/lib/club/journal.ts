import type { Database, Json } from "@/lib/supabase/database.types";
import { CLUB_DROITS, POSTE_LABELS, readDroits, CLUB_ROLES, type Poste } from "./droits";
import { formatCents, formatDateTime, formatTime, tableName } from "./format";
import type { BookingSource, BookingStatus } from "./types";

/*
 * Le journal des actions d'un club (club_journal), écrit par la base à chaque
 * geste : ici, comment une entrée se lit — qui, quoi, sur quoi.
 */

export type JournalAction = Database["public"]["Enums"]["club_journal_action"];

export type JournalEntry = {
  id: number;
  at: string;
  acteur: Database["public"]["Enums"]["club_journal_acteur"];
  acteurNom: string | null;
  acteurPoste: string | null;
  action: JournalAction;
  eventId: string | null;
  bookingId: string | null;
  cible: string | null;
  details: Record<string, unknown>;
  /** La soirée concernée, dans le journal du club. */
  eventTitle: string | null;
};

type JournalRow = {
  id: number;
  created_at: string;
  acteur: JournalEntry["acteur"];
  acteur_nom: string | null;
  acteur_poste: string | null;
  action: JournalAction;
  event_id: string | null;
  booking_id: string | null;
  cible: string | null;
  details: Json;
  event_title?: string | null;
};

export function rowToJournal(row: JournalRow): JournalEntry {
  return {
    id: row.id,
    at: row.created_at,
    acteur: row.acteur,
    acteurNom: row.acteur_nom,
    acteurPoste: row.acteur_poste,
    action: row.action,
    eventId: row.event_id,
    bookingId: row.booking_id,
    cible: row.cible,
    details: (row.details ?? {}) as Record<string, unknown>,
    eventTitle: row.event_title ?? null,
  };
}

/** « Inès · Accueil », « Client », « Système ». */
export function journalActeur(entry: JournalEntry): string {
  if (entry.acteur === "client") return "Client";
  if (entry.acteur === "systeme") return "Système";
  const poste = POSTE_LABELS[entry.acteurPoste as Poste];
  return [entry.acteurNom ?? "Membre", poste].filter(Boolean).join(" · ");
}

const SOURCES: Record<BookingSource, string> = {
  en_ligne: "Réservation en ligne",
  telephone: "Réservation au téléphone",
  sur_place: "Réservation sur place",
};

/** Le temps de la soirée : réservée (0), arrivée, installée, partie. */
const STEP: Partial<Record<BookingStatus, number>> = { en_attente: 0, payee: 0, arrivee: 1, assise: 2, partie: 3 };
const FORWARD = ["Réservée", "Arrivée", "Installée", "Départ"];
const UNDONE = ["", "Arrivée annulée", "Installation annulée", "Départ annulé"];

const BOOKING_FIELDS: Record<string, string> = {
  name: "Nom",
  phone: "Téléphone",
  email: "E-mail",
  party_size: "Personnes",
  arrivee_prevue: "Heure d'arrivée",
  acompte_demande_cents: "Acompte demandé",
  note: "Note",
  price_cents: "Prix",
  fee_cents: "Frais",
  total_cents: "Total",
  shared: "Table partagée",
  source: "Prise",
};

const EVENT_FIELDS: Record<string, string> = {
  title: "Titre",
  slug: "Adresse",
  starts_at: "Début",
  ends_at: "Fin",
  tag: "Étiquette",
  description: "Description",
  poster_url: "Affiche",
  ticket_url: "Billetterie",
  guest_list_open: "Liste d'invités",
  guest_list_capacity: "Places de la liste",
  guest_list_max_party: "Invités par inscription",
};

/** Champs dont la valeur ne se lit pas en une ligne : seul leur nom s'affiche. */
const LONG_FIELDS = new Set(["description", "poster_url", "ticket_url"]);

function value(key: string, raw: unknown): string {
  if (raw === null || raw === undefined || raw === "") return "—";
  if (typeof raw === "boolean") return raw ? "oui" : "non";
  if (key.endsWith("_cents") && typeof raw === "number") return formatCents(raw);
  if (key.endsWith("_at") && typeof raw === "string") return formatDateTime(raw);
  if (key === "arrivee_prevue" && typeof raw === "string") return formatTime(raw);
  if (key === "source") return SOURCES[raw as BookingSource] ?? String(raw);
  return String(raw);
}

/** « Nom : Yanis → Yanis B. · Personnes : 4 → 5 ». */
function changes(champs: unknown, labels: Record<string, string>): string | null {
  const entries = Object.entries((champs ?? {}) as Record<string, [unknown, unknown]>);
  if (entries.length === 0) return null;
  return entries
    .map(([key, [before, after]]) => {
      const label = labels[key] ?? key;
      return LONG_FIELDS.has(key) ? label : `${label} : ${value(key, before)} → ${value(key, after)}`;
    })
    .join(" · ");
}

type Place = { zone: string | null; table: string | null };
const placeName = (place: Place) =>
  place.table ? tableName(place.zone ?? "", place.table) : `${place.zone ?? "Zone"}, à placer`;

const posteName = (poste: unknown) => POSTE_LABELS[poste as Poste] ?? String(poste);

/** Ce qu'un poste gagne (+) et perd (−) entre deux réglages des droits. */
function droitsChanges(before: unknown, after: unknown): string | null {
  const a = readDroits(before);
  const b = readDroits(after);
  const lines = CLUB_ROLES.flatMap((role) => {
    const added = CLUB_DROITS.filter(({ droit }) => b[role].includes(droit) && !a[role].includes(droit));
    const removed = CLUB_DROITS.filter(({ droit }) => a[role].includes(droit) && !b[role].includes(droit));
    if (added.length === 0 && removed.length === 0) return [];
    const parts = [...added.map(({ label }) => `+ ${label}`), ...removed.map(({ label }) => `− ${label}`)];
    return [`${POSTE_LABELS[role]} : ${parts.join(", ")}`];
  });
  return lines.length > 0 ? lines.join(" · ") : null;
}

function paid(details: Record<string, unknown>): string {
  const amount = Number(details.montant ?? 0);
  const fee = Number(details.frais ?? 0);
  return fee > 0
    ? `${formatCents(amount + fee)}, dont ${formatCents(fee)} de frais Ominin`
    : formatCents(amount);
}

/** Une entrée en une phrase : ce qui s'est passé, et le détail utile. */
export function journalText(entry: JournalEntry): { title: string; detail: string | null } {
  const d = entry.details;
  switch (entry.action) {
    case "reservation": {
      const where = `${placeName(d as Place)} · ${d.personnes} pers.`;
      return {
        title: SOURCES[d.source as BookingSource] ?? "Réservation",
        detail: d.montant ? `${where} · ${paid(d)} payés en ligne` : where,
      };
    }
    case "modification":
      return { title: "Réservation modifiée", detail: changes(d.champs, BOOKING_FIELDS) };
    case "statut": {
      const before = STEP[d.avant as BookingStatus] ?? 0;
      const after = STEP[d.apres as BookingStatus] ?? 0;
      return after >= before
        ? { title: FORWARD[after], detail: after - before > 1 ? `Sans passer par « ${FORWARD[before + 1]} »` : null }
        : { title: UNDONE[before], detail: `Revenue à « ${FORWARD[after]} »` };
    }
    case "placement": {
      const before = d.avant as Place;
      const after = d.apres as Place;
      return before.table
        ? { title: "Déplacée", detail: `${placeName(before)} → ${placeName(after)}` }
        : { title: after.table ? "Placée" : "Changée de zone", detail: placeName(after) };
    }
    case "annulation":
      return { title: "Réservation annulée", detail: null };
    case "remboursement":
      return { title: "Table remboursée et close", detail: null };
    case "encaissement":
      return { title: "Encaissé sur place", detail: formatCents(Number(d.montant ?? 0)) };
    case "paiement":
      return {
        title: d.organisateur ? "Paiement en ligne" : `Part de ${d.payeur} payée en ligne`,
        detail: paid(d),
      };
    case "paiement_rembourse":
      return {
        title: "Paiement remboursé",
        detail: d.payeur === entry.cible ? paid(d) : `${paid(d)} à ${d.payeur}`,
      };
    case "paiement_retabli":
      return { title: "Remboursement refusé par Stripe", detail: `${paid(d)} de ${d.payeur} comptés à nouveau` };
    case "soiree":
      return { title: "Soirée créée", detail: typeof d.debut === "string" ? `Début : ${formatDateTime(d.debut)}` : null };
    case "soiree_modifiee":
      return { title: "Soirée modifiée", detail: changes(d.champs, EVENT_FIELDS) };
    case "publication":
      return { title: "Soirée publiée", detail: null };
    case "depublication":
      return { title: "Soirée repassée en brouillon", detail: null };
    case "soiree_annulee":
      return { title: "Soirée annulée", detail: null };
    case "prix":
      if (d.avant === null) return { title: `${d.zone} mise en vente`, detail: formatCents(Number(d.apres)) };
      if (d.apres === null) return { title: `${d.zone} retirée de la vente`, detail: null };
      return {
        title: `Prix ${d.zone}`,
        detail: `${formatCents(Number(d.avant))} → ${formatCents(Number(d.apres))}`,
      };
    case "poste":
      if (d.avant === null) return { title: `${entry.cible} rejoint l'équipe`, detail: posteName(d.apres) };
      if (d.apres === null) return { title: `${entry.cible} quitte l'équipe`, detail: posteName(d.avant) };
      return { title: `Poste de ${entry.cible}`, detail: `${posteName(d.avant)} → ${posteName(d.apres)}` };
    case "droits":
      return { title: "Droits des postes modifiés", detail: droitsChanges(d.avant, d.apres) };
  }
}
