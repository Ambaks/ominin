import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * En-tête qui nomme, pour le journal du club (club_journal), le membre au nom
 * de qui une route serveur agit en service_role. La base ne le croit que
 * d'une requête service_role.
 */
const ACTEUR_HEADER = "x-ominin-acteur";

/*
 * Client service_role : bypasse RLS. Réservé aux route handlers qui agissent
 * hors session utilisateur (webhook Stripe). Jamais importé côté client.
 * acteur : l'utilisateur vérifié au nom de qui la route agit (un gérant qui
 * rembourse), pour que le journal le nomme.
 */
export function createAdminClient(acteur?: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquante — renseigne frontend/.env.local."
    );
  }
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false },
    ...(acteur ? { global: { headers: { [ACTEUR_HEADER]: acteur } } } : {}),
  });
}
