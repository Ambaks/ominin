/*
 * Ce qu'on dit d'un échec, en trois familles (UX-SIMPLICITE § 3.9) : le
 * réseau, le droit, la donnée — le message métier de la base quand il
 * existe. En attendant le describeError commun de lib/gestion.
 */
export function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (error instanceof TypeError || /fetch|network|réseau/i.test(message)) {
    return "Hors connexion : vérifiez le réseau, puis réessayez.";
  }
  if (/permission|policy|row-level|not allowed|forbidden/i.test(message)) {
    return "Réservé au gérant : demandez-lui de faire ce réglage.";
  }
  return message || "Impossible d'enregistrer. Rechargez la page et réessayez.";
}
