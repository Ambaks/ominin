import type { SignedDoc } from "./types";

/*
 * Espace depuis lequel on signe. Déclaré par l'écran et vérifié par le
 * serveur, plutôt que déduit de l'appartenance de l'utilisateur : rien
 * n'empêche une même personne d'être gérante d'un restaurant et membre d'une
 * boutique, et « la première ligne trouvée » désignerait alors le mauvais
 * contrat. L'hôte ne peut pas l'arbitrer non plus — les routes /api/ ne
 * passent pas par le proxy, et le sous-domaine boutique peut être inerte.
 */
export type ContractScope = "etablissement" | "shop";

/*
 * Accès au contrat depuis le navigateur. Les textes restent côté serveur :
 * une case à cocher n'a besoin que des numéros de version, qu'elle renvoie
 * ensuite tels quels — le serveur refuse si ce ne sont plus ceux en vigueur.
 */

/**
 * Ce que le serveur dit du contrat. `versions` est nul et `published` faux
 * quand les textes ne sont pas publiés : une panne d'exploitation, pendant
 * laquelle personne ne peut signer — et pendant laquelle rien ne doit être
 * verrouillé pour autant.
 */
export interface ContractState {
  versions: Record<SignedDoc, string> | null;
  pending: {
    doc: string;
    version: string;
    effectiveFrom: string;
    summary: string;
  } | null;
  published: boolean;
  /** Absents pour un visiteur sans établissement ni boutique. */
  accepted?: boolean;
  /** false ⇒ première signature, et non « les conditions ont changé ». */
  everSigned?: boolean;
  canSign?: boolean;
}

/** État utilisable pour faire signer : textes publiés et versions connues. */
export interface SignableContract extends ContractState {
  versions: Record<SignedDoc, string>;
}

export const isSignable = (
  state: ContractState | null
): state is SignableContract => Boolean(state?.published && state.versions);

export async function fetchContract(
  scope: ContractScope = "etablissement"
): Promise<ContractState> {
  const response = await fetch(`/api/legal?scope=${scope}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Conditions indisponibles.");
  return (await response.json()) as ContractState;
}

/** Signature hors paiement : création d'établissement, réacceptation. */
export async function signContract(
  versions: Record<SignedDoc, string>,
  options: {
    context: "onboarding" | "reacceptation";
    scope?: ContractScope;
    /** Omis quand l'écran ne propose pas le réglage : il reste alors intact. */
    trainingOptOut?: boolean;
  }
): Promise<void> {
  const response = await fetch("/api/legal/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ versions, ...options }),
  });
  const body = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Une erreur est survenue.");
}

