import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/*
 * Fermetures, côté menu : ce qui ne se commande plus. Le calcul vit tout
 * entier dans `articles_fermes_detail`, que `place_order` consulte par
 * `articles_fermes` ; elle ne livre que des identifiants d'articles, les noms
 * de fermetures restent au gérant.
 */

/** Ce que voit le client d'un article coupé par le bouton « Fermeture cuisine ». */
export const KITCHEN_CLOSED_LABEL = "Cuisine fermée";

export interface ClosedItems {
  closed: string[];
  /** Ceux que le bouton « Fermeture cuisine » coupe. */
  kitchen: string[];
}

/** `at` : l'instant à juger (l'heure de retrait d'un click & collect) ; absent, maintenant. */
export async function fetchClosedItems(
  supabase: SupabaseClient<Database>,
  etablissementId: string,
  at?: string
): Promise<ClosedItems> {
  const { data, error } = await supabase.rpc("articles_fermes_detail", {
    p_etablissement: etablissementId,
    ...(at && { p_at: at }),
  });
  if (error) throw new Error(error.message);
  return {
    closed: data.map((row) => row.id),
    kitchen: data.filter((row) => row.cuisine).map((row) => row.id),
  };
}
