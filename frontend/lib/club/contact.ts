/*
 * Les règles d'un nom, d'un téléphone et d'un e-mail de réservation : le
 * formulaire les montre au client, le serveur les applique (cleanContact).
 * Les mêmes bornes que les contrôles de la base (club_bookings, club_payments).
 */
export const CONTACT_RULES = {
  name: { min: 2, max: 80 },
  phoneDigits: { min: 6, max: 20 },
  emailMax: 120,
  email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
} as const;
