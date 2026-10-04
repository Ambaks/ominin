import raw from "./data.json";

/**
 * Instantané des données de production d'un établissement client, anonymisé
 * (ni nom, ni client, ni salarié), extrait le 4 octobre 2026 pour la page
 * publique de résultats. Figé : la page ne lit aucune donnée en direct.
 */
export const report = raw;
export type Report = typeof raw;
export type Night = Report["nights"][number];
