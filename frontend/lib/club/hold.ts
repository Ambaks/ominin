/**
 * Temps laissé au client pour régler sa table une fois choisie : assez pour
 * le formulaire, Apple Pay ou une carte et son 3-D Secure, assez court pour
 * qu'une table à 2 500 € ne reste pas bloquée par un onglet oublié. Passé ce
 * délai, la table se libère (reserver_table, 20261019000001).
 */
export const TABLE_HOLD_S = 10 * 60;
