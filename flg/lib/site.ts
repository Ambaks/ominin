/*
 * Indexation fermée par défaut : le site circule sur un lien privé tant que le
 * lancement n'est pas décidé. ALLOW_INDEXING=true l'ouvre aux moteurs.
 */
export const indexable = process.env.ALLOW_INDEXING === "true";

export const siteUrl = process.env.SITE_URL;

export const description =
  "Aérogommage de charpentes, plafonds, façades, escaliers, poutres et sols à Toulouse, Montauban, Albi, Carcassonne et Auch. Décapage à sec, basse pression, sans produit chimique. Devis gratuit.";
