/*
 * Plafonds des routes publiques, comptés en base (rate_limit_hit) pour tenir
 * sur toutes les instances serverless. Une clé par route et par sujet : IP
 * pour les visiteurs, utilisateur pour les comptes connectés.
 */
const HOUR_S = 3_600;
const DAY_S = 86_400;

export const RATE_LIMITS = {
  /** E-mail de contact d'une boutique, par IP. */
  shopContact: { max: 5, windowSeconds: HOUR_S },
  /** Inscription à la newsletter d'une boutique, par IP. */
  shopNewsletter: { max: 5, windowSeconds: HOUR_S },
  /** Vérification d'un code promo, par IP. */
  shopDiscount: { max: 20, windowSeconds: 600 },
  /** « Appeler un serveur » depuis le menu QR, par IP. */
  callServer: { max: 10, windowSeconds: 600 },
  /** Invitations d'équipe, par gérant. */
  teamInvite: { max: 20, windowSeconds: DAY_S },
  /** Légendes générées par IA, par clipper. */
  clipCaptions: { max: 30, windowSeconds: DAY_S },
} as const;

export type RateLimitName = keyof typeof RATE_LIMITS;
