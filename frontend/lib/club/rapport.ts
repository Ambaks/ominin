import { toCsv } from "@/lib/admin/csv";
import { slugify } from "@/lib/admin/slug";
import { formatCents, isoDay } from "./format";
import type { BookingSource, BookingStatus } from "./types";

/*
 * Le rapport financier d'une soirée (club_rapport) : des acomptes et des
 * tables, comptés en base depuis les paiements enregistrés. Ici ses types, ses
 * libellés et son export Excel ; la page et le PDF en partent.
 */

/** Ce qu'est devenue une réservation : en cours de paiement, maintenue, honorée, annulée ou remboursée. */
export type RapportEtat = "en_cours" | "confirmee" | "honoree" | "annulee" | "remboursee";

export type RapportTotaux = {
  reservations: number;
  confirmees: number;
  honorees: number;
  annulees: number;
  en_cours: number;
  personnes: number;
  acomptes_encaisses_cents: number;
  acomptes_rembourses_cents: number;
  acomptes_nets_cents: number;
  acomptes_en_attente_cents: number;
  acomptes_attendus_cents: number;
  sur_place_cents: number;
  previsionnel_cents: number;
  reste_cents: number;
  frais_cents: number;
};

export type RapportLigne = {
  booking_id: string;
  name: string;
  zone_id: string;
  zone_name: string;
  table_label: string | null;
  source: BookingSource;
  status: BookingStatus;
  etat: RapportEtat;
  party_size: number;
  price_cents: number;
  en_ligne_cents: number;
  rembourse_cents: number;
  en_attente_cents: number;
  sur_place_cents: number;
  frais_cents: number;
  reste_cents: number;
  created_at: string;
  arrived_at: string | null;
};

export type RapportPaiement = {
  id: string;
  booking_id: string;
  name: string;
  organiser: boolean;
  method: "en_ligne" | "sur_place";
  status: "payee" | "remboursee";
  amount_cents: number;
  fee_cents: number;
  paid_at: string | null;
  refunded_at: string | null;
};

export type RapportZone = RapportTotaux & { zone_id: string; name: string };

export type Rapport = {
  genere_le: string;
  totaux: RapportTotaux;
  zones: RapportZone[];
  reservations: RapportLigne[];
  paiements: RapportPaiement[];
};

/** Une soirée passée de l'historique, avec ses totaux. */
export type RapportSoiree = {
  eventId: string;
  title: string;
  startsAt: string;
  cancelled: boolean;
  totaux: RapportTotaux;
};

export const ETAT_LABELS: Record<RapportEtat, string> = {
  en_cours: "Paiement en cours",
  confirmee: "Confirmée",
  honoree: "Honorée",
  annulee: "Annulée",
  remboursee: "Remboursée",
};

export const SOURCE_LABELS: Record<BookingSource, string> = {
  en_ligne: "En ligne",
  telephone: "Téléphone",
  sur_place: "Sur place",
};

/** Un chiffre du rapport : un nombre de réservations, ou un montant. */
export type RapportChiffre = { label: string; value: number; money: boolean; hint?: string };

/** Les trois blocs du rapport, dans le même ordre sur la page et dans le PDF. */
export function rapportSections(totaux: RapportTotaux): { title: string; chiffres: RapportChiffre[] }[] {
  const count = (label: string, value: number, hint?: string) => ({ label, value, money: false, hint });
  const money = (label: string, value: number, hint?: string) => ({ label, value, money: true, hint });
  return [
    {
      title: "Réservations",
      chiffres: [
        count("Réservations", totaux.reservations, "Confirmées, annulées ou remboursées"),
        count("Confirmées", totaux.confirmees, `${totaux.personnes} personnes attendues`),
        count("Honorées", totaux.honorees, "Clients arrivés"),
        count("Annulées", totaux.annulees, "Remboursements compris"),
      ],
    },
    {
      title: "Acomptes",
      chiffres: [
        money("Attendus", totaux.acomptes_attendus_cents, "Encaissés nets et en attente"),
        money("Encaissés", totaux.acomptes_encaisses_cents, "Paiements en ligne aboutis"),
        money("Remboursés", totaux.acomptes_rembourses_cents),
        money("Nets", totaux.acomptes_nets_cents, "Encaissés moins remboursés"),
        money("En attente", totaux.acomptes_en_attente_cents, `${totaux.en_cours} paiement${totaux.en_cours > 1 ? "s" : ""} en cours`),
      ],
    },
    {
      title: "Tables",
      chiffres: [
        money("Prévisionnel", totaux.previsionnel_cents, "Prix des tables confirmées"),
        money("Encaissé", totaux.acomptes_nets_cents + totaux.sur_place_cents, `dont ${formatCents(totaux.sur_place_cents)} sur place`),
        money("Reste à encaisser", totaux.reste_cents),
        ...(totaux.frais_cents > 0 ? [money("Frais Ominin", totaux.frais_cents, "Payés par les clients en plus")] : []),
      ],
    },
  ];
}

