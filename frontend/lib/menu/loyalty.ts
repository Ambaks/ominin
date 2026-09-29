import type { MenuItem } from "@/lib/menu-data";
import { createClient } from "@/lib/supabase/client";
import { customerMessage } from "./errors";

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

/**
 * Ce que la base reprocherait au contact (loyalty_contact), ou null s'il
 * passe : mêmes règles, vérifiées avant l'envoi — un champ facultatif mal
 * saisi ne fait plus refuser toute la commande.
 */
export function contactError(raw: string): string | null {
  const value = raw.trim();
  // Une lettre, c'est un email mal tapé (l'@ oublié), pas un numéro.
  if (value.includes("@") || /\p{L}/u.test(value)) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.toLowerCase())
      ? null
      : "Adresse email invalide.";
  }
  let digits = value.replace(/\D/g, "");
  if (value.startsWith("+")) digits = `00${digits}`;
  if (digits.startsWith("0033")) digits = `0${digits.slice(4)}`;
  return /^0\d{8,16}$/.test(digits) ? null : "Numéro de téléphone invalide.";
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
  if (error) {
    throw new Error(
      customerMessage(error, "Solde indisponible pour le moment. Réessayez.")
    );
  }
  return data;
}
