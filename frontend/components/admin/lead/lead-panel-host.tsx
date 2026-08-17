"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LeadPanel } from "./lead-panel";

/*
 * Héberge la fiche pilotée par ?lead=<restaurantId> : ouvrable depuis
 * n'importe quelle page, fermée par le bouton retour (l'ouverture pousse une
 * entrée d'historique). Monté sous <Suspense> dans le shell —
 * useSearchParams l'exige au prérendu.
 */
export function LeadPanelHost() {
  const params = useSearchParams();
  const router = useRouter();
  const restaurantId = params.get("lead");
  if (!restaurantId) return null;
  return (
    <LeadPanel restaurantId={restaurantId} onClose={() => router.back()} />
  );
}
