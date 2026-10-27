/*
 * Réglages du connecteur Popina : tout ce qui se règle vit ici. Seuls les
 * secrets et l'URL passent par l'environnement (POPINA_API_URL,
 * POPINA_WEBHOOK_SECRET) ; la clé d'API est propre à chaque lieu et vit en
 * base (popina_connections).
 */

export const POPINA = {
  /** Délai d'attente d'une réponse de Popina avant de la tenir pour perdue. */
  httpTimeoutMs: 15_000,
  /** Taille de page des listes : le plafond de l'API. */
  pageSize: 100,
  /** La relecture horaire (workflow popina-reconcile) reprend cette fenêtre. */
  reconcileLookbackHours: 24,
  /**
   * Nom d'un mode de paiement de la caisse compté comme espèces ; tout autre
   * (carte, titre restaurant, chèque…) compte comme carte, Ominin n'ayant que
   * ces deux modes au comptoir.
   */
  cashPaymentName: /esp[eè]ces|cash/i,
} as const;
