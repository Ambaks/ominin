import { planTrial } from "@/lib/landing-data";
import type { Offre } from "@/lib/gestion/types";

/*
 * Mois offerts de l'offre menu & salle. L'offre s'ouvre sur sa seule commande
 * de démarrage — aucun abonnement Stripe — et le chiffre d'affaires passé par
 * Ominin pendant ces mois tranche à leur terme : au-dessus du seuil annoncé
 * sur la landing, la commission a payé le service et l'abonnement reste à 0 €
 * définitivement ; en dessous, les mensualités commencent et l'espace de
 * gestion attend leur souscription (lib/offre/settle.ts rend le verdict).
 *
 * La base ne garde que la date d'ouverture : la durée appartient à l'offre,
 * et la fin comme la période jugée s'en déduisent ici, des deux côtés.
 */
export function offreTrialEnd(
  offre: Offre | null,
  startedAt: string
): Date | null {
  const trial = planTrial(offre);
  if (!trial) return null;
  const end = new Date(startedAt);
  end.setMonth(end.getMonth() + trial.months);
  return end;
}
