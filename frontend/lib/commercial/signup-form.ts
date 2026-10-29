import type { Answers } from "@/lib/composer";

/*
 * Le questionnaire d'inscription avec un commercial : ce que l'écran envoie
 * et ce qu'il relit. Partagé par l'écran et les routes du questionnaire.
 */

export const SIGNUP_KINDS = [
  { id: "restaurant", label: "Restaurant" },
  { id: "bar", label: "Bar" },
  { id: "club", label: "Club" },
  { id: "fast_food", label: "Fast-food" },
  { id: "cafe", label: "Café" },
  { id: "boulangerie", label: "Boulangerie" },
] as const;

export type SignupKind = (typeof SIGNUP_KINDS)[number]["id"];

/** Tout ce qui précède la création du compte, envoyé d'un seul coup avec l'accord aux CGV. */
export interface SignupAccountInput {
  email: string;
  password: string;
  name: string;
  kind: SignupKind;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  setup: Answers;
  /** Versions des CGV affichées à l'écran. */
  versions: Record<string, string>;
}

/** Le commercial suit l'inscription faite sur le téléphone du gérant : relecture de l'avancement. */
export const SIGNUP_FOLLOW_POLL_MS = 5_000;

/** Longueur minimale d'un mot de passe, celle de Supabase Auth. */
export const PASSWORD_MIN_LENGTH = 6;

export type LinkState = "done" | "later" | "todo";

export interface SignupProgress {
  restaurant: string;
  /** Avant la création du compte : le nom proposé, celui de la carte. */
  accountCreated: boolean;
  stripe: LinkState;
  hubrise: LinkState;
  photos: number;
  finished: boolean;
}
