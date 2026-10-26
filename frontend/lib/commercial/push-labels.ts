import type { PushEventKey } from "./api";

/** Ce que le commercial peut couper dans ses préférences (commerciaux.push_prefs). */
export const PUSH_EVENT_LABELS: Record<PushEventKey, string> = {
  relance: "Relances du jour",
  rdv: "Rappel avant un rendez-vous",
  demo: "Démo prête",
  inscription: "Restaurant inscrit",
  expiration: "Réservation qui expire",
  releve: "Relevé disponible",
  opposition: "Restaurant qui s’oppose à la prospection",
};
