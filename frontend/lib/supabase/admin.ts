import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/*
 * Client service_role : bypasse RLS. Réservé aux route handlers qui agissent
 * hors session utilisateur (webhook Stripe). Jamais importé côté client.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquante — renseigne frontend/.env.local."
    );
  }
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false },
  });
}
