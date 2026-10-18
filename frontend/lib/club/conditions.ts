/*
 * La règle de remboursement d'Ominin Club, la même pour tous les clubs
 * (annulation de soirée ⇒ remboursement automatique, api/club/cancel-event).
 * Les conditions d'entrée propres à chaque club sont en base
 * (Club.conditions).
 */
export const REFUND_RULE =
  "Table non remboursable, sauf si le club annule la soirée : vous êtes alors remboursé automatiquement.";
