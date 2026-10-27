/*
 * Les bornes des réglages des bulles : les mêmes que les contrôles de la
 * base (bulle_reglages, 20261026000001_bulles.sql). Le formulaire de la
 * gestion les montre, la base les applique.
 */
export const BULLE_LIMITS = {
  party: { min: 1, max: 40 },
  durationMinutes: { min: 15, max: 720 },
  bookingDays: { min: 1, max: 365 },
  nameMax: 30,
} as const;

/** La couleur d'une bulle ajoutée quand il n'y en a encore aucune : le rouge du Boho. */
export const NEW_BULLE_COLOR = "#b5443a";
