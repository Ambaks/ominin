/*
 * Les deux personnes qui portent les étapes du projet. Module sans directive :
 * lu par les écrans de l'admin et par ses routes serveur (notifications).
 */

export type Owner = "marwan" | "ambaka";

export const OWNERS: readonly Owner[] = ["marwan", "ambaka"];

export const OWNER_LABELS: Record<Owner, string> = {
  marwan: "Marwan",
  ambaka: "Ambaka",
};

export const isOwner = (value: unknown): value is Owner =>
  OWNERS.includes(value as Owner);
