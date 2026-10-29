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
  client: "Fiche fusionnée avec celle d'un client d'Ominin",
};

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
