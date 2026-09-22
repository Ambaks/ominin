/**
 * Panne d'exploitation du contrat : version absente, pas encore en vigueur,
 * ou périmée sous les yeux du client. Distincte d'un bug — les appelants la
 * traduisent en message lisible plutôt qu'en 500.
 */
export class LegalVersionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LegalVersionError";
  }
}

/** Documents versionnés, acceptés ou simplement publiés (miroir de l'enum SQL). */
export type LegalDoc = "cgv" | "dpa" | "confidentialite";

/** Documents que le client accepte — les autres sont informatifs. */
export const SIGNED_DOCS = ["cgv", "dpa"] as const satisfies readonly LegalDoc[];
export type SignedDoc = (typeof SIGNED_DOCS)[number];

/**
 * Bloc d'un article. Une chaîne est un paragraphe, un tableau une liste à
 * puces : assez pour un contrat, et sérialisable — c'est cette forme qu'on
 * empreinte.
 */
export type LegalBlock = string | string[];

export interface LegalArticle {
  heading: string;
  body: LegalBlock[];
}

export interface LegalDocument {
  doc: LegalDoc;
  /** Identifiant de version, affiché en tête ('2026-09-22'). */
  version: string;
  /**
   * Date d'effet (ISO). Une version datée du futur court son préavis : elle
   * est publiée et annoncée, mais celle d'avant reste la version en vigueur
   * jusque-là.
   */
  effectiveFrom: string;
  title: string;
  /** Sous-titre affiché sous le titre, hors empreinte. */
  lead: string;
  /** Ce qui change depuis la version précédente, montré à la réacceptation. */
  summary: string;
  articles: LegalArticle[];
}

/**
 * Ce que le client a accepté, en chiffres, figé au clic. Recopié dans
 * legal_acceptances.terms : les tarifs de lib/landing-data.ts bougeront, ce
 * relevé non.
 */
export interface AcceptedTerms {
  /** Ce qui a déclenché la signature. */
  context: "onboarding" | "checkout" | "reacceptation";
  versions: Record<SignedDoc, string>;
  /** Offre engagée, quand la signature en porte une. */
  product?: string;
  /** Mensualité due, en euros. 0 sur une offre en mois offerts. */
  monthly?: number;
  commission?: { percent: number; basis: string };
  /** Lignes réglées immédiatement (commande de démarrage). */
  lines?: { label: string; amount: number }[];
  total?: number;
  /** Choix de licence de données au moment de la signature. */
  trainingOptOut?: boolean;
}
