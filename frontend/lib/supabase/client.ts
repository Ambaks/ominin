import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/** Client navigateur (singleton géré par @supabase/ssr). */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
