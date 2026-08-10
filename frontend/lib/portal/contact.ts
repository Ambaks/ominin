/*
 * Contrat du formulaire « sur mesure », partagé par le composant de saisie et
 * la route qui l'enregistre.
 *
 * Les bornes reflètent les contraintes CHECK de la migration
 * 20260810000001_contact_requests.sql — la base reste l'autorité. Ici elles
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

export type ContactPayload = {
  name: string;
  email: string;
  company: string;
  message: string;
  locale: "fr" | "en";
};
