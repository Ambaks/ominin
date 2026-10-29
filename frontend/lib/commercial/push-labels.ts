import type { PushEventKey } from "./api";

/** Ce que le commercial peut couper dans ses préférences (commerciaux.push_prefs). */
export const PUSH_EVENT_LABELS: Record<PushEventKey, string> = {
  releve: "Relevé disponible",
};
