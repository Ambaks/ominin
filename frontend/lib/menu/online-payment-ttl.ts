/**
 * Durée de vie d'une tentative de paiement en ligne, celle d'une session
 * Checkout Stripe : le minimum accordé par Stripe est 30 min, mesurées à la
 * réception de la requête, et une minute de marge absorbe la latence. Une
 * tentative Square plus ancienne, jamais réglée, est écartée par
 * /api/square/expire.
 */
export const ONLINE_PAYMENT_TTL_S = 31 * 60;
