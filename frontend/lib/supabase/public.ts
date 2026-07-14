import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/*
 * Client anonyme sans session ni cookies : les lectures publiques (menu QR)
 * ne dépendent d'aucun utilisateur, ce qui laisse la page être rendue puis
 * mise en cache (revalidation périodique) au lieu d'un hit base par scan.
 */
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}
