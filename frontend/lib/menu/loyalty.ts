import type { MenuItem } from "@/lib/menu-data";
import { createClient } from "@/lib/supabase/client";

/*
 * Programme de fidélité du menu QR, côté client. Le solde se lit par le
 * contact que laisse le client (numéro ou email, sans vérification) ; les
 * paliers arrivent avec la carte, déjà rapprochés de ses articles.
 */

/** Un palier : un article au choix parmi les siens, contre des points. */
export interface LoyaltyReward {
  id: string;
  label: string;
  points: number;
  items: MenuItem[];
}

export interface LoyaltyProgram {
  pointsPerEuro: number;
  /** Du palier le moins cher au plus cher. */
  rewards: LoyaltyReward[];
}

/**
 * Points que rapportera une commande : sur ce qui se paie en euros, arrondi
 * à l'entier inférieur comme loyalty_earn. Le produit passe d'abord au
 * centime : en flottant, 0,29 × 100 vaut 28,999…
 */
export function pointsEarned(paidTotal: number, pointsPerEuro: number): number {
  return Math.floor(Math.round(paidTotal * pointsPerEuro * 100) / 100);
}

/** Solde du contact ; null si le restaurant a éteint son programme. */
export async function fetchLoyaltyBalance(
  slug: string,
  contact: string
): Promise<number | null> {
  const { data, error } = await createClient().rpc("loyalty_balance", {
    p_slug: slug,
    p_contact: contact,
  });
  if (error) throw new Error(error.message);
  return data;
}
