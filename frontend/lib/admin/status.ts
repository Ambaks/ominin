import type {
  LeadStatus,
  OutreachClassification,
  ProspectQualification,
} from "./types";

/*
 * Système de couleurs des 10 statuts, en deux exemplaires coordonnés :
 *  - tokens CSS (globals.css, sombres + clairs) → utilitaires Tailwind
 *    bg-status-… / text-status-… pour badges, pastilles et puces ;
 *  - table hexadécimale pour le canvas MapLibre, qui ne lit pas les
 *    variables CSS. Une seule gamme, accordée au fond Positron (clair)
 *    utilisé dans les deux thèmes.
 * Classes écrites en toutes lettres : le scanner Tailwind ne voit pas les
 * chaînes construites.
 */

/** Badge : pilule teintée, lisible sur les deux thèmes. */
export const STATUS_BADGE_CLASSES: Record<LeadStatus, string> = {
  new: "border-status-new/40 bg-status-new/10 text-status-new",
  to_contact:
    "border-status-to-contact/40 bg-status-to-contact/10 text-status-to-contact",
  contacted:
    "border-status-contacted/40 bg-status-contacted/10 text-status-contacted",
  interested:
    "border-status-interested/40 bg-status-interested/10 text-status-interested",
  visited: "border-status-visited/40 bg-status-visited/10 text-status-visited",
  appointment_scheduled:
    "border-status-appointment/40 bg-status-appointment/10 text-status-appointment",
  proposal:
    "border-status-proposal/40 bg-status-proposal/10 text-status-proposal",
  negotiation:
    "border-status-negotiation/40 bg-status-negotiation/10 text-status-negotiation",
  signed: "border-status-signed/40 bg-status-signed/10 text-status-signed",
  lost: "border-status-lost/40 bg-status-lost/10 text-status-lost",
  not_interested:
    "border-status-not-interested/40 bg-status-not-interested/10 text-status-not-interested",
};

/** Pastille pleine (puces de filtres, menu de statut, cartes du pipeline). */
export const STATUS_DOT_CLASSES: Record<LeadStatus, string> = {
  new: "bg-status-new",
  to_contact: "bg-status-to-contact",
  contacted: "bg-status-contacted",
  interested: "bg-status-interested",
  visited: "bg-status-visited",
  appointment_scheduled: "bg-status-appointment",
  proposal: "bg-status-proposal",
  negotiation: "bg-status-negotiation",
  signed: "bg-status-signed",
  lost: "bg-status-lost",
  not_interested: "bg-status-not-interested",
};

/** Puces de classification des réponses (page E-mails), sur la même gamme
 * que les statuts de lead correspondants. */
export const CLASSIFICATION_BADGE_CLASSES: Record<
  OutreachClassification,
  string
> = {
  interested:
    "border-status-interested/40 bg-status-interested/10 text-status-interested",
  meeting_request:
    "border-status-appointment/40 bg-status-appointment/10 text-status-appointment",
  question:
    "border-status-to-contact/40 bg-status-to-contact/10 text-status-to-contact",
  not_interested:
    "border-status-not-interested/40 bg-status-not-interested/10 text-status-not-interested",
  opt_out: "border-status-lost/40 bg-status-lost/10 text-status-lost",
  bounce: "border-status-lost/40 bg-status-lost/10 text-status-lost",
  other: "border-status-new/40 bg-status-new/10 text-status-new",
};

/** Verdicts de qualification de l'agent (onglet Prospection). */
export const QUALIFICATION_BADGE_CLASSES: Record<
  ProspectQualification,
  string
> = {
  qualified: "border-status-signed/40 bg-status-signed/10 text-status-signed",
  pending: "border-status-new/40 bg-status-new/10 text-status-new",
  contacted:
    "border-status-contacted/40 bg-status-contacted/10 text-status-contacted",
  disqualified:
    "border-status-not-interested/40 bg-status-not-interested/10 text-status-not-interested",
};

/** Couleurs des marqueurs sur le fond Positron. */
export const STATUS_MAP_COLORS: Record<LeadStatus, string> = {
  new: "#857d6d",
  to_contact: "#4f94c9",
  contacted: "#5f74d2",
  interested: "#c25a9b",
  visited: "#9163c4",
  appointment_scheduled: "#dfa32e",
  proposal: "#2f9b82",
  negotiation: "#e2763c",
  signed: "#3fa04a",
  lost: "#c94444",
  not_interested: "#6e8093",
};
