/*
 * La visite d'un restaurant : ses résultats, les motifs d'un refus, et la
 * phrase que le site poste dans #terrain. Partagé par l'écran (aperçu du
 * récap) et la route serveur (envoi), pour qu'ils disent la même chose.
 */

export type VisitOutcome = "not_interested" | "absent";

export type VisitReason = "price" | "tool" | "time" | "other";

export const REFUSAL_REASONS: { id: VisitReason; label: string }[] = [
  { id: "price", label: "Trop cher" },
  { id: "tool", label: "Déjà un outil" },
  { id: "time", label: "Pas le temps" },
  { id: "other", label: "Autre raison" },
];

export interface VisitInput {
  outcome: VisitOutcome;
  reason?: VisitReason;
  note?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
}

/** Tout ce que la visite a noté, pour #inscriptions : seul salon où part le contact. */
export function visitDetails(commercial: string, restaurant: string, address: string | null, visit: VisitInput): string {
  const contact = [visit.contact_name, visit.contact_phone, visit.contact_email].filter(Boolean).join(" · ");
  const reason = REFUSAL_REASONS.find((entry) => entry.id === visit.reason)?.label;
  return [
    visit.outcome === "absent"
      ? `📞 **${restaurant}** : contact récupéré par ${commercial}`
      : `🚫 **${restaurant}** : pas intéressé, visité par ${commercial}`,
    ...(address ? [`Adresse : ${address}`] : []),
    ...(reason ? [`Motif : ${reason}`] : []),
    ...(visit.note?.trim() ? [`Arguments : ${visit.note.trim()}`] : []),
    ...(contact ? [`Responsable : ${contact}`] : []),
  ].join("\n");
}

/** La phrase de #terrain : jamais de numéro ni de nom du gérant. */
export function visitMessage(commercial: string, restaurant: string, outcome: VisitOutcome): string {
  return outcome === "absent"
    ? `${commercial} a visité ${restaurant} et a récupéré un contact à rappeler !`
    : `${commercial} a visité ${restaurant} : pas intéressé cette fois.`;
}
