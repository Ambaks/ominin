import { createClient } from "@/lib/supabase/client";

/*
 * Ce qui bouge pendant qu'un client regarde le plan : les tables prises et
 * celles que le club retire de la vente. Les réservations ne sont pas
 * lisibles par un anonyme (pas de temps réel) : la page relit à intervalle
 * et au retour sur l'onglet.
 */
export async function fetchLiveTables(
  eventId: string
): Promise<{ taken: string[]; blocked: string[] } | null> {
  const db = createClient();
  const [taken, blocked] = await Promise.all([
    db.rpc("club_tables_prises", { p_event: eventId }),
    db.from("club_event_blocked_tables").select("table_id").eq("event_id", eventId),
  ]);
  if (taken.error || blocked.error) return null;
  return {
    taken: taken.data ?? [],
    blocked: (blocked.data ?? []).map((row) => row.table_id),
  };
}
