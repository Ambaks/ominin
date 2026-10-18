/*
 * Les conditions d'entrée d'un club, affichées avant tout formulaire et à
 * accepter avant de payer. Pas encore en base : par slug, en attendant leur
 * colonne sur etablissements. La règle de remboursement, elle, est celle
 * d'Ominin Club pour tous (annulation de soirée ⇒ remboursement automatique,
 * api/club/cancel-event).
 */
export type ClubConditions = {
  minAge: number;
  dress: string;
  /** Ce que la porte refuse, en clair ; null : rien de précisé. */
  refused: string | null;
};

const DEFAULT_CONDITIONS: ClubConditions = {
  minAge: 18,
  dress: "Tenue correcte exigée",
  refused: null,
};

const CONDITIONS: Record<string, ClubConditions> = {
  "l-etoile": {
    minAge: 18,
    dress: "Tenue élégante exigée",
    refused: "Casquettes, sacs et tongs refusés",
  },
};

export const clubConditions = (slug: string): ClubConditions =>
  CONDITIONS[slug] ?? DEFAULT_CONDITIONS;

export const REFUND_RULE =
  "Table non remboursable, sauf si le club annule la soirée : vous êtes alors remboursé automatiquement.";
