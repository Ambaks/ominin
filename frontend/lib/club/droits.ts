import type { Role } from "@/lib/gestion/types";
import type { ClubDroit, ClubRole } from "./types";

/*
 * Les postes d'un club et ce que chacun peut faire. La direction (le gérant)
 * peut tout ; les autres postes ont les droits que la direction leur donne
 * (etablissements.club_droits), vérifiés en base par club_peut. Ici, ce que
 * l'écran montre.
 */

export const CLUB_ROLES: ClubRole[] = ["accueil", "caissier", "chef_de_rang"];

export const CLUB_ROLE_LABELS: Record<ClubRole, string> = {
  accueil: "Accueil",
  caissier: "Caissier",
  chef_de_rang: "Chef de rang",
};

export const CLUB_ROLE_TAGLINES: Record<ClubRole, string> = {
  accueil: "Accueille les clients et valide leur arrivée.",
  caissier: "Encaisse les tables et installe les clients.",
  chef_de_rang: "Suit ses tables et signale les départs.",
};

/** Le poste qu'on choisit dans l'équipe d'un club : la direction (gérant), ou un poste de l'équipe. */
export type Poste = "gerant" | ClubRole;

export const POSTES: Poste[] = ["accueil", "caissier", "chef_de_rang", "gerant"];

export const POSTE_LABELS: Record<Poste, string> = { ...CLUB_ROLE_LABELS, gerant: "Direction" };

export const POSTE_TAGLINES: Record<Poste, string> = {
  ...CLUB_ROLE_TAGLINES,
  gerant: "Prépare les soirées, place les tables, gère l'équipe.",
};

/** Le poste d'un membre ; un membre sans poste du club garde le libellé de son rôle. */
export function posteOf(role: Role, clubRole: ClubRole | null): Poste | null {
  return role === "gerant" ? "gerant" : clubRole;
}

/** Ce que la base enregistre pour un poste : le rôle du membre et son poste au club. */
export function posteToMembership(poste: Poste): { role: Role; club_role: ClubRole | null } {
  return poste === "gerant" ? { role: "gerant", club_role: null } : { role: "serveur", club_role: poste };
}

/** Dans l'ordre de la soirée. */
export const CLUB_DROITS: { droit: ClubDroit; label: string }[] = [
  { droit: "reserver", label: "Saisir et annuler des réservations" },
  { droit: "placer", label: "Placer et déplacer les tables" },
  { droit: "arrivee", label: "Faire entrer (Arrivé)" },
  { droit: "assise", label: "Encaisser et installer (Assis)" },
  { droit: "partie", label: "Marquer le départ (Parti)" },
  { droit: "acomptes", label: "Voir les acomptes et l'argent" },
];

export type ClubDroits = Record<ClubRole, ClubDroit[]>;

const ALL = new Set(CLUB_DROITS.map((entry) => entry.droit));

/** Ce que la base a enregistré, réduit aux droits connus. */
export function readDroits(value: unknown): ClubDroits {
  const source = (value ?? {}) as Partial<Record<ClubRole, unknown>>;
  return Object.fromEntries(
    CLUB_ROLES.map((role) => {
      const list = Array.isArray(source[role]) ? (source[role] as unknown[]) : [];
      return [role, list.filter((droit): droit is ClubDroit => ALL.has(droit as ClubDroit))];
    })
  ) as ClubDroits;
}

/** Les droits d'un membre : tous pour la direction, ceux de son poste sinon. */
export function droitsOf(role: Role, clubRole: ClubRole | null, droits: ClubDroits): Set<ClubDroit> {
  if (role === "gerant") return new Set(ALL);
  return new Set(clubRole ? droits[clubRole] : []);
}
