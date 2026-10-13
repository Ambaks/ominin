import raw from "./data.json";

/**
 * Instantané des données de production d'un établissement client, anonymisé
 * (ni nom, ni client, ni salarié), extrait à la date `extracted` pour la page
 * publique de résultats. Figé : la page ne lit aucune donnée en direct.
 * online_funnel s'arrête au 3 octobre 2026 : depuis, les tentatives de
 * paiement en ligne abandonnées sont supprimées de la base une fois expirées.
 */
export const report = raw;
export type Report = typeof raw;
export type Night = Report["nights"][number];
export type FunnelNight = Report["online_funnel"]["nights"][number];
