import { createClient } from "@/lib/supabase/server";

/**
 * Gérant de l'établissement courant. Filtré par user_id : la policy RLS
 * laisse un membre lire toute l'équipe, donc sans ce filtre un serveur
 * recevait la fiche du gérant (la plus ancienne) et passait la garde.
 */
export async function requireGerant(
  denied = "Seul le gérant peut modifier ce réglage."
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentification requise.", status: 401 as const };
  const { data: membership } = await supabase
    .from("memberships")
    .select("etablissement_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership || membership.role !== "gerant") {
    return { error: denied, status: 403 as const };
  }
  return { etablissementId: membership.etablissement_id, email: user.email };
}
