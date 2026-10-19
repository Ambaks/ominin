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

/** À qui une étape est confiée : une personne, ou les deux. */
export type Assignee = Owner | "both";

/** Ordre du bouton responsable, après « sans responsable ». */
export const ASSIGNEES: readonly Assignee[] = [...OWNERS, "both"];

export const ASSIGNEE_LABELS: Record<Assignee, string> = {
  ...OWNER_LABELS,
  both: "Marwan et Ambaka",
};

export const isAssignee = (value: unknown): value is Assignee =>
  ASSIGNEES.includes(value as Assignee);

export const ownersOf = (assignee: Assignee): readonly Owner[] =>
  assignee === "both" ? OWNERS : [assignee];

export const isAssignedTo = (assignee: string | null, owner: Owner): boolean =>
  assignee === owner || assignee === "both";
