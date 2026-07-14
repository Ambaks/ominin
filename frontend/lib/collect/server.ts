import { createAdminClient } from "@/lib/supabase/admin";

/*
 * L'état d'abonnement n'est pas lisible anonymement (aucune policy RLS) :
 * la disponibilité du click & collect d'un établissement se vérifie côté
 * serveur via le service_role.
 */
export async function isCollectActive(
  etablissementId: string
): Promise<boolean> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("subscriptions")
    .select("status")
    .eq("etablissement_id", etablissementId)
    .eq("product", "collect")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.status === "active";
}