/** Ce que le rapport ne compte pas, dit sur la page comme dans le PDF. */
export const RAPPORT_PERIMETRE =
  "Ce rapport compte les acomptes et le prix des tables, depuis les paiements enregistrés. Il ne remplace pas le chiffre d'affaires de la soirée : le bar et les consommations hors table s'encaissent sur place.";

/** « 1 réservation », « 3 honorées ». */
const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`;

/** « 1 234,50 » : un montant pour un tableur français, sans symbole. */
const euros = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

/**
 * L'export Excel : une ligne par réservation, puis une par zone et le total
 * de la soirée, séparés au point-virgule (Excel français), montants en euros.
 */
export function rapportCsv(rapport: Rapport, soiree: string): string {
  type Row = {
    kind: string;
    name: string;
    zone: string;
    table: string;
    source: string;
    etat: string;
    personnes: number | null;
    prix: number;
    enLigne: number;
    rembourse: number;
    enAttente: number;
    surPlace: number;
    reste: number;
  };
  const lignes: Row[] = rapport.reservations.map((ligne) => ({
    kind: "Réservation",
    name: ligne.name,
    zone: ligne.zone_name,
    table: ligne.table_label ?? "À placer",
    source: SOURCE_LABELS[ligne.source],
    etat: ETAT_LABELS[ligne.etat],
    personnes: ligne.party_size,
    prix: ligne.price_cents,
    enLigne: ligne.en_ligne_cents,
    rembourse: ligne.rembourse_cents,
    enAttente: ligne.en_attente_cents,
    surPlace: ligne.sur_place_cents,
    reste: ligne.reste_cents,
  }));
  const total = (kind: string, name: string, totaux: RapportTotaux): Row => ({
    kind,
    name,
    zone: kind === "Zone" ? name : "",
    table: "",
    source: "",
    etat: [
      plural(totaux.reservations, "réservation"),
      plural(totaux.honorees, "honorée"),
      plural(totaux.annulees, "annulée"),
    ].join(", "),
    personnes: totaux.personnes,
    prix: totaux.previsionnel_cents,
    enLigne: totaux.acomptes_encaisses_cents,
    rembourse: totaux.acomptes_rembourses_cents,
    enAttente: totaux.acomptes_en_attente_cents,
    surPlace: totaux.sur_place_cents,
    reste: totaux.reste_cents,
  });
  return toCsv<Row>(
    [
      ...lignes,
      ...rapport.zones.map((zone) => total("Zone", zone.name, zone)),
      total("Soirée", soiree, rapport.totaux),
    ],
    [
      { header: "Ligne", value: (row) => row.kind },
      { header: "Nom", value: (row) => row.name },
      { header: "Zone", value: (row) => row.zone },
      { header: "Table", value: (row) => row.table },
      { header: "Prise", value: (row) => row.source },
      { header: "État", value: (row) => row.etat },
      { header: "Personnes", value: (row) => row.personnes },
      { header: "Prix de la table (€)", value: (row) => euros(row.prix) },
      { header: "Acompte encaissé en ligne (€)", value: (row) => euros(row.enLigne) },
      { header: "Dont remboursé (€)", value: (row) => euros(row.rembourse) },
      { header: "En attente de paiement (€)", value: (row) => euros(row.enAttente) },
      { header: "Encaissé sur place (€)", value: (row) => euros(row.surPlace) },
      { header: "Reste à encaisser (€)", value: (row) => euros(row.reste) },
    ],
    ";"
  );
}

/** Le nom des fichiers exportés : « rapport-five-stars-2026-11-03 ». */
export const rapportFilename = (title: string, startsAt: string) =>
  `rapport-${slugify(title)}-${isoDay(startsAt)}`;
