/*
 * Une erreur, trois familles, un geste (UX-SIMPLICITE § 3.9) :
 * réseau — le navigateur n'a pas joint Supabase : on réessaie ;
 * droit — la base a refusé le geste à ce compte : c'est au gérant ;
 * donnée — le message métier de la RPC quand elle en donne un, sinon
 * recharger. Local à Paiements en attendant sa place dans lib/gestion.
 */

export type ErrorFamily = "reseau" | "droit" | "donnee";

export interface DescribedError {
  family: ErrorFamily;
  title: string;
  text: string;
  /** Une phrase, pour un toast. */
  message: string;
  /** Le geste de reprise est « réessayer » (réseau) plutôt que recharger. */
  retry: boolean;
}

const NETWORK = /failed to fetch|load failed|networkerror|network request failed|fetch failed|timeout|timed out/i;
const RIGHTS = /row-level security|permission denied|not authorized|unauthorized|forbidden|réservé au gérant|insufficient_privilege|jwt/i;
/** Un message de Postgres ou de PostgREST, pas une phrase écrite pour l'équipe. */
const TECHNICAL = /violates|constraint|syntax error|invalid input|null value|duplicate key|does not exist|PGRST|JSON object requested|réponse vide/i;

export function describeError(error: unknown): DescribedError {
  const raw = error instanceof Error ? error.message : "";
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  if (offline || NETWORK.test(raw)) {
    return {
      family: "reseau",
      title: "Hors connexion",
      text: "Vérifiez le réseau, puis réessayez.",
      message: "Hors connexion : vérifiez le réseau, puis réessayez.",
      retry: true,
    };
  }
  if (RIGHTS.test(raw)) {
    return {
      family: "droit",
      title: "Réservé au gérant",
      text: "Demandez-lui de faire ce geste depuis son compte.",
      message: "Réservé au gérant : demandez-lui de faire ce geste depuis son compte.",
      retry: false,
    };
  }
  const business = raw.trim() !== "" && !TECHNICAL.test(raw);
  const text = business ? raw : "Rechargez la page et réessayez.";
  return {
    family: "donnee",
    title: "Impossible d'enregistrer",
    text,
    message: business ? raw : "Impossible d'enregistrer. Rechargez la page et réessayez.",
    retry: false,
  };
}
