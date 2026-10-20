/*
 * Indexation fermée par défaut : le site circule sur un lien privé tant que le
 * lancement n'est pas décidé. ALLOW_INDEXING=true l'ouvre aux moteurs.
 */
export const indexable = process.env.ALLOW_INDEXING === "true";
