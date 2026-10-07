/**
 * Durée de vie d'une tentative de paiement en ligne, alignée sur celle d'une
 * session Checkout Stripe (30 min au minimum, plus une minute de marge) :
 * une tentative Square ou un Payment Intent plus ancien, jamais réglé, est
 * écarté par /api/square/expire.
 */
export const ONLINE_PAYMENT_TTL_S = 31 * 60;
