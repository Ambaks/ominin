/*
 * Contrat du formulaire de contact, partagé par les composants de saisie
 * (portail /sur-mesure, landing Ominin Shop) et la route qui l'enregistre.
 *
 * Les bornes reflètent les contraintes CHECK de la migration
 * 20260810000002_contact_requests.sql — la base reste l'autorité. Ici elles
 * servent à cadrer la saisie (maxLength) et à rejeter tôt côté serveur, pour
 * qu'un champ trop long remonte une erreur lisible plutôt qu'une violation de
 * contrainte Postgres.
 */

export const CONTACT_LIMITS = {
  name: { min: 1, max: 120 },
  email: { min: 3, max: 255 },
  company: { min: 0, max: 160 },
  message: { min: 10, max: 4000 },
} as const;

export type ContactField = keyof typeof CONTACT_LIMITS;

/**
 * Page d'où part la demande. Mêmes valeurs que la contrainte CHECK de
 * 20260912000005_contact_requests_source.sql : la première est la valeur
 * historique (et le défaut en base), la seconde distingue les demandes venues
 * de shop.ominin.com — dont celles amenées par la promotion de MyBox.
 */
export const CONTACT_SOURCES = ["sur-mesure", "shop"] as const;

export type ContactSource = (typeof CONTACT_SOURCES)[number];

export type ContactPayload = {
  name: string;
  email: string;
  company: string;
  message: string;
  locale: "fr" | "en";
  source: ContactSource;
};
