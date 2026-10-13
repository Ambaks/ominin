import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/*
 * Fermetures, côté menu : ce qui ne se commande plus. Le calcul vit tout
 * entier dans `articles_fermes`, celle que `place_order` consulte ; elle ne
 * livre que des identifiants d'articles, les noms de fermetures restent au
 * gérant.
 */

/** `at` : l'instant à juger (l'heure de retrait d'un click & collect) ; absent, maintenant. */
export async function fetchClosedItems(
  supabase: SupabaseClient<Database>,
  etablissementId: string,
  at?: string
): Promise<string[]> {
  const { data, error } = await supabase.rpc("articles_fermes", {
    p_etablissement: etablissementId,
    ...(at && { p_at: at }),
  });
  if (error) throw new Error(error.message);
  return data;
}
