import { formatEuros } from "@/lib/admin/format";
import type { Database } from "@/lib/supabase/database.types";

/*
 * Listes fermées de l'espace commercial (section 4.8 du cahier), avec leurs
 * libellés. Les valeurs sont celles que la base accepte : les fonctions
 * commercial_* refusent tout le reste. Module sans dépendance serveur.
 */

type Enums = Database["public"]["Enums"];
export type DeclarationStatus = Enums["commercial_declaration_status"];
export type RefusalReason = Enums["commercial_refusal_reason"];
export type EndReason = Enums["commercial_end_reason"];
export type ActivityType = Enums["crm_activity_type"];
export type Product = Enums["ominin_product"];

export const STATUS_LABELS: Record<DeclarationStatus, string> = {
  pending: "En attente de confirmation",
  confirmed: "Réservé",
  refused: "Refusée",
  abandoned: "Abandonnée",
  expired: "Expirée",
  signed: "Inscrit",
  passage: "Passage sans suite",
};

export const REFUSAL_LABELS: Record<RefusalReason, string> = {
  client: "déjà client d'Ominin",
  declared: "déjà déclaré par un autre commercial",
  in_talks: "en discussion avec Ominin",
  opted_out: "le restaurant ne veut plus être contacté",
  cap: "plafond de déclarations actives atteint",
  cooldown: "délai de carence après un abandon ou une expiration",
  admin: "refus motivé d'Ominin",
};

/** Motifs qu'un commercial choisit (abandon, passage sans suite). */
export const CLOSING_REASONS = [
  "not_interested",
  "equipped",
  "contract_elsewhere",
  "closed",
  "unreachable",
  "head_office",
  "other",
] as const satisfies readonly EndReason[];

export const END_LABELS: Record<EndReason, string> = {
  not_interested: "Pas intéressé",
  equipped: "Déjà équipé",
  contract_elsewhere: "Contrat en cours ailleurs",
  closed: "Fermé ou cédé",
  unreachable: "Injoignable",
  head_office: "Relève d'un siège ou d'un réseau",
  opposition: "Ne veut plus être contacté",
  other: "Autre",
  contract_ended: "Fin de contrat",
  merged: "Fiches fusionnées",
  reassigned: "Réattribué",
};

export const CONTACT_ROLES = ["Gérant", "Associé", "Responsable de salle", "Autre"] as const;

export const PRODUCT_CHOICES: { id: Product; label: string }[] = [
  { id: "menu", label: "Menu" },
  { id: "collect", label: "Collect" },
  { id: "shop", label: "Shop" },
];

/** Journal : les types de crm_activity_type, sauf status_change (système). */
export const LOG_TYPES: { id: Exclude<ActivityType, "status_change">; label: string }[] = [
  { id: "visit", label: "Passage" },
  { id: "call", label: "Appel" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "email", label: "E-mail" },
  { id: "demo", label: "Démo" },
  { id: "appointment", label: "Rendez-vous" },
  { id: "follow_up", label: "Relance" },
  { id: "note", label: "Note" },
];

/* Fiche retenue (4.5). */
export const TPE_OPTIONS = [
  { id: "sumup", label: "SumUp" },
  { id: "stripe", label: "Stripe" },
  { id: "square", label: "Square" },
  { id: "banque", label: "Banque" },
  { id: "autre", label: "Autre" },
  { id: "aucun", label: "Aucun" },
] as const;

export const OBJECTIONS = [
  { id: "prix", label: "Prix ou commission" },
  { id: "deja_equipe", label: "Déjà équipé" },
  { id: "contrat_ailleurs", label: "Contrat en cours ailleurs" },
  { id: "pas_decideur", label: "Pas le décideur" },
  { id: "pas_le_temps", label: "Pas le temps" },
  { id: "clientele_qr", label: "Clientèle peu à l'aise avec le QR" },
  { id: "service_salle", label: "Peur de perdre le service en salle" },
  { id: "autre", label: "Autre" },
] as const;

export const INTEREST_OPTIONS = [
  { id: "froid", label: "Froid" },
  { id: "tiede", label: "Tiède" },
  { id: "chaud", label: "Chaud" },
] as const;

export const BEST_TIME_OPTIONS = [
  { id: "matin", label: "Matin" },
  { id: "apres_midi_service", label: "Après le service du midi" },
  { id: "apres_midi", label: "Après-midi" },
  { id: "soir", label: "Soir" },
] as const;

/** Fiche retenue telle que la base la garde (champs absents : non renseignés). */
export interface Retained {
  till?: string;
  tpe?: (typeof TPE_OPTIONS)[number]["id"];
  competitor?: boolean;
  competitor_name?: string;
  tables?: number;
  objections?: (typeof OBJECTIONS)[number]["id"][];
  interest?: (typeof INTEREST_OPTIONS)[number]["id"];
  best_time?: (typeof BEST_TIME_OPTIONS)[number]["id"];
  note?: string;
}

export const LEA_LABELS: Record<string, string> = {
  interested: "intéressé",
  meeting_request: "demande un rendez-vous",
  question: "a une question",
  not_interested: "pas intéressé",
  opt_out: "ne veut plus être contacté",
};

/** Mois d'un relevé (son premier jour) en toutes lettres, à Paris : « octobre 2026 ». */
export const monthLabel = (month: string) =>
  new Date(`${month}T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "Europe/Paris" });

/** Centimes affichés en euros. */
export const euros = (cents: number) => formatEuros(cents / 100);
