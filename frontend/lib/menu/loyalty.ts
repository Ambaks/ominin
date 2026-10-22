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

/** Ce qui pend au fil de la guirlande de « Ma carte » ; des lanternes, sauf mention au registre. */
export type GarlandMotif = "lanternes" | "fanions";

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

/** Cookie httpOnly qui porte la clé du téléphone reconnu (voir /api/fidelite). */
export const LOYALTY_DEVICE_COOKIE = "ominin_fidelite";
/** Un téléphone reste reconnu un an après son dernier scan (secondes). */
export const LOYALTY_DEVICE_MAX_AGE = 365 * 24 * 60 * 60;
/** Durée de l'accueil avant qu'il se replie en pastille de points (ms). */
export const LOYALTY_GREETING_MS = 4000;
/**
 * Le tour du jour à jouer, la roue monte d'elle-même à la place de l'accueil,
 * ce délai après l'ouverture de la page (ms) : la carte a fini de se poser.
 */
export const LOYALTY_WHEEL_DELAY_MS = 1000;

/** Le client derrière un téléphone reconnu, vu de ce restaurant. */
export interface LoyaltyMember {
  /** Contact normalisé (loyalty_contact) : il rattache la commande. */
  contact: string;
  firstName: string | null;
  /** Solde ici ; null : pas encore de carte dans cette maison. */
  points: number | null;
  /** Date de la carte dans cette maison (ISO), null avec points. */
  since: string | null;
}

/** Une ligne de la carte : gain d'une commande, article offert, tour de roue, geste du gérant. */
export interface LoyaltyHistoryEntry {
  kind: "gain" | "depense" | "roue" | "ajustement";
  points: number;
  at: string;
  /** Table de la commande ; null hors commande à table. */
  table: number | null;
  /** Articles offerts par une dépense, « Rose Garden, Thé menthe ». */
  rewards: string | null;
}

/** Une part de la roue : ses points, et son poids au tirage. */
export interface WheelSlice {
  points: number;
  weight: number;
}

/**
 * La roue d'une maison : un tour par jour à un téléphone reconnu. Une série
 * de jours d'affilée mène à la roue dorée (`golden.every`-ième jour), dont
 * les points sont multipliés.
 */
export interface LoyaltyWheelConfig {
  slices: WheelSlice[];
  golden?: { every: number; multiplier: number };
}

/** Indice de la part tirée, au prorata des poids. */
export function drawSlice(slices: WheelSlice[]): number {
  let draw = Math.random() * slices.reduce((sum, slice) => sum + slice.weight, 0);
  const index = slices.findIndex((slice) => (draw -= slice.weight) < 0);
  return index === -1 ? slices.length - 1 : index;
}

/** Le palier suivant : le moins cher que le solde n'atteint pas encore. */
export function nextReward(
  program: LoyaltyProgram,
  points: number
): LoyaltyReward | undefined {
  return program.rewards.find((reward) => reward.points > points);
}

/**
 * Le contact à l'écran d'un téléphone que d'autres peuvent voir : « 06 •• ••
 * 56 78 », « j•••@mail.fr ». Normalisé par loyalty_contact (chiffres seuls).
 */
export function maskContact(contact: string): string {
  const at = contact.indexOf("@");
  if (at > 0) return `${contact[0]}•••${contact.slice(at)}`;
  const pairs = contact.match(/\d{1,2}/g) ?? [];
  return pairs
    .map((pair, i) => (i === 0 || i >= pairs.length - 2 ? pair : "••"))
    .join(" ");
}
